import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // SEGURANÇA: Usar o usuário autenticado, ignorar email do frontend
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Buscar apenas compras do usuário autenticado
    const compras = await base44.asServiceRole.entities.Compra.filter({ 
      cliente_email: user.email 
    }, '-created_date');

    return Response.json({
      success: true,
      compras
    });
  } catch (error) {
    console.error('Erro getMinhasCompras:', error);
    return Response.json({ error: 'Erro ao buscar compras' }, { status: 500 });
  }
});