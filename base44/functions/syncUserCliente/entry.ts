import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
     const base44 = createClientFromRequest(req);
     const user = await base44.auth.me();

     if (!user) {
       return Response.json({ error: 'Não autenticado' }, { status: 401 });
     }

     // Usar apenas o email e nome do user, nunca expor o objeto completo
     const userEmail = user.email;
     const userName = user.full_name || userEmail.split('@')[0];

    // Buscar se já existe um Cliente para este usuário
    const clientes = await base44.asServiceRole.entities.Cliente.filter({ email: userEmail });

    if (clientes.length > 0) {
      // Cliente já existe, retorna ele
      const { senha_canal, ...clienteSemSenha } = clientes[0];
      return Response.json({ 
        success: true, 
        cliente: clienteSemSenha 
      });
    }

    // Cliente não existe, criar novo com base no User
    const novoCliente = await base44.asServiceRole.entities.Cliente.create({
      nome: userName,
      email: userEmail,
      telefone: '', // Usuário pode preencher depois no perfil
      tem_canal: true,
      ai_credits: 0,
    });

    const { senha_canal, ...clienteSemSenha } = novoCliente;

    return Response.json({ 
      success: true, 
      cliente: clienteSemSenha,
      novo: true
    });
  } catch (error) {
    return Response.json({ 
      error: 'Erro ao sincronizar dados'
    }, { status: 500 });
  }
});