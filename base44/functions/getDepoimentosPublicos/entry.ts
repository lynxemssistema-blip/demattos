import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const depoimentos = await base44.asServiceRole.entities.Depoimento.filter({
      aprovado: true
    }, '-created_date');

    return Response.json({
      success: true,
      depoimentos
    });
  } catch (error) {
    return Response.json({ error: 'Erro ao buscar depoimentos' }, { status: 500 });
  }
});