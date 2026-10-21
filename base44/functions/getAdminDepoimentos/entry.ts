import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const depoimentos = await base44.asServiceRole.entities.Depoimento.filter({
      enviado_para_aprovacao: true
    }, '-created_date');

    return Response.json({
      success: true,
      depoimentos
    });
  } catch (error) {
    return Response.json({ error: 'Erro ao buscar depoimentos' }, { status: 500 });
  }
});