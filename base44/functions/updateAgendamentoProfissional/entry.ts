import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Verificar autenticação
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { profissional_id, agendamento_id, action, data } = await req.json();

    if (!profissional_id || !agendamento_id || !action) {
      return Response.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    // Verificar que o chamador é admin ou o próprio profissional
    const isAdmin = user.role === 'admin';
    if (!isAdmin) {
      const profissionaisAuth = await base44.asServiceRole.entities.Profissional.filter({
        id: profissional_id,
        email: user.email,
        ativo: true
      });
      if (profissionaisAuth.length === 0) {
        return Response.json({ error: 'Acesso negado' }, { status: 403 });
      }
    }

    // Verificar se o agendamento pertence ao profissional
    const agendamentos = await base44.asServiceRole.entities.Agendamento.filter({ id: agendamento_id });
    
    if (agendamentos.length === 0) {
      return Response.json({ error: 'Agendamento não encontrado' }, { status: 404 });
    }

    const agendamento = agendamentos[0];

    if (agendamento.profissional_id !== profissional_id) {
      return Response.json({ error: 'Não autorizado' }, { status: 403 });
    }

    // Executar ação
    if (action === 'update') {
      await base44.asServiceRole.entities.Agendamento.update(agendamento_id, data);
    } else if (action === 'delete') {
      await base44.asServiceRole.entities.Agendamento.delete(agendamento_id);
    } else if (action === 'status') {
      await base44.asServiceRole.entities.Agendamento.update(agendamento_id, {
        status: data.status
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: 'Erro ao atualizar agendamento' }, { status: 500 });
  }
});