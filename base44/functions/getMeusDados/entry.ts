import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // SEGURANÇA: Usar o usuário autenticado, não o email do frontend
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Buscar apenas dados do cliente autenticado
    const clientes = await base44.asServiceRole.entities.Cliente.filter({ email: user.email });

    if (clientes.length === 0) {
      return Response.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    const cliente = clientes[0];

    // Remover dados sensíveis
    const { senha_canal, observacoes, ...dadosPublicos } = cliente;

    // Buscar agendamentos do cliente
    const agendamentos = await base44.asServiceRole.entities.Agendamento.filter({
      cliente_telefone: cliente.telefone
    }, '-created_date');

    // Buscar depoimentos do cliente
    const depoimentos = await base44.asServiceRole.entities.Depoimento.filter({
      cliente_id: cliente.id
    }, '-created_date');

    // Buscar compras do cliente
    const compras = await base44.asServiceRole.entities.Compra.filter({
      cliente_email: user.email
    }, '-created_date');

    // Buscar conversas IA do cliente
    const conversas = await base44.asServiceRole.entities.ConversaDeMattos.filter({
      cliente_id: cliente.id
    }, '-created_date');

    return Response.json({
      success: true,
      cliente: dadosPublicos,
      agendamentos,
      depoimentos,
      compras,
      conversas
    });
  } catch (error) {
    console.error('Erro ao buscar dados:', error);
    return Response.json({ error: 'Erro ao buscar dados' }, { status: 500 });
  }
});