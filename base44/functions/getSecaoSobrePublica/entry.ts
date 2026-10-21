import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const [secao, agendamentosRealizados] = await Promise.all([
      base44.asServiceRole.entities.SecaoSobre.list(),
      base44.asServiceRole.entities.Agendamento.filter({ status: 'realizado' })
    ]);

    return Response.json({
      success: true,
      secao: secao[0] || null,
      totalAtendimentos: agendamentosRealizados.length
    });
  } catch (error) {
    return Response.json({ error: 'Erro ao buscar dados' }, { status: 500 });
  }
});