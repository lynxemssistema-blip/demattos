import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const configs = await base44.asServiceRole.entities.ConfiguracaoAssistente.list();

    return Response.json({
      success: true,
      configs: configs.length > 0 ? configs[0] : null
    });
  } catch (error) {
    return Response.json({ error: 'Erro ao buscar configuração' }, { status: 500 });
  }
});