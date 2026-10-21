import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { depoimento_id, cliente_id } = await req.json();

    if (!depoimento_id || !cliente_id) {
      return Response.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    // Validar que cliente_id pertence ao usuário autenticado
    const clientes = await base44.asServiceRole.entities.Cliente.filter({ email: user.email });
    if (clientes.length === 0 || clientes[0].id !== cliente_id) {
      return Response.json({ error: 'Não autorizado' }, { status: 403 });
    }

    // Verificar se o depoimento pertence ao cliente
    const depoimentos = await base44.asServiceRole.entities.Depoimento.filter({ id: depoimento_id });
    
    if (depoimentos.length === 0) {
      return Response.json({ error: 'Depoimento não encontrado' }, { status: 404 });
    }

    const depoimento = depoimentos[0];

    if (depoimento.cliente_id !== cliente_id) {
      return Response.json({ error: 'Não autorizado' }, { status: 403 });
    }

    // Toggle enviado_para_aprovacao
    await base44.asServiceRole.entities.Depoimento.update(depoimento_id, {
      enviado_para_aprovacao: !depoimento.enviado_para_aprovacao
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: 'Erro ao atualizar depoimento' }, { status: 500 });
  }
});