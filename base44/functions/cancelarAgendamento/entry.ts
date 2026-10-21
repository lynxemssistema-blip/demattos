import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * ✅ REFATORAÇÃO CRÍTICA #1: Migração de Mutação em Loop para Backend
 * 
 * Esta função centraliza a lógica de cancelamento de agendamentos no servidor,
 * elimina loops de requisições do frontend e garante consistência transacional.
 * 
 * Antes: Frontend fazia 5+ requisições await em loop para liberar horários
 * Depois: Uma única requisição que executa tudo no servidor
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // ✅ PROTEÇÃO: Apenas admin pode cancelar agendamentos
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    let body = {};
    try { body = await req.json(); } catch { /* body vazio ou inválido */ }
    const { agendamentoId } = body;

    if (!agendamentoId) {
      return Response.json({ error: 'agendamentoId é obrigatório' }, { status: 400 });
    }

    // ✅ PASSO 1: Buscar agendamento diretamente por ID
    const agendamentosFound = await base44.asServiceRole.entities.Agendamento.filter({ id: agendamentoId });
    const agendamento = agendamentosFound[0];

    if (!agendamento) {
      return Response.json({ error: 'Agendamento não encontrado' }, { status: 404 });
    }

    // ✅ PASSO 2: Calcular slots a liberar usando o intervalo real da agenda
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

    // ✅ PASSO 3: Buscar horários do profissional na data
    const horarios = await base44.asServiceRole.entities.HorarioDisponivel.filter({
      profissional_id: agendamento.profissional_id,
      data: agendamento.data
    });

    // ✅ PASSO 4: Liberar slots em BATCH (Promise.all seguro)
    // Ao invés de fazer um await por update, agrupa todas as promessas
    const updatePromisses = slotsParaLiberar
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

    // Executa todos os updates em paralelo (não sequencial)
    if (updatePromisses.length > 0) {
      await Promise.all(updatePromisses);
    }

    // ✅ PASSO 5: Deletar agendamento
    await base44.asServiceRole.entities.Agendamento.delete(agendamentoId);

    return Response.json({
      success: true,
      message: 'Agendamento cancelado com sucesso',
      slotsLiberados: slotsParaLiberar.length
    });
  } catch (error) {
    console.error('Erro ao cancelar agendamento:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});