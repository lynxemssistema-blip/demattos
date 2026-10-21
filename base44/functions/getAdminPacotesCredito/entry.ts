import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const pacotes = await base44.asServiceRole.entities.PacoteCredito.list('-preco_reais');

    return Response.json({
      success: true,
      pacotes
    });
  } catch (error) {
    return Response.json({ error: 'Erro ao buscar pacotes' }, { status: 500 });
  }
});