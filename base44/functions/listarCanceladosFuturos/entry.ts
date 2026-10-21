import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const cancelados = await base44.asServiceRole.entities.Agendamento.filter({ status: 'cancelado' }, '-data', 500);

    const lista = (Array.isArray(cancelados) ? cancelados : [])
      .filter(ag => ag && ag.data && ag.data >= '2026-03-28')
      .map(ag => ({
        id: ag.id,
        nome: ag.cliente_nome,
        data: ag.data,
        horario: ag.horario,
        profissional: ag.profissional_nome,
        servico: ag.servico,
      }));

    lista.sort((a, b) => a.data.localeCompare(b.data) || a.horario.localeCompare(b.horario));

    return Response.json({ total: lista.length, agendamentos: lista });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});