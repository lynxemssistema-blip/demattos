import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const servicos = await base44.asServiceRole.entities.Servico.filter({}, '-created_date');

    return Response.json({
      success: true,
      servicos
    });
  } catch (error) {
    return Response.json({ error: 'Erro ao buscar serviços' }, { status: 500 });
  }
});