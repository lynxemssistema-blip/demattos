import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const pacotes = await base44.asServiceRole.entities.PacoteCredito.filter({ 
      ativo: true 
    }, '-preco_reais');

    return Response.json({
      success: true,
      pacotes
    });
  } catch (error) {
    return Response.json({ error: 'Erro ao buscar pacotes' }, { status: 500 });
  }
});