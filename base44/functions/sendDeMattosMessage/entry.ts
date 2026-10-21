import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { cliente_id, mensagem, fotos_urls, has_credits } = await req.json();

    if (!cliente_id || !mensagem) {
      return Response.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    // Buscar cliente
    const clientes = await base44.asServiceRole.entities.Cliente.filter({ id: cliente_id });
    
    if (clientes.length === 0) {
      return Response.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    const cliente = clientes[0];

    // Determinar se deve gerar imagem e consumir créditos
    const shouldGenerateImage = has_credits && (fotos_urls && fotos_urls.length > 0);
    const shouldConsumeCredits = has_credits;

    // Buscar produtos digitais ativos
    const produtosDigitais = await base44.asServiceRole.entities.Produto.filter({
      tipo: 'digital',
      ativo: true
    });

    // Buscar produtos físicos ativos
    const produtosFisicos = await base44.asServiceRole.entities.Produto.filter({
      tipo: 'fisico',
      ativo: true
    });

    // Buscar serviços ativos
    const servicos = await base44.asServiceRole.entities.Servico.filter({
      ativo: true
    });

    const listaProdutosDigitais = produtosDigitais.map(p => 
      `- 📚 ${p.nome} (R$ ${p.preco.toFixed(2)}): ${p.descricao || 'Ebook disponível'}`
    ).join('\n');

    const listaProdutosFisicos = produtosFisicos.map(p => 
      `- 🛍️ ${p.nome} (R$ ${p.preco.toFixed(2)}): ${p.descricao || 'Produto físico'}`
    ).join('\n');

    const listaServicos = servicos.map(s => 
      `- ✂️ ${s.nome} (R$ ${s.preco.toFixed(2)}): ${s.descricao || ''} - ${s.duracao} minutos`
    ).join('\n');

    // Salvar mensagem do usuário
    await base44.asServiceRole.entities.ConversaDeMattos.create({
      cliente_id,
      role: 'user',
      mensagem,
      fotos_urls: fotos_urls || []
    });

    // Buscar histórico para contexto
    const historico = await base44.asServiceRole.entities.ConversaDeMattos.filter({
      cliente_id
    }, '-created_date', 20);

    const historicoTexto = historico.slice(-10).map(h => 
      `${h.role === 'user' ? 'Cliente' : 'DeMattos'}: ${h.mensagem}`
    ).join('\n\n');

    const promptSistema = `Você é DeMattos, especialista em visagismo masculino e criador de imagens de referência visual para barbearia no Brasil.

${shouldGenerateImage ? 'SUA FUNÇÃO PRINCIPAL: SEMPRE fornecer recomendações acompanhadas de uma imagem visual gerada como referência.' : 'SUA FUNÇÃO PRINCIPAL: Fornecer recomendações sobre visagismo masculino (apenas texto, sem geração de imagens).'}

Cliente: ${cliente.nome}
${cliente.profissao ? `Profissão: ${cliente.profissao}` : ''}

=== CATÁLOGO COMPLETO DA BARBEARIA ===

SERVIÇOS:
${listaServicos || 'Nenhum serviço cadastrado'}

PRODUTOS FÍSICOS:
${listaProdutosFisicos || 'Nenhum produto físico disponível'}

EBOOKS/PRODUTOS DIGITAIS:
${listaProdutosDigitais || 'Nenhum ebook disponível'}

HISTÓRICO RECENTE:
${historicoTexto}

NOVA MENSAGEM: ${mensagem}
${fotos_urls && fotos_urls.length > 0 ? `[Cliente enviou ${fotos_urls.length} foto(s)]` : ''}

${has_credits 
  ? 'Responda de forma natural, detalhada e profissional. Seja completo e informativo.' + (shouldGenerateImage ? ' Informe que uma imagem de referência será gerada.' : '') + '\n\nQuando RELEVANTE, mencione serviços ou produtos naturalmente na conversa (sem forçar). Se recomendar um ebook, use: "📚 [PRODUTO: nome_exato_do_produto]" ao final.'
  : 'IMPORTANTE: Cliente sem créditos. Seja SUCINTO e direto - apenas o essencial. Máximo 3-4 linhas.\n\nSe muito relevante, mencione brevemente serviços/produtos. Para ebooks: "📚 [PRODUTO: nome_exato_do_produto]" ao final.'}`;

    // Chamar IA para obter a resposta de texto
    const resposta = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: promptSistema,
      file_urls: shouldGenerateImage ? (fotos_urls || []) : undefined
    });

    // Gerar imagem visual apenas se tiver créditos
    let previaUrl = null;
    if (shouldGenerateImage) {
      try {
        const imagemBase = (fotos_urls && fotos_urls.length > 0) ? fotos_urls[0] : null;
        
        const promptImagem = imagemBase
          ? `Transformação de visual masculino profissional baseada na imagem. ${resposta.substring(0, 400)}. Estilo brasileiro, acabamento profissional, lighting natural.`
          : `Referência visual de corte masculino. ${resposta.substring(0, 400)}. Homem com visual recomendado, estilo brasileiro contemporâneo.`;

        const imagemGerada = await base44.asServiceRole.integrations.Core.GenerateImage({
          prompt: promptImagem,
          existing_image_urls: imagemBase ? [imagemBase] : undefined
        });
        previaUrl = imagemGerada.url;
      } catch (error) {
        // Continua sem imagem se falhar
      }
    }

    // Verificar se a IA recomendou algum produto
    let produtoRecomendado = null;
    const matchProduto = resposta.match(/📚 \[PRODUTO: ([^\]]+)\]/);
    if (matchProduto) {
      const nomeProduto = matchProduto[1];
      const produtoEncontrado = produtosDigitais.find(p => 
        p.nome.toLowerCase().includes(nomeProduto.toLowerCase()) || 
        nomeProduto.toLowerCase().includes(p.nome.toLowerCase())
      );
      if (produtoEncontrado) {
        produtoRecomendado = {
          id: produtoEncontrado.id,
          nome: produtoEncontrado.nome,
          preco: produtoEncontrado.preco,
          imagem_url: produtoEncontrado.imagem_url,
          descricao: produtoEncontrado.descricao
        };
      }
    }

    // Remover marcador do produto da resposta
    const respostaLimpa = resposta.replace(/📚 \[PRODUTO: [^\]]+\]/g, '').trim();

    // Salvar resposta do assistente
    await base44.asServiceRole.entities.ConversaDeMattos.create({
      cliente_id,
      role: 'assistant',
      mensagem: respostaLimpa,
      previa_url: previaUrl
    });

    // Descontar crédito apenas se has_credits for true
    let novosCreditos = cliente.ai_credits || 0;
    if (shouldConsumeCredits) {
      novosCreditos = Math.max(0, (cliente.ai_credits || 0) - 1);
      await base44.asServiceRole.entities.Cliente.update(cliente.id, {
        ai_credits: novosCreditos
      });

      // Registrar transação
      await base44.asServiceRole.entities.TransacaoCredito.create({
        usuario_id: cliente.id,
        usuario_email: cliente.email,
        tipo: 'consumo_ia',
        quantidade: -1,
        observacao: 'Consulta DeMattos IA'
      });
    }

    return Response.json({
      success: true,
      resposta: respostaLimpa,
      previa_url: previaUrl,
      produto_recomendado: produtoRecomendado,
      novos_creditos: novosCreditos
    });
  } catch (error) {
    return Response.json({ error: 'Erro ao processar mensagem' }, { status: 500 });
  }
});