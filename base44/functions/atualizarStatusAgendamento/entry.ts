import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * ✅ REFATORAÇÃO CRÍTICA #1B: Atualizar Status de Agendamento com Cancelamento
 * 
 * Move a lógica de liberação de horários ao mudar status para 'cancelado'
 * Elimina loop de requisições do frontend
 * Mantém consistência em transação única no servidor
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // ✅ PROTEÇÃO: Apenas admin pode atualizar status
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    let body = {};
    try { body = await req.json(); } catch { /* body vazio ou inválido */ }
    const { agendamentoId, novoStatus } = body;

    if (!agendamentoId || !novoStatus) {
      return Response.json({ error: 'agendamentoId e novoStatus são obrigatórios' }, { status: 400 });
    }

    // ✅ PASSO 1: Buscar agendamento diretamente por ID
    const agendamentosFound = await base44.asServiceRole.entities.Agendamento.filter({ id: agendamentoId });
    const agendamento = agendamentosFound[0];

    if (!agendamento) {
      return Response.json({ error: 'Agendamento não encontrado' }, { status: 404 });
    }

    // ✅ PASSO 2: Se estiver mudando para 'cancelado', liberar horários
    if (novoStatus === 'cancelado') {
      const [hora, min] = agendamento.horario.split(':').map(Number);
      const inicioMinutos = hora * 60 + min;
      const fimMinutos = inicioMinutos + (agendamento.duracao_total || 30);

      // Usar o intervalo real da agenda do profissional (padrão 30min)
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

      // ✅ BATCH UPDATE: Promise.all ao invés de loop com await
      const updatePromissses = slotsParaLiberar
        .map(slot => {
          const horarioObj = horarios.find(h => h.horario === slot);
          if (horarioObj) {
            return base44.asServiceRole.entities.HorarioDisponivel.update(horarioObj.id, {
              disponivel: true
            });
          }
          return null;
        })
        .filter(p => p !== null);

      if (updatePromissses.length > 0) {
        await Promise.all(updatePromissses);
      }
    }

    // ✅ PASSO 3: Atualizar status do agendamento
    await base44.asServiceRole.entities.Agendamento.update(agendamentoId, { status: novoStatus });

    return Response.json({
      success: true,
      message: `Agendamento atualizado para ${novoStatus}`,
      id: agendamentoId,
      status: novoStatus
    });
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});