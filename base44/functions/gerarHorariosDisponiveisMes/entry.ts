import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado. Apenas administradores.' }, { status: 403 });
    }

    const { profissional_id, ano, mes } = await req.json();

    if (!profissional_id || !ano || !mes) {
      return Response.json({ error: 'Parâmetros obrigatórios: profissional_id, ano, mes' }, { status: 400 });
    }

    // Buscar configuração da agenda do profissional
    const configs = await base44.asServiceRole.entities.ConfigAgendaProfissional.filter({
      profissional_id: profissional_id
    });

    if (configs.length === 0) {
      return Response.json({ error: 'Configuração de agenda não encontrada para este profissional' }, { status: 404 });
    }

    const config = configs[0];
    
    // Buscar nome do profissional
    const profissional = await base44.asServiceRole.entities.Profissional.get(profissional_id);

    // Calcular primeiro e último dia do mês
    const primeiroDia = new Date(ano, mes - 1, 1);
    const ultimoDia = new Date(ano, mes, 0);

    const horariosParaCriar = [];

    // Iterar por cada dia do mês
    for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
      const dataAtual = new Date(ano, mes - 1, dia);
      const diaSemana = dataAtual.getDay();

      // Verificar se o profissional trabalha neste dia da semana
      if (!config.dias_semana.includes(diaSemana)) {
        continue;
      }

      const dataStr = dataAtual.toISOString().split('T')[0];

      // Calcular horários do dia
      const [horaInicio, minInicio] = config.horario_inicio.split(':').map(Number);
      const [horaFim, minFim] = config.horario_fim.split(':').map(Number);

      let horaAtual = horaInicio * 60 + minInicio;
      const horaFinal = horaFim * 60 + minFim;

      // Calcular minutos de almoço (se configurado)
      let almocoInicio = null;
      let almocoFim = null;
      if (config.horario_almoco_inicio && config.horario_almoco_fim) {
        const [horaAlmocoIni, minAlmocoIni] = config.horario_almoco_inicio.split(':').map(Number);
        const [horaAlmocoFim, minAlmocoFim] = config.horario_almoco_fim.split(':').map(Number);
        almocoInicio = horaAlmocoIni * 60 + minAlmocoIni;
        almocoFim = horaAlmocoFim * 60 + minAlmocoFim;
      }

      while (horaAtual < horaFinal) {
        const horas = Math.floor(horaAtual / 60).toString().padStart(2, '0');
        const minutos = (horaAtual % 60).toString().padStart(2, '0');

        // Pular horários de almoço/intervalo
        const dentroDoAlmoco = almocoInicio !== null && horaAtual >= almocoInicio && horaAtual < almocoFim;

        if (!dentroDoAlmoco) {
          horariosParaCriar.push({
            profissional_id: profissional_id,
            profissional_nome: profissional.nome,
            data: dataStr,
            horario: `${horas}:${minutos}`,
            disponivel: true
          });
        }

        horaAtual += config.intervalo_minutos;
      }
    }

    // Criar horários em lote
    if (horariosParaCriar.length > 0) {
      await base44.asServiceRole.entities.HorarioDisponivel.bulkCreate(horariosParaCriar);
    }

    return Response.json({
      success: true,
      total_horarios_criados: horariosParaCriar.length,
      profissional: profissional.nome,
      mes: mes,
      ano: ano
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});