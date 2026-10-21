import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Buscar o cliente pelo email do usuário autenticado
    const clientes = await base44.asServiceRole.entities.Cliente.filter({ email: user.email });
    
    if (clientes.length === 0) {
      return Response.json({ success: true, agendamentos: [] });
    }

    const cliente = clientes[0];

    // Se o cliente não tem telefone, retornar array vazio
    if (!cliente.telefone || cliente.telefone.trim() === '') {
      return Response.json({ success: true, agendamentos: [] });
    }

    const hoje = new Date().toISOString().split('T')[0];

    // Futuros: todos a partir de hoje, amarrados ao cliente_id para evitar vazamento por telefone
    const futuros = await base44.asServiceRole.entities.Agendamento.filter({
      profissional_id: { $exists: true }, // garante que temos um índice base
      cliente_telefone: cliente.telefone,
      data: { $gte: hoje }
    }, 'data', 200);

    // Passados: apenas os 20 mais recentes
    const passados = await base44.asServiceRole.entities.Agendamento.filter({
      cliente_telefone: cliente.telefone,
      data: { $lt: hoje }
    }, '-data', 20);

    // Validação extra de privacidade: descartar registros cujo telefone não bate exatamente
    const telefoneNormalizado = cliente.telefone.trim();
    const agendamentos = [...futuros, ...passados].filter(
      a => a.cliente_telefone?.trim() === telefoneNormalizado
    );

    return Response.json({
      success: true,
      agendamentos
    });
  } catch (error) {
    console.error('[buscarAgendamentosCliente] Erro:', error);
    return Response.json({ 
      error: 'Erro ao buscar agendamentos'
    }, { status: 500 });
  }
});