import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { cliente_email } = await req.json();

    if (!cliente_email || cliente_email !== user.email) {
      return Response.json({ error: 'Email não confere com o usuário logado' }, { status: 403 });
    }

    // Buscar cliente pelo email
    const clientes = await base44.asServiceRole.entities.Cliente.filter({ email: cliente_email });
    
    if (clientes.length === 0) {
      return Response.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    const cliente = clientes[0];

    // Cancelar agendamentos futuros pendentes/confirmados
    const hoje = new Date().toISOString().split('T')[0];
    const agendamentos = await base44.asServiceRole.entities.Agendamento.filter({
      cliente_telefone: cliente.telefone
    });

    for (const ag of agendamentos) {
      if (ag.data >= hoje && (ag.status === 'pendente' || ag.status === 'confirmado')) {
        await base44.asServiceRole.entities.Agendamento.update(ag.id, { status: 'cancelado' });
      }
    }

    // Deletar conversas do DeMattos IA
    const conversas = await base44.asServiceRole.entities.ConversaDeMattos.filter({ cliente_id: cliente.id });
    for (const conversa of conversas) {
      await base44.asServiceRole.entities.ConversaDeMattos.delete(conversa.id);
    }

    // Deletar depoimentos
    const depoimentos = await base44.asServiceRole.entities.Depoimento.filter({ cliente_id: cliente.id });
    for (const dep of depoimentos) {
      await base44.asServiceRole.entities.Depoimento.delete(dep.id);
    }

    // Deletar itens do carrinho
    const itensCarrinho = await base44.asServiceRole.entities.ItemCarrinho.filter({ cliente_email });
    for (const item of itensCarrinho) {
      await base44.asServiceRole.entities.ItemCarrinho.delete(item.id);
    }

    // Deletar o registro do cliente
    await base44.asServiceRole.entities.Cliente.delete(cliente.id);

    return Response.json({ 
      success: true, 
      message: 'Conta excluída com sucesso. Seus dados foram removidos.' 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});