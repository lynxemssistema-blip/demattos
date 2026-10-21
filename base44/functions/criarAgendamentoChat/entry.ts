import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // SEGURANÇA: Verificar autenticação primeiro
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    let body = {};
    try { body = await req.json(); } catch { return Response.json({ error: 'JSON inválido' }, { status: 400 }); }
    const { cliente_id, profissional_nome, servico_nome, data, horario, observacoes } = body;

    if (!cliente_id || !profissional_nome || !servico_nome || !data || !horario) {
      return Response.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    // Validar formato
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      return Response.json({ error: 'Data inválida' }, { status: 400 });
    }

    if (!/^\d{2}:\d{2}$/.test(horario)) {
      return Response.json({ error: 'Horário inválido' }, { status: 400 });
    }

    // SEGURANÇA: Buscar cliente e verificar ownership
    const clientes = await base44.asServiceRole.entities.Cliente.filter({ 
      id: cliente_id,
      email: user.email 
    });
    
    if (clientes.length === 0) {
      return Response.json({ error: 'Sem permissão para criar agendamento para este cliente' }, { status: 403 });
    }

    const cliente = clientes[0];

    // Buscar profissional usando função pública (sem expor senhas)
    const profsResponse = await base44.functions.invoke('getProfissionaisPublicos', {});
    if (!profsResponse.data.success) {
      return Response.json({ error: 'Erro ao buscar profissionais' }, { status: 500 });
    }

    const profissionais = profsResponse.data.profissionais;
    let profissional = profissionais.find(p => 
      p.nome.toLowerCase().trim() === profissional_nome.toLowerCase().trim()
    );

    if (!profissional) {
      return Response.json({ 
        error: `Profissional não encontrado: "${profissional_nome}"` 
      }, { status: 404 });
    }

    // Buscar serviço usando função pública
    const servsResponse = await base44.functions.invoke('getServicosPublicos', {});
    if (!servsResponse.data.success) {
      return Response.json({ error: 'Erro ao buscar serviços' }, { status: 500 });
    }

    const servicos = servsResponse.data.servicos;
    const servico = servicos.find(s => 
      s.nome.toLowerCase().trim() === servico_nome.toLowerCase().trim()
    );

    if (!servico) {
      return Response.json({ 
        error: `Serviço não encontrado: "${servico_nome}"` 
      }, { status: 404 });
    }

    // Calcular horário fim
    const [hora, min] = horario.split(':').map(Number);
    const inicioMinutos = hora * 60 + min;
    const fimMinutos = inicioMinutos + (servico.duracao || 30);
    const horaFim = Math.floor(fimMinutos / 60).toString().padStart(2, '0');
    const minFim = (fimMinutos % 60).toString().padStart(2, '0');
    const horarioFim = `${horaFim}:${minFim}`;

    // Verificar conflitos
    const agendamentosExistentes = await base44.asServiceRole.entities.Agendamento.filter({
      profissional_id: profissional.id,
      data,
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
      return Response.json({ error: 'Horário ocupado' }, { status: 400 });
    }

    // Criar agendamento
    const agendamento = await base44.asServiceRole.entities.Agendamento.create({
      cliente_nome: cliente.nome,
      cliente_telefone: cliente.telefone,
      profissional_id: profissional.id,
      profissional_nome: profissional.nome,
      servico: servico.nome,
      data,
      horario,
      horario_fim: horarioFim,
      duracao_total: servico.duracao || 30,
      observacoes: observacoes || '',
      status: 'pendente'
    });

    // Sincronizar HorarioDisponivel: marcar slots ocupados
    const configAgenda = await base44.asServiceRole.entities.ConfigAgendaProfissional.filter({
      profissional_id: profissional.id
    });
    const intervalo = configAgenda[0]?.intervalo_minutos || 30;

    const horariosDodia = await base44.asServiceRole.entities.HorarioDisponivel.filter({
      profissional_id: profissional.id,
      data
    });

    const slotsOcupados = [];
    let minutoAtual = inicioMinutos;
    while (minutoAtual < fimMinutos) {
      const h = Math.floor(minutoAtual / 60).toString().padStart(2, '0');
      const m = (minutoAtual % 60).toString().padStart(2, '0');
      slotsOcupados.push(`${h}:${m}`);
      minutoAtual += intervalo;
    }

    const updatePromises = slotsOcupados
      .map(slot => {
        const horarioObj = horariosDodia.find(h => h.horario === slot);
        return horarioObj
          ? base44.asServiceRole.entities.HorarioDisponivel.update(horarioObj.id, { disponivel: false })
          : null;
      })
      .filter(Boolean);

    if (updatePromises.length > 0) await Promise.all(updatePromises);

    return Response.json({ success: true, agendamento });
  } catch (error) {
    console.error('Erro ao criar agendamento via chat:', error);
    return Response.json({ error: 'Erro ao criar agendamento' }, { status: 500 });
  }
});