import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Apenas o usuário master (admin) pode promover clientes.' }, { status: 403 });
    }

    const { cliente_email, promover } = await req.json();

    if (!cliente_email) {
      return Response.json({ error: 'Email do cliente é obrigatório.' }, { status: 400 });
    }

    // Buscar o User pelo email
    const users = await base44.asServiceRole.entities.User.filter({ email: cliente_email });

    if (!users || users.length === 0) {
      return Response.json({ error: 'Usuário não encontrado no sistema. O cliente precisa ter uma conta ativa.' }, { status: 404 });
    }

    const targetUser = users[0];

    // Não permitir rebaixar a si mesmo
    if (targetUser.email === user.email) {
      return Response.json({ error: 'Você não pode alterar sua própria permissão.' }, { status: 400 });
    }

    const novoRole = promover ? 'admin' : 'user';
    await base44.asServiceRole.entities.User.update(targetUser.id, { role: novoRole });

    return Response.json({ 
      success: true, 
      message: promover 
        ? `${targetUser.full_name || cliente_email} agora é administrador.`
        : `${targetUser.full_name || cliente_email} voltou a ser usuário comum.`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});