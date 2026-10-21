import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole.entities;

    // Buscar TODOS os dados da Home em paralelo — uma única chamada backend
    const [
      heroImagens,
      secaoSobre,
      agendamentosRealizados,
      todosServicos,
      profissionais,
      todosProdutos,
      combos,
      galeria,
      depoimentos,
      configuracoes,
      instagramConfig,
      instagramVideos,
    ] = await Promise.all([
      db.ImagemHero.filter({ ativo: true }, 'ordem').catch(() => []),
      db.SecaoSobre.list().catch(() => []),
      db.Agendamento.filter({ status: 'realizado' }).catch(() => []),
      db.Servico.filter({ ativo: true }).catch(() => []),
      db.Profissional.filter({ ativo: true }).catch(() => []),
      db.Produto.filter({ ativo: true }).catch(() => []),
      db.Combo.filter({ ativo: true }).catch(() => []),
      db.ImagemGaleria.list('ordem').catch(() => []),
      db.Depoimento.filter({ aprovado: true }, '-created_date').catch(() => []),
      db.Configuracao.list().catch(() => []),
      db.Configuracao.filter({ chave: 'instagram_secao_ativa' }).catch(() => []),
      db.InstagramVideo.filter({ ativo: true }, '-ordem').catch(() => []),
    ]);

    // Contar atendimentos por profissional
    const atendimentosPorProfissional = {};
    for (const ag of agendamentosRealizados) {
      if (ag.profissional_id) {
        atendimentosPorProfissional[ag.profissional_id] = (atendimentosPorProfissional[ag.profissional_id] || 0) + 1;
      }
    }

    // Profissionais públicos (sem senha)
    const profissionaisPublicos = profissionais.map(p => ({
      id: p.id,
      nome: p.nome,
      email: p.email,
      foto_url: p.foto_url,
      historico_profissional: p.historico_profissional,
      servicos_ids: p.servicos_ids,
      destaque_home: p.destaque_home,
      ativo: p.ativo
    }));

    // Serviços públicos
    const servicosPublicos = todosServicos.map(s => ({
      id: s.id,
      nome: s.nome,
      descricao: s.descricao,
      preco: s.preco,
      duracao: s.duracao,
      icone: s.icone,
      destaque_home: s.destaque_home,
      exibir_no_catalogo: s.exibir_no_catalogo
    }));

    // Produtos públicos — exibir no catálogo OU destaque na home
    const produtosPublicos = todosProdutos
      .filter(p => p.exibir_no_catalogo === true || p.destaque_home === true)
      .map(p => ({
        id: p.id,
        nome: p.nome,
        descricao: p.descricao,
        tipo: p.tipo,
        preco: p.preco,
        estoque: p.estoque,
        imagem_url: p.imagem_url,
        arquivo_previa_url: p.arquivo_previa_url,
        creditos_ia: p.creditos_ia || 0,
        destaque_home: p.destaque_home,
        _item_kind: 'produto'
      }));

    const combosPublicos = combos.map(c => ({
      id: c.id,
      nome: c.nome,
      descricao: c.descricao,
      tipo: 'digital',
      preco: c.preco,
      estoque: null,
      imagem_url: c.imagem_url,
      arquivo_previa_url: null,
      creditos_ia: 0,
      destaque_home: true,
      produtos_ids: c.produtos_ids || [],
      _item_kind: 'combo'
    }));

    // Configurações públicas
    const configsPublicas = configuracoes.filter(c =>
      ['endereco', 'telefone', 'horario_semana', 'horario_sabado', 'horario_domingo'].includes(c.chave)
    );

    return Response.json({
      success: true,
      hero: heroImagens,
      sobre: secaoSobre[0] || null,
      totalAtendimentos: agendamentosRealizados.length,
      atendimentosPorProfissional,
      servicos: servicosPublicos,
      profissionais: profissionaisPublicos,
      produtos: [...produtosPublicos, ...combosPublicos],
      galeria,
      depoimentos,
      configuracoes: configsPublicas,
      instagram: {
        ativa: instagramConfig[0]?.valor !== 'false',
        videos: instagramVideos
      }
    });
  } catch (error) {
    console.error('getHomeData error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});