import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Verificar autenticação
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { cliente_id, cliente_telefone, formData } = await req.json();

    if (!cliente_id || !cliente_telefone) {
      return Response.json({ error: 'Dados do cliente obrigatórios' }, { status: 400 });
    }

    // Verificar se agendamentos pertencem ao cliente
    const agendamentosAbertos = await base44.asServiceRole.entities.Agendamento.filter({
      cliente_telefone,
      status: { $in: ['pendente', 'confirmado'] }
    });

    const totalAgendamentos = agendamentosAbertos.length + parseInt(formData.quantidade);
    if (totalAgendamentos > 12) {
      return Response.json({ 
        error: `Limite excedido. Você tem ${agendamentosAbertos.length} agendamentos abertos. Máximo: 12.` 
      }, { status: 400 });
    }

    // Buscar dados necessários
    const [profissionais, servicos] = await Promise.all([
      base44.asServiceRole.entities.Profissional.filter({ id: formData.profissional_id }),
      base44.asServiceRole.entities.Servico.filter({ id: formData.servico_id })
    ]);

    if (profissionais.length === 0 || servicos.length === 0) {
      return Response.json({ error: 'Profissional ou serviço não encontrado' }, { status: 404 });
    }

    const profissional = profissionais[0];
    const servico = servicos[0];

    // Calcular datas recorrentes
    const datas = [];
    const hoje = new Date();
    const diaSelecionado = parseInt(formData.dia_semana);
    let dataAtual = new Date(hoje);
    
    while (dataAtual.getDay() !== diaSelecionado) {
      dataAtual.setDate(dataAtual.getDate() + 1);
    }

    for (let i = 0; i < parseInt(formData.quantidade); i++) {
      datas.push(new Date(dataAtual));
      
      if (formData.frequencia === 'semanal') {
        dataAtual.setDate(dataAtual.getDate() + 7);
      } else if (formData.frequencia === 'quinzenal') {
        dataAtual.setDate(dataAtual.getDate() + 14);
      } else if (formData.frequencia === 'mensal') {
        dataAtual.setMonth(dataAtual.getMonth() + 1);
      }
    }

    // Calcular horário fim
    const [hora, min] = formData.horario.split(':').map(Number);
    const inicioMinutos = hora * 60 + min;
    const fimMinutos = inicioMinutos + servico.duracao;
    const horaFim = Math.floor(fimMinutos / 60).toString().padStart(2, '0');
    const minFim = (fimMinutos % 60).toString().padStart(2, '0');
    const horarioFim = `${horaFim}:${minFim}`;

    // ID único para série recorrente
    const recorrenteId = `recorrente_${Date.now()}_${cliente_id}`;

    // Criar agendamentos
    const agendamentosCriados = [];
    for (const data of datas) {
      const dataStr = data.toISOString().split('T')[0];

      // Verificar conflito de horário para esta data
      const agendamentosExistentes = await base44.asServiceRole.entities.Agendamento.filter({
        profissional_id: formData.profissional_id,
        data: dataStr,
        status: { $in: ['pendente', 'confirmado'] }
      });

      const temConflito = agendamentosExistentes.some(ag => {
        const [agHora, agMin] = ag.horario.split(':').map(Number);
        const agInicio = agHora * 60 + agMin;
        const agFim = agInicio + (ag.duracao_total || 30);
        return (inicioMinutos >= agInicio && inicioMinutos < agFim) ||
               (fimMinutos > agInicio && fimMinutos <= agFim) ||
               (inicioMinutos <= agInicio && fimMinutos >= agFim);
      });

      if (temConflito) {
        return Response.json({
          error: `Conflito de horário em ${dataStr} às ${formData.horario}. O profissional já possui um agendamento neste horário.`
        }, { status: 400 });
      }

      const agendamento = await base44.asServiceRole.entities.Agendamento.create({
        cliente_nome: formData.cliente_nome,
        cliente_telefone: cliente_telefone,
        profissional_id: formData.profissional_id,
        profissional_nome: profissional.nome,
        servico: servico.nome,
        data: dataStr,
        horario: formData.horario,
        horario_fim: horarioFim,
        duracao_total: servico.duracao,
        observacoes: formData.observacoes,
        status: 'confirmado',
        eh_recorrente: true,
        agendamento_recorrente_id: recorrenteId,
      });

      agendamentosCriados.push(agendamento);

      // Bloquear horários
      const horarios = await base44.asServiceRole.entities.HorarioDisponivel.filter({
        profissional_id: formData.profissional_id,
        data: dataStr,
      });

      let minutoAtual = inicioMinutos;
      while (minutoAtual < fimMinutos) {
        const h = Math.floor(minutoAtual / 60).toString().padStart(2, '0');
        const m = (minutoAtual % 60).toString().padStart(2, '0');
        const slot = `${h}:${m}`;
        
        const horarioObj = horarios.find(h => h.horario === slot);
        if (horarioObj) {
          await base44.asServiceRole.entities.HorarioDisponivel.update(horarioObj.id, {
            disponivel: false
          });
        }
        
        minutoAtual += 30;
      }
    }

    return Response.json({
      success: true,
      quantidade: agendamentosCriados.length
    });
  } catch (error) {
    return Response.json({ error: 'Erro ao criar agendamentos' }, { status: 500 });
  }
});