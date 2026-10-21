import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const produtos = await base44.asServiceRole.entities.Produto.filter({}, '-created_date');

    return Response.json({
      success: true,
      produtos
    });
  } catch (error) {
    return Response.json({ error: 'Erro ao buscar produtos' }, { status: 500 });
  }
});