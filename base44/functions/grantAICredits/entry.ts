import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const admin = await base44.auth.me();

    // Verificar se é admin
    if (!admin || admin.role !== 'admin') {
      return Response.json(
        { error: 'Acesso negado. Apenas administradores podem conceder créditos.' },
        { status: 403 }
      );
    }

    const { usuario_id, usuario_email, quantidade, observacao } = await req.json();

    if (!quantidade || quantidade <= 0) {
      return Response.json(
        { error: 'Dados inválidos. Forneça quantidade positiva.' },
        { status: 400 }
      );
    }

    // Buscar o cliente pelo email
    const clientes = await base44.asServiceRole.entities.Cliente.filter({ email: usuario_email });
    
    if (clientes.length === 0) {
      return Response.json(
        { error: 'Cliente não encontrado com este email.' },
        { status: 404 }
      );
    }

    const cliente = clientes[0];
    const creditosAtuais = cliente.ai_credits || 0;
    const novoSaldo = creditosAtuais + quantidade;

    // Atualizar créditos do cliente
    await base44.asServiceRole.entities.Cliente.update(cliente.id, {
      ai_credits: novoSaldo
    });

    // Registrar transação (se tiver usuario_id do User, registra também)
    const usuarios = usuario_id !== 'pending' 
      ? await base44.asServiceRole.entities.User.filter({ id: usuario_id })
      : [];

    await base44.asServiceRole.entities.TransacaoCredito.create({
      usuario_id: usuarios.length > 0 ? usuarios[0].id : cliente.id,
      usuario_email: usuario_email,
      tipo: 'bonus_admin',
      quantidade: quantidade,
      admin_que_concedeu: admin.email,
      observacao: observacao || 'Créditos concedidos pelo administrador'
    });

    return Response.json({
      success: true,
      usuario_email: usuario_email,
      creditos_anteriores: creditosAtuais,
      creditos_concedidos: quantidade,
      novo_saldo: novoSaldo
    });

  } catch (error) {
    return Response.json(
      { error: 'Erro ao conceder créditos' },
      { status: 500 }
    );
  }
});