import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Suporte a parâmetro opcional: ?modo=agendamento retorna todos os serviços ativos
    // Por padrão (catálogo) retorna apenas os marcados para exibir no catálogo
    let body = {};
    try { body = await req.json(); } catch (e) {}
    const modoAgendamento = body.modo === 'agendamento';

    const todosServicos = await base44.asServiceRole.entities.Servico.filter({ ativo: true });

    // Para agendamento: todos os ativos. Para catálogo: apenas os marcados
    const servicos = modoAgendamento
      ? todosServicos
      : todosServicos.filter(s => s.exibir_no_catalogo === true);

    // Retornar apenas dados públicos
    const servicosPublicos = servicos.map(s => ({
      id: s.id,
      nome: s.nome,
      descricao: s.descricao,
      preco: s.preco,
      duracao: s.duracao,
      icone: s.icone,
      destaque_home: s.destaque_home
    }));

    return Response.json({
      success: true,
      servicos: servicosPublicos
    });
  } catch (error) {
    return Response.json({ error: 'Erro ao buscar serviços' }, { status: 500 });
  }
});