import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const signature = req.headers.get('stripe-signature');
    const body = await req.text();

    // CRÍTICO: Validar assinatura primeiro
    if (!signature) {
      return Response.json({ error: 'Missing signature' }, { status: 400 });
    }

    let event;

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      // Não expor detalhes do erro
      return Response.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Processar o evento
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      
      const { usuario_id, usuario_email, user_id, user_email, pacote_id, quantidade_tokens, cart_items, cart_summary } = session.metadata;

      // Buscar e salvar recibo Stripe silenciosamente
      try {
        let reciboData = null;
        let reciboUrl = null;
        if (session.payment_intent) {
          const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent, {
            expand: ['charges']
          });
          reciboData = {
            payment_intent_id: paymentIntent.id,
            amount: paymentIntent.amount / 100,
            currency: paymentIntent.currency,
            status: paymentIntent.status,
            created: paymentIntent.created,
            payment_method_types: paymentIntent.payment_method_types,
            charges: paymentIntent.charges?.data?.map(c => ({
              id: c.id,
              amount: c.amount / 100,
              paid: c.paid,
              receipt_url: c.receipt_url,
              billing_details: c.billing_details,
              payment_method_details: c.payment_method_details
            })) || []
          };
          reciboUrl = paymentIntent.charges?.data?.[0]?.receipt_url || null;
        }

        // Atualizar tentativa de compra existente
        const tentativas = await base44.asServiceRole.entities.TentativaCompra.filter({ stripe_session_id: session.id });
        if (tentativas.length > 0) {
          await base44.asServiceRole.entities.TentativaCompra.update(tentativas[0].id, {
            status: 'confirmada',
            stripe_payment_intent_id: session.payment_intent || null,
            recibo_stripe: reciboData,
            recibo_url: reciboUrl
          });
        }
      } catch (e) {
        console.error('Erro ao salvar recibo Stripe:', e);
      }

      // Verificar se é compra de pacote de créditos
      if (pacote_id && quantidade_tokens) {
        const quantidadeTokens = parseInt(quantidade_tokens);
        const userId = usuario_id || user_id;
        const userEmail = usuario_email || user_email;

        // Buscar cliente pelo email
        const clientes = await base44.asServiceRole.entities.Cliente.filter({ email: userEmail });
        
        if (!clientes || clientes.length === 0) {
          console.error('Cliente não encontrado:', userEmail);
          return Response.json({ error: 'Cliente não encontrado' }, { status: 404 });
        }

        const cliente = clientes[0];
        const creditosAtuais = cliente.ai_credits || 0;
        const novoSaldo = creditosAtuais + quantidadeTokens;

        // Atualizar créditos do cliente
        await base44.asServiceRole.entities.Cliente.update(cliente.id, {
          ai_credits: novoSaldo
        });

        // Registrar transação
        await base44.asServiceRole.entities.TransacaoCredito.create({
          usuario_id: userId,
          usuario_email: userEmail,
          tipo: 'compra',
          quantidade: quantidadeTokens,
          valor_pago: session.amount_total / 100,
          pacote_id: pacote_id || null,
          stripe_payment_intent_id: session.payment_intent,
          stripe_session_id: session.id,
          observacao: `Compra de créditos via Stripe - ${session.payment_status}`
        });


      }

      // Verificar se é compra de produtos/serviços do carrinho
      if (cart_items || cart_summary) {
        const userId = user_id || usuario_id;
        const userEmail = user_email || usuario_email;
        
        // Se tiver cart_summary (novo formato), reconstruir os itens
        let items;
        if (cart_summary) {
          const cartIds = cart_summary.split(',').map(entry => {
            const [id, qty] = entry.split(':');
            return { id, quantidade: parseInt(qty) };
          });
          
          // Buscar informações completas dos itens
          items = [];
          for (const cartId of cartIds) {
            const produtos = await base44.asServiceRole.entities.Produto.filter({ id: cartId.id });
            const servicos = await base44.asServiceRole.entities.Servico.filter({ id: cartId.id });
            
            if (produtos.length > 0) {
              const produto = produtos[0];
              items.push({
                id: produto.id,
                tipo: 'produto',
                nome: produto.nome,
                preco: produto.preco,
                quantidade: cartId.quantidade,
                produto_tipo: produto.tipo,
                arquivo_pdf_url: produto.arquivo_pdf_url
              });
            } else if (servicos.length > 0) {
              const servico = servicos[0];
              items.push({
                id: servico.id,
                tipo: 'servico',
                nome: servico.nome,
                preco: servico.preco,
                quantidade: cartId.quantidade
              });
            }
          }
        } else {
          items = JSON.parse(cart_items);
        }



        // Buscar cliente_id para associar às compras
        let cliente_id = null;
        try {
          const clientes = await base44.asServiceRole.entities.Cliente.filter({ email: userEmail });
          if (clientes.length > 0) {
            cliente_id = clientes[0].id;

          }
        } catch (error) {
          console.error('Erro ao buscar cliente:', error);
        }

        // Processar cada item comprado
        for (const item of items) {

          // Processar COMBO
          if (item.tipo === 'combo') {
            // Criar compra do combo
            await base44.asServiceRole.entities.Compra.create({
              cliente_id: cliente_id,
              cliente_email: userEmail,
              produto_id: item.id,
              produto_nome: item.nome,
              produto_tipo: 'digital',
              valor: item.preco * (item.quantidade || 1),
              status_pagamento: 'confirmado',
              stripe_payment_intent_id: session.payment_intent,
              stripe_session_id: session.id
            });

            // Buscar todos os produtos do combo em paralelo
            const produtosIds = item.produtos_ids || [];
            const produtosComboResults = await Promise.all(
              produtosIds.map(id => base44.asServiceRole.entities.Produto.filter({ id }))
            );

            const pdfsEnviados = [];
            const produtosComboValidos = produtosComboResults
              .map(r => r[0])
              .filter(Boolean);

            // Criar compras individuais em paralelo
            await Promise.all(produtosComboValidos.map(produtoCombo =>
              base44.asServiceRole.entities.Compra.create({
                cliente_id: cliente_id,
                cliente_email: userEmail,
                produto_id: produtoCombo.id,
                produto_nome: produtoCombo.nome + ` (Combo: ${item.nome})`,
                produto_tipo: 'digital',
                produto_arquivo_pdf_url: produtoCombo.arquivo_pdf_url || null,
                valor: 0,
                status_pagamento: 'confirmado',
                stripe_payment_intent_id: session.payment_intent,
                stripe_session_id: session.id
              })
            ));

            for (const produtoCombo of produtosComboValidos) {
              if (produtoCombo.arquivo_pdf_url) {
                pdfsEnviados.push({ nome: produtoCombo.nome, url: produtoCombo.arquivo_pdf_url });
              }
            }

            // Enviar email com todos os PDFs do combo
            if (pdfsEnviados.length > 0 && userEmail) {
              try {
                await base44.asServiceRole.functions.invoke('enviarCombosPorEmail', {
                  email: userEmail,
                  combo_nome: item.nome,
                  pdfs: pdfsEnviados
                });
              } catch (emailError) {
                console.error('Erro ao enviar email do combo:', emailError);
              }
            }
            continue;
          }

          if (item.tipo === 'produto') {
            // Buscar dados completos do produto
            const produtos = await base44.asServiceRole.entities.Produto.filter({ id: item.id });
            const produto = produtos[0];

            if (produto) {
              // Criar registro de compra
              const compra = await base44.asServiceRole.entities.Compra.create({
                cliente_id: cliente_id,
                cliente_email: userEmail,
                produto_id: produto.id,
                produto_nome: produto.nome,
                produto_tipo: produto.tipo,
                produto_arquivo_pdf_url: produto.arquivo_pdf_url || null,
                valor: item.preco * item.quantidade,
                status_pagamento: 'confirmado',
                stripe_payment_intent_id: session.payment_intent,
                stripe_session_id: session.id
              });

              // Se o produto oferece créditos IA, adicionar ao cliente
              if (produto.creditos_ia && produto.creditos_ia > 0) {
                try {
                  const clientes = await base44.asServiceRole.entities.Cliente.filter({ email: userEmail });
                  if (clientes.length > 0) {
                    const cliente = clientes[0];
                    const creditosAtuais = cliente.ai_credits || 0;
                    const creditosAReceber = produto.creditos_ia * item.quantidade;
                    const novoSaldo = creditosAtuais + creditosAReceber;

                    // Atualizar créditos do cliente
                    await base44.asServiceRole.entities.Cliente.update(cliente.id, {
                      ai_credits: novoSaldo
                    });

                    // Registrar transação de créditos
                    await base44.asServiceRole.entities.TransacaoCredito.create({
                      usuario_id: cliente.id,
                      usuario_email: userEmail,
                      tipo: 'compra',
                      quantidade: creditosAReceber,
                      valor_pago: item.preco * item.quantidade,
                      stripe_payment_intent_id: session.payment_intent,
                      stripe_session_id: session.id,
                      observacao: `Créditos IA pela compra do produto "${produto.nome}" (${item.quantidade}x ${produto.creditos_ia} créditos)`
                    });
                  }
                } catch (error) {
                  console.error('Erro ao adicionar créditos IA:', error);
                }
              }

              // Se for produto físico, decrementar estoque
              if (produto.tipo === 'fisico') {
                const novoEstoque = Math.max(0, (produto.estoque || 0) - item.quantidade);
                await base44.asServiceRole.entities.Produto.update(produto.id, {
                  estoque: novoEstoque
                });
              }

              // Enviar email com link do PDF para todos (logados ou visitantes)
              if (produto.tipo === 'digital' && produto.arquivo_pdf_url && userEmail) {
                try {
                  await base44.asServiceRole.functions.invoke('enviarPdfPorEmail', {
                    email: userEmail,
                    produto_nome: produto.nome,
                    arquivo_pdf_url: produto.arquivo_pdf_url
                  });
                } catch (emailError) {
                  console.error('Erro ao enviar email PDF:', emailError);
                }
              }
            }
          }
        }

        // Limpar carrinho do usuário após compra confirmada (paralelo)
        const itensCarrinho = await base44.asServiceRole.entities.ItemCarrinho.filter({ cliente_email: userEmail });
        await Promise.all(itensCarrinho.map(item => base44.asServiceRole.entities.ItemCarrinho.delete(item.id)));

      }
    }

    // Marcar tentativas expiradas
    if (event.type === 'checkout.session.expired') {
      const session = event.data.object;
      try {
        const tentativas = await base44.asServiceRole.entities.TentativaCompra.filter({ stripe_session_id: session.id });
        if (tentativas.length > 0) {
          await base44.asServiceRole.entities.TentativaCompra.update(tentativas[0].id, { status: 'expirada' });
        }
      } catch (e) {
        console.error('Erro ao marcar tentativa como expirada:', e);
      }
    }

    return Response.json({ received: true });

  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    return Response.json(
      { error: 'Erro ao processar webhook' },
      { status: 500 }
    );
  }
});