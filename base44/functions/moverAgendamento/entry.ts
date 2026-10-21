import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { agendamento_id, nova_data, novo_horario } = await req.json();

    if (!agendamento_id || !nova_data || !novo_horario) {
      return Response.json({ 
        error: 'agendamento_id, nova_data e novo_horario são obrigatórios' 
      }, { status: 400 });
    }

    // Buscar o agendamento
    const agendamentosFound = await base44.asServiceRole.entities.Agendamento.filter({ id: agendamento_id });
    const agendamento = agendamentosFound[0];

    if (!agendamento) {
      return Response.json({ error: 'Agendamento não encontrado' }, { status: 404 });
    }

    // Verificar permissões
    const profissionaisFound = await base44.asServiceRole.entities.Profissional.filter({ id: agendamento.profissional_id });
    const profissional = profissionaisFound[0];
    
    const isAdmin = user.role === 'admin';
    const isProprioProfissional = profissional && profissional.email === user.email;

    if (!isAdmin && !isProprioProfissional) {
      return Response.json({ 
        error: 'Acesso negado. Apenas admin ou o próprio profissional podem mover agendamentos.' 
      }, { status: 403 });
    }

    // Calcular duração do agendamento
    const duracao = agendamento.duracao_total || 30;
    
    // Calcular horário de fim
    const [novaHora, novoMin] = novo_horario.split(':').map(Number);
    const novoInicioMinutos = novaHora * 60 + novoMin;
    const novoFimMinutos = novoInicioMinutos + duracao;
    const novaHoraFim = Math.floor(novoFimMinutos / 60).toString().padStart(2, '0');
    const novoMinFim = (novoFimMinutos % 60).toString().padStart(2, '0');
    const novo_horario_fim = `${novaHoraFim}:${novoMinFim}`;

    // Verificar se os novos slots estão disponíveis
    const novosSlotsNecessarios = [];
    let minutoAtual = novoInicioMinutos;
    while (minutoAtual < novoFimMinutos) {
      const h = Math.floor(minutoAtual / 60).toString().padStart(2, '0');
      const m = (minutoAtual % 60).toString().padStart(2, '0');
      novosSlotsNecessarios.push(`${h}:${m}`);
      minutoAtual += 30;
    }

    const horariosNovaData = await base44.asServiceRole.entities.HorarioDisponivel.filter({
      profissional_id: agendamento.profissional_id,
      data: nova_data
    });

    for (const slot of novosSlotsNecessarios) {
      const horarioObj = horariosNovaData.find(h => h.horario === slot);
      if (horarioObj && !horarioObj.disponivel) {
        return Response.json({ 
          error: `O horário ${slot} não está disponível` 
        }, { status: 400 });
      }
    }

    // Verificar se não há conflito com outros agendamentos
    const agendamentosNovaData = await base44.asServiceRole.entities.Agendamento.filter({
      profissional_id: agendamento.profissional_id,
      data: nova_data
    });

    for (const outroAg of agendamentosNovaData) {
      if (outroAg.id === agendamento_id) continue;
      if (outroAg.status === 'cancelado') continue;

      const [outroHora, outroMin] = outroAg.horario.split(':').map(Number);
      const outroInicio = outroHora * 60 + outroMin;
      const outroFim = outroInicio + (outroAg.duracao_total || 30);

      const temSobreposicao = (novoInicioMinutos < outroFim) && (novoFimMinutos > outroInicio);
      if (temSobreposicao) {
        return Response.json({ 
          error: `Conflito com agendamento existente às ${outroAg.horario}` 
        }, { status: 400 });
      }
    }

    // Liberar os slots antigos
    const [antigaHora, antigaMin] = agendamento.horario.split(':').map(Number);
    const antigoInicioMinutos = antigaHora * 60 + antigaMin;
    const antigoFimMinutos = antigoInicioMinutos + duracao;
    
    const antigosSlots = [];
    let minAntigoAtual = antigoInicioMinutos;
    while (minAntigoAtual < antigoFimMinutos) {
      const h = Math.floor(minAntigoAtual / 60).toString().padStart(2, '0');
      const m = (minAntigoAtual % 60).toString().padStart(2, '0');
      antigosSlots.push(`${h}:${m}`);
      minAntigoAtual += 30;
    }

    const horariosAntigaData = await base44.asServiceRole.entities.HorarioDisponivel.filter({
      profissional_id: agendamento.profissional_id,
      data: agendamento.data
    });

    // Liberar horários antigos
    for (const slot of antigosSlots) {
      const horarioObj = horariosAntigaData.find(h => h.horario === slot);
      if (horarioObj) {
        await base44.asServiceRole.entities.HorarioDisponivel.update(horarioObj.id, {
          disponivel: true
        });
      }
    }

    // Ocupar os novos horários
    for (const slot of novosSlotsNecessarios) {
      const horarioObj = horariosNovaData.find(h => h.horario === slot);
      if (horarioObj) {
        await base44.asServiceRole.entities.HorarioDisponivel.update(horarioObj.id, {
          disponivel: false
        });
      }
    }

    // Atualizar o agendamento
    await base44.asServiceRole.entities.Agendamento.update(agendamento_id, {
      data: nova_data,
      horario: novo_horario,
      horario_fim: novo_horario_fim
    });

    return Response.json({
      success: true,
      message: 'Agendamento movido com sucesso',
      agendamento: {
        id: agendamento_id,
        data: nova_data,
        horario: novo_horario,
        horario_fim: novo_horario_fim
      }
    });

  } catch (error) {
    console.error('Erro ao mover agendamento:', error);
    return Response.json({ 
      error: 'Erro ao mover agendamento',
      details: error.message 
    }, { status: 500 });
  }
});