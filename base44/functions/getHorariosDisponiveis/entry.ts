import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { profissional_id, data } = await req.json();

    if (!profissional_id || !data) {
      return Response.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    // Buscar agendamentos, horários e config em paralelo
    const [agendamentosExistentes, horariosIniciais, configs] = await Promise.all([
      base44.asServiceRole.entities.Agendamento.filter({
        profissional_id,
        data,
        status: { $in: ['pendente', 'confirmado'] }
      }),
      base44.asServiceRole.entities.HorarioDisponivel.filter({ profissional_id, data }),
      base44.asServiceRole.entities.ConfigAgendaProfissional.filter({ profissional_id })
    ]);

    let horarios = horariosIniciais;

    // Se não existem horários, gerar automaticamente
    if (horarios.length === 0 && configs.length > 0) {
      const config = configs[0];
      const dataSelecionada = new Date(data + 'T00:00:00');
      const diaSemana = dataSelecionada.getDay();

      if (config.dias_semana && config.dias_semana.includes(diaSemana)) {
        const profissionais = await base44.asServiceRole.entities.Profissional.filter({ id: profissional_id });
        const profissional = profissionais[0];

        if (profissional && config.horario_inicio && config.horario_fim) {
          const [horaInicio, minInicio] = config.horario_inicio.split(':').map(Number);
          const [horaFim, minFim] = config.horario_fim.split(':').map(Number);

          let horaAtual = horaInicio * 60 + minInicio;
          const horaFinal = horaFim * 60 + minFim;

          let almocoInicio = null;
          let almocoFim = null;
          if (config.horario_almoco_inicio && config.horario_almoco_fim) {
            const [horaAlmocoIni, minAlmocoIni] = config.horario_almoco_inicio.split(':').map(Number);
            const [horaAlmocoFim, minAlmocoFim] = config.horario_almoco_fim.split(':').map(Number);
            almocoInicio = horaAlmocoIni * 60 + minAlmocoIni;
            almocoFim = horaAlmocoFim * 60 + minAlmocoFim;
          }

          const novosHorarios = [];
          while (horaAtual < horaFinal) {
            const horas = Math.floor(horaAtual / 60).toString().padStart(2, '0');
            const minutos = (horaAtual % 60).toString().padStart(2, '0');

            const dentroDoAlmoco = almocoInicio !== null && horaAtual >= almocoInicio && horaAtual < almocoFim;

            if (!dentroDoAlmoco) {
              novosHorarios.push({
                profissional_id,
                profissional_nome: profissional.nome,
                data,
                horario: `${horas}:${minutos}`,
                disponivel: true
              });
            }

            horaAtual += config.intervalo_minutos || 30;
          }

          if (novosHorarios.length > 0) {
            await base44.asServiceRole.entities.HorarioDisponivel.bulkCreate(novosHorarios);
            horarios = novosHorarios;
          }
        }
      }
    }

    // Usar configs já buscados (sem segundo roundtrip)
    let almocoInicio = null;
    let almocoFim = null;
    if (configs.length > 0 && configs[0].horario_almoco_inicio && configs[0].horario_almoco_fim) {
      const [horaAlmocoIni, minAlmocoIni] = configs[0].horario_almoco_inicio.split(':').map(Number);
      const [horaAlmocoFim, minAlmocoFim] = configs[0].horario_almoco_fim.split(':').map(Number);
      almocoInicio = horaAlmocoIni * 60 + minAlmocoIni;
      almocoFim = horaAlmocoFim * 60 + minAlmocoFim;
    }

    // Filtrar horários livres (sem conflito com agendamentos ou almoço)
    const horariosLivres = horarios.filter(h => {
      const [hHora, hMin] = h.horario.split(':').map(Number);
      const hMinutos = hHora * 60 + hMin;

      // Bloquear se estiver dentro do horário de almoço
      if (almocoInicio !== null && hMinutos >= almocoInicio && hMinutos < almocoFim) {
        return false;
      }

      const conflito = agendamentosExistentes.some(ag => {
        const [agHora, agMin] = ag.horario.split(':').map(Number);
        const agInicio = agHora * 60 + agMin;
        const agFim = agInicio + (ag.duracao_total || 30);

        return hMinutos >= agInicio && hMinutos < agFim;
      });

      return !conflito;
    });

    return Response.json({
      success: true,
      horarios: horariosLivres
    });
  } catch (error) {
    return Response.json({ error: 'Erro ao buscar horários' }, { status: 500 });
  }
});