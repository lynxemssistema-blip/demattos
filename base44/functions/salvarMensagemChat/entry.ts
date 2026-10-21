import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // SEGURANÇA: Verificar autenticação e ownership
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { cliente_id, role, mensagem, fotos_urls, previa_url } = await req.json();

    if (!role || !mensagem) {
      return Response.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    // SEGURANÇA: Verificar que o cliente pertence ao usuário autenticado
    const clientes = await base44.asServiceRole.entities.Cliente.filter({ 
      id: cliente_id,
      email: user.email 
    });
    
    if (clientes.length === 0) {
      return Response.json({ error: 'Cliente não encontrado ou sem permissão' }, { status: 403 });
    }

    await base44.asServiceRole.entities.ConversaDeMattos.create({
      cliente_id,
      role,
      mensagem,
      fotos_urls: fotos_urls || [],
      previa_url: previa_url || null
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: 'Erro ao salvar mensagem' }, { status: 500 });
  }
});