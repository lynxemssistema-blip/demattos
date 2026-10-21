import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { profissional_id, data } = await req.json();

    if (!profissional_id || !data) {
      return Response.json({ 
        error: 'profissional_id e data são obrigatórios' 
      }, { status: 400 });
    }

    const isAdmin = user.role === 'admin';

    // Buscar dados em paralelo
    const [profissionais, configs, horariosDisponiveis, agendamentos] = await Promise.all([
      base44.asServiceRole.entities.Profissional.filter({ id: profissional_id }),
      base44.asServiceRole.entities.ConfigAgendaProfissional.filter({ profissional_id }),
      base44.asServiceRole.entities.HorarioDisponivel.filter({ profissional_id, data }),
      base44.asServiceRole.entities.Agendamento.filter({ profissional_id, data })
    ]);

    const profissional = profissionais[0];
    
    if (!profissional) {
      return Response.json({ error: 'Profissional não encontrado' }, { status: 404 });
    }

    const isProprioProfissional = profissional.email === user.email;

    if (!isAdmin && !isProprioProfissional) {
      return Response.json({ 
        error: 'Acesso negado. Apenas admin ou o próprio profissional podem ver esta agenda.' 
      }, { status: 403 });
    }

    const config = configs[0] || {
      horario_inicio: '09:00',
      horario_fim: '18:00',
      intervalo_minutos: 30,
      horario_almoco_inicio: null,
      horario_almoco_fim: null
    };

    // Gerar todos os slots do dia baseado na configuração
    const [horaInicio, minInicio] = config.horario_inicio.split(':').map(Number);
    const [horaFim, minFim] = config.horario_fim.split(':').map(Number);
    const inicioMinutos = horaInicio * 60 + minInicio;
    const fimMinutos = horaFim * 60 + minFim;
    const intervalo = config.intervalo_minutos || 30;

    let almocoInicioMinutos = null;
    let almocoFimMinutos = null;
    if (config.horario_almoco_inicio && config.horario_almoco_fim) {
      const [hAlmocoIni, mAlmocoIni] = config.horario_almoco_inicio.split(':').map(Number);
      const [hAlmocoFim, mAlmocoFim] = config.horario_almoco_fim.split(':').map(Number);
      almocoInicioMinutos = hAlmocoIni * 60 + mAlmocoIni;
      almocoFimMinutos = hAlmocoFim * 60 + mAlmocoFim;
    }

    const slots = [];
    let minutoAtual = inicioMinutos;

    while (minutoAtual < fimMinutos) {
      const h = Math.floor(minutoAtual / 60).toString().padStart(2, '0');
      const m = (minutoAtual % 60).toString().padStart(2, '0');
      const horario = `${h}:${m}`;

      // Verificar se está no horário de almoço
      const isAlmoco = almocoInicioMinutos !== null && 
                      minutoAtual >= almocoInicioMinutos && 
                      minutoAtual < almocoFimMinutos;

      // Buscar agendamento neste horário
      const agendamento = agendamentos.find(ag => ag.horario === horario);

      // Buscar disponibilidade
      const horarioDisp = horariosDisponiveis.find(h => h.horario === horario);
      const disponivel = horarioDisp ? horarioDisp.disponivel : true;

      slots.push({
        horario,
        disponivel: disponivel && !isAlmoco,
        agendamento: agendamento ? {
          id: agendamento.id,
          cliente_nome: agendamento.cliente_nome,
          cliente_telefone: agendamento.cliente_telefone,
          servico: agendamento.servico,
          status: agendamento.status,
          confirmado_automaticamente: agendamento.confirmado_automaticamente,
          horario_fim: agendamento.horario_fim,
          observacoes: agendamento.observacoes
        } : null,
        isAlmoco
      });

      minutoAtual += intervalo;
    }

    return Response.json({
      success: true,
      profissional: {
        id: profissional.id,
        nome: profissional.nome
      },
      data,
      slots
    });

  } catch (error) {
    console.error('Erro ao buscar agenda diária:', error);
    return Response.json({ 
      error: 'Erro ao buscar agenda diária',
      details: error.message 
    }, { status: 500 });
  }
});