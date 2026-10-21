import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const imagens = await base44.asServiceRole.entities.ImagemHero.filter({ 
      ativo: true 
    }, 'ordem');

    return Response.json({
      success: true,
      imagens
    });
  } catch (error) {
    return Response.json({ error: 'Erro ao buscar imagens hero' }, { status: 500 });
  }
});