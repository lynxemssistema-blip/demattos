import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // SEGURANÇA: Usar o usuário autenticado, não aceitar telefone do frontend
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Buscar cliente associado ao email do usuário logado
    const clientes = await base44.asServiceRole.entities.Cliente.filter({ 
      email: user.email 
    });
    
    if (clientes.length === 0) {
      return Response.json({
        success: true,
        agendamentos: []
      });
    }

    const cliente = clientes[0];
    
    // Buscar agendamentos apenas do cliente autenticado
    const agendamentos = await base44.asServiceRole.entities.Agendamento.filter({
      cliente_telefone: cliente.telefone
    }, '-created_date');

    return Response.json({
      success: true,
      agendamentos
    });
  } catch (error) {
    // SEGURANÇA: Não logar PII em produção
    return Response.json({ error: 'Erro ao buscar agendamentos' }, { status: 500 });
  }
});