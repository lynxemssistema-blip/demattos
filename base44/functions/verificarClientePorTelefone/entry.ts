import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // SEGURANÇA: Requer autenticação para verificar clientes
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }
    
    const { telefone } = await req.json();

    if (!telefone) {
      return Response.json({ error: 'Telefone obrigatório' }, { status: 400 });
    }

    const clientes = await base44.asServiceRole.entities.Cliente.filter({ telefone });

    if (clientes.length > 0) {
      const { senha_canal, observacoes, ...clientePublico } = clientes[0];
      return Response.json({
        success: true,
        cliente: clientePublico
      });
    }

    return Response.json({
      success: true,
      cliente: null
    });
  } catch (error) {
    return Response.json({ error: 'Erro ao verificar cliente' }, { status: 500 });
  }
});