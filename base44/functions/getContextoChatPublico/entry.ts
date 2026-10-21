import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const [servicos, produtos, profissionais, configs, horarios] = await Promise.all([
      base44.asServiceRole.entities.Servico.filter({ ativo: true }),
      base44.asServiceRole.entities.Produto.filter({ ativo: true }),
      base44.asServiceRole.entities.Profissional.filter({ ativo: true }),
      base44.asServiceRole.entities.Configuracao.list(),
      base44.asServiceRole.entities.HorarioDisponivel.filter({
        data: { $gte: new Date().toISOString().split('T')[0] },
        disponivel: true
      })
    ]);

    // Retornar apenas dados públicos SEM senhas/PDFs
    return Response.json({
      success: true,
      servicos: servicos.map(s => ({
        id: s.id,
        nome: s.nome,
        descricao: s.descricao,
        preco: s.preco,
        duracao: s.duracao
      })),
      produtos: produtos.map(p => ({
        id: p.id,
        nome: p.nome,
        descricao: p.descricao,
        tipo: p.tipo
      })),
      profissionais: profissionais.map(p => ({
        id: p.id,
        nome: p.nome,
        servicos_ids: p.servicos_ids
      })),
      configuracoes: configs,
      horarios: horarios.slice(0, 20).map(h => ({
        data: h.data,
        horario: h.horario,
        profissional_nome: h.profissional_nome
      }))
    });
  } catch (error) {
    return Response.json({ error: 'Erro ao buscar contexto' }, { status: 500 });
  }
});