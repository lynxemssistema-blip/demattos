import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const imagens = await base44.asServiceRole.entities.ImagemHero.list('ordem');

    return Response.json({
      success: true,
      imagens
    });
  } catch (error) {
    return Response.json({ error: 'Erro ao buscar imagens' }, { status: 500 });
  }
});