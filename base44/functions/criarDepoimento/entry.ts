import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { cliente_id, texto, avaliacao } = await req.json();

    if (!cliente_id || !texto || !avaliacao) {
      return Response.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    if (texto.trim().length < 10) {
      return Response.json({ error: 'Depoimento muito curto (mínimo 10 caracteres)' }, { status: 400 });
    }

    // Validar que cliente_id pertence ao usuário autenticado
    const clientes = await base44.asServiceRole.entities.Cliente.filter({ email: user.email });
    if (clientes.length === 0 || clientes[0].id !== cliente_id) {
      return Response.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const cliente = clientes[0];

    // Criar depoimento
    const depoimento = await base44.asServiceRole.entities.Depoimento.create({
      cliente_id,
      cliente_nome: cliente.nome,
      cliente_profissao: cliente.profissao || '',
      cliente_foto_url: cliente.foto_url || '',
      texto,
      avaliacao,
      enviado_para_aprovacao: false,
      aprovado: false,
    });

    return Response.json({
      success: true
    });
  } catch (error) {
    return Response.json({ error: 'Erro ao criar depoimento' }, { status: 500 });
  }
});