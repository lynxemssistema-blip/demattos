import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Buscar o cliente pelo email do usuário autenticado
    const clientes = await base44.asServiceRole.entities.Cliente.filter({ email: user.email });
    
    if (clientes.length === 0) {
      return Response.json({ success: true, depoimentos: [] });
    }

    const cliente = clientes[0];

    // Buscar depoimentos do cliente
    const depoimentos = await base44.asServiceRole.entities.Depoimento.filter({
      cliente_id: cliente.id
    }, '-created_date');

    return Response.json({
      success: true,
      depoimentos
    });
  } catch (error) {
    return Response.json({ error: 'Erro ao buscar depoimentos' }, { status: 500 });
  }
});