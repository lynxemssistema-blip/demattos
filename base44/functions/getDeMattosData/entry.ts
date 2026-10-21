import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // SEGURANÇA: Verificar autenticação e ownership
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { cliente_id } = await req.json();

    if (!cliente_id) {
      return Response.json({ error: 'ID do cliente obrigatório' }, { status: 400 });
    }

    // SEGURANÇA: Verificar que o cliente pertence ao usuário autenticado
    const clientes = await base44.asServiceRole.entities.Cliente.filter({ 
      id: cliente_id,
      email: user.email 
    });

    if (clientes.length === 0) {
      return Response.json({ error: 'Cliente não encontrado ou sem permissão' }, { status: 403 });
    }

    const cliente = clientes[0];

    // Buscar apenas conversas deste cliente
    const conversas = await base44.asServiceRole.entities.ConversaDeMattos.filter({
      cliente_id
    }, '-created_date', 20);

    return Response.json({
      success: true,
      credits: cliente.ai_credits || 0,
      conversas: conversas.reverse()
    });
  } catch (error) {
    return Response.json({ error: 'Erro ao carregar dados' }, { status: 500 });
  }
});