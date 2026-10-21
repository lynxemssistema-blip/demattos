import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Tentar autenticar, mas permitir visitantes
    let user = null;
    try {
      user = await base44.auth.me();
    } catch (e) {
      // visitante não logado
    }

    const payload = await req.json();
    const { pacote_id, cartItems, email_visitante, origem_link_direto } = payload;
    
    // Usar email do usuário logado ou do visitante
    const customerEmail = user ? user.email : email_visitante;
    
    // Pacotes de crédito exigem login
    if (pacote_id && !user) {
      return Response.json({ error: 'Login necessário para comprar créditos' }, { status: 401 });
    }

    // Verificar se é compra de pacote de créditos (exige login, já validado acima)
    if (pacote_id) {
      // Buscar informações do pacote
      const pacotes = await base44.entities.PacoteCredito.filter({ id: pacote_id, ativo: true });
      
      if (!pacotes || pacotes.length === 0) {
        return Response.json(
          { error: 'Pacote não encontrado ou inativo' },
          { status: 404 }
        );
      }

      const pacote = pacotes[0];

      // Criar sessão de checkout no Stripe para pacote
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'brl',
              product_data: {
                name: pacote.nome,
                description: `${pacote.quantidade_tokens} créditos para IA DeMattos`,
              },
              unit_amount: Math.round(pacote.preco_reais * 100),
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${req.headers.get('origin')}/StripeSuccess?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.get('origin')}/StripeCancel`,
        customer_email: user.email,
        metadata: {
          usuario_id: user.id,
          usuario_email: user.email,
          pacote_id: pacote.id,
          quantidade_tokens: pacote.quantidade_tokens.toString(),
        },
      });

      // Registrar tentativa de compra de créditos silenciosamente
      try {
        await base44.asServiceRole.entities.TentativaCompra.create({
          stripe_session_id: session.id,
          cliente_email: user.email,
          cliente_id: user.id,
          origem: 'creditos',
          itens: [{ id: pacote.id, tipo: 'pacote_credito', nome: pacote.nome, preco: pacote.preco_reais, quantidade: 1 }],
          valor_total: pacote.preco_reais,
          status: 'aberta'
        });
      } catch (e) {
        console.error('Erro ao registrar tentativa de créditos:', e);
      }

      return Response.json({
        success: true,
        checkout_url: session.url,
        session_id: session.id,
      });
    }

    // Compra de produtos/serviços do carrinho
    if (!cartItems || cartItems.length === 0) {
      return Response.json(
        { error: 'Carrinho vazio' },
        { status: 400 }
      );
    }

    // Validar email: logado usa user.email, visitante precisa de email_visitante
    if (!customerEmail) {
      return Response.json({ error: 'Email é obrigatório para finalizar a compra' }, { status: 400 });
    }

    // Verificar se há produtos digitais e se o cliente tem canal (apenas para logados)
    const temProdutoDigital = cartItems.some(item => item.tipo === 'produto' && item.produto_tipo === 'digital');
    
    if (temProdutoDigital && user) {
      try {
        const clientes = await base44.asServiceRole.entities.Cliente.filter({ email: user.email });
        if (clientes.length === 0 || !clientes[0].tem_canal) {
          return Response.json({ 
            error: 'Para comprar produtos digitais, você precisa criar um Canal DeMattos primeiro',
            requiresChannel: true 
          }, { status: 400 });
        }
      } catch (error) {
        // Continua se erro ao verificar canal
      }
    }

    // SEGURANÇA: Buscar todos os itens do banco em paralelo, ignorar preços do frontend
    const dbResults = await Promise.all(cartItems.map(item => {
      if (item.tipo === 'combo') return base44.asServiceRole.entities.Combo.filter({ id: item.id, ativo: true });
      if (item.tipo === 'produto') return base44.asServiceRole.entities.Produto.filter({ id: item.id, ativo: true });
      return base44.asServiceRole.entities.Servico.filter({ id: item.id, ativo: true });
    }));

    const line_items = [];
    const metadata_items = [];

    for (let i = 0; i < cartItems.length; i++) {
      const item = cartItems[i];
      const resultado = dbResults[i];

      if (item.tipo === 'combo') {
        if (resultado.length === 0) return Response.json({ error: `Combo indisponível: ${item.id}` }, { status: 400 });
        const combo = resultado[0];
        if (!combo.stripe_price_id) return Response.json({ error: `Combo "${combo.nome}" não configurado no Stripe. Sincronize primeiro.` }, { status: 400 });
        line_items.push({ price: combo.stripe_price_id, quantity: item.quantidade || 1 });
        metadata_items.push({ id: combo.id, tipo: 'combo', nome: combo.nome, preco: combo.preco, quantidade: item.quantidade || 1, produtos_ids: combo.produtos_ids || [] });
      } else if (item.tipo === 'produto') {
        if (resultado.length === 0) return Response.json({ error: `Produto indisponível: ${item.id}` }, { status: 400 });
        const produto = resultado[0];
        if (!produto.stripe_price_id) return Response.json({ error: `Produto ${produto.nome} não configurado no Stripe` }, { status: 400 });
        line_items.push({ price: produto.stripe_price_id, quantity: item.quantidade });
        metadata_items.push({ id: produto.id, tipo: 'produto', nome: produto.nome, preco: produto.preco, quantidade: item.quantidade, produto_tipo: produto.tipo, arquivo_pdf_url: produto.arquivo_pdf_url || null });
      } else {
        if (resultado.length === 0) return Response.json({ error: `Serviço indisponível: ${item.id}` }, { status: 400 });
        const servico = resultado[0];
        line_items.push({ price_data: { currency: 'brl', product_data: { name: servico.nome }, unit_amount: Math.round(servico.preco * 100) }, quantity: item.quantidade });
        metadata_items.push({ id: servico.id, tipo: 'servico', nome: servico.nome, preco: servico.preco, quantidade: item.quantidade });
      }
    }

    const origin = req.headers.get('origin') || Deno.env.get('FRONTEND_URL') || '';
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: `${origin}/StripeSuccess?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/StripeCancel`,
      customer_email: customerEmail,
      metadata: {
        user_id: user ? user.id : '',
        user_email: customerEmail,
        items: JSON.stringify(metadata_items)
      },
    });

    // Registrar tentativa de compra silenciosamente
    try {
      const valorTotal = metadata_items.reduce((sum, i) => sum + (i.preco * (i.quantidade || 1)), 0);
      await base44.asServiceRole.entities.TentativaCompra.create({
        stripe_session_id: session.id,
        cliente_email: customerEmail,
        cliente_id: user ? user.id : null,
        origem: origem_link_direto ? 'link_direto' : 'catalogo',
        itens: metadata_items,
        valor_total: valorTotal,
        status: 'aberta'
      });
    } catch (e) {
      console.error('Erro ao registrar tentativa de compra:', e);
    }

    return Response.json({
      url: session.url,
      sessionId: session.id,
    });

  } catch (error) {
    // SEGURANÇA: Não logar detalhes em produção
    return Response.json(
      { error: 'Erro ao processar pagamento' },
      { status: 500 }
    );
  }
});