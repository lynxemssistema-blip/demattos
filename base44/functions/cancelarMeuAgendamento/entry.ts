import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    let body = {};
    try { body = await req.json(); } catch { /* body vazio ou inválido */ }
    const { agendamento_id } = body;

    if (!agendamento_id) {
      return Response.json({ error: 'ID do agendamento não fornecido' }, { status: 400 });
    }

    // Buscar dados do cliente autenticado
    const clientes = await base44.asServiceRole.entities.Cliente.filter({ email: user.email });
    if (clientes.length === 0) {
      return Response.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    const cliente = clientes[0];

    // Validar que o cliente tem telefone cadastrado
    if (!cliente.telefone) {
      return Response.json({ error: 'Telefone não cadastrado no perfil' }, { status: 400 });
    }

    // Buscar agendamento
    const agendamentos = await base44.asServiceRole.entities.Agendamento.filter({ id: agendamento_id });
    
    if (agendamentos.length === 0) {
      return Response.json({ error: 'Agendamento não encontrado' }, { status: 404 });
    }

    const agendamento = agendamentos[0];

    // Validar que o agendamento pertence ao cliente do usuário autenticado
    if (agendamento.cliente_telefone !== cliente.telefone) {
      return Response.json({ error: 'Não autorizado' }, { status: 403 });
    }

    // Validar status
    if (agendamento.status === 'cancelado' || agendamento.status === 'realizado') {
      return Response.json({ error: 'Agendamento não pode ser cancelado' }, { status: 400 });
    }

    // Validar antecedência mínima (90 minutos) — forçando fuso de Brasília (UTC-3)
    const agoraBrasilia = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const dataHoraAgendamento = new Date(`${agendamento.data}T${agendamento.horario}:00-03:00`);
    const diferencaMinutos = (dataHoraAgendamento - agoraBrasilia) / (1000 * 60);

    if (diferencaMinutos < 90) {
      return Response.json({ 
        error: 'Cancelamento permitido apenas com 90 minutos de antecedência' 
      }, { status: 400 });
    }

    // Cancelar agendamento
    await base44.asServiceRole.entities.Agendamento.update(agendamento_id, {
      status: 'cancelado'
    });

    // Liberar horários
    const [hora, min] = agendamento.horario.split(':').map(Number);
    const inicioMinutos = hora * 60 + min;
    const fimMinutos = inicioMinutos + (agendamento.duracao_total || 30);
    
    const configAgenda = await base44.asServiceRole.entities.ConfigAgendaProfissional.filter({
      profissional_id: agendamento.profissional_id
    });
    const intervalo = configAgenda[0]?.intervalo_minutos || 30;

    const slotsParaLiberar = [];
    let minutoAtual = inicioMinutos;
    while (minutoAtual < fimMinutos) {
      const h = Math.floor(minutoAtual / 60).toString().padStart(2, '0');
      const m = (minutoAtual % 60).toString().padStart(2, '0');
      slotsParaLiberar.push(`${h}:${m}`);
      minutoAtual += intervalo;
    }

    const horarios = await base44.asServiceRole.entities.HorarioDisponivel.filter({
      profissional_id: agendamento.profissional_id,
      data: agendamento.data
    });

    const updatePromises = slotsParaLiberar
      .map(slot => {
        const horarioObj = horarios.find(h => h.horario === slot);
        return horarioObj
          ? base44.asServiceRole.entities.HorarioDisponivel.update(horarioObj.id, { disponivel: true })
          : null;
      })
      .filter(Boolean);

    if (updatePromises.length > 0) await Promise.all(updatePromises);

    // Notificar cancelamento
    try {
      await base44.functions.invoke('sendAppointmentToN8n', { 
        agendamentoId: agendamento_id,
        type: 'cancelamento'
      });
    } catch (error) {
      // Continua mesmo se notificação falhar
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: 'Erro ao cancelar agendamento' }, { status: 500 });
  }
});