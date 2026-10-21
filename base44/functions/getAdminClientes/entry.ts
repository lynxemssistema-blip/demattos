import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Verificar se é admin
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Buscar todos os clientes
    const clientes = await base44.asServiceRole.entities.Cliente.list('-created_date');

    // Remover senha_canal de todos os clientes
    const clientesSemSenha = clientes.map(({ senha_canal, ...cliente }) => cliente);

    return Response.json({
      success: true,
      clientes: clientesSemSenha
    });
  } catch (error) {
    return Response.json({ error: 'Erro ao buscar clientes' }, { status: 500 });
  }
});