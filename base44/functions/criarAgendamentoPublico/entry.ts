import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Função para normalizar telefone: remove tudo exceto números
function normalizarTelefone(telefone) {
  if (!telefone) return '';
  return telefone.replace(/\D/g, '');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let body = {};
    try { body = await req.json(); } catch { return Response.json({ error: 'JSON inválido' }, { status: 400 }); }
    const { formData } = body;

    // ===== FASE 1: VALIDAR TODOS OS DADOS ANTES DE QUALQUER OPERAÇÃO NO BANCO =====

    // 1. Validar campos obrigatórios
    const camposObrigatorios = {
      name: 'Nome do cliente',
      phone: 'Telefone',
      email: 'Email',
      profissional_id: 'Profissional',
      data: 'Data',
      horario: 'Horário'
    };

    for (const [campo, descricao] of Object.entries(camposObrigatorios)) {
      if (!formData[campo]) {
        return Response.json({ error: `Campo obrigatório faltando: ${descricao}` }, { status: 400 });
      }
    }

    if (!formData.servicos_ids || formData.servicos_ids.length === 0) {
      return Response.json({ error: 'Por favor, selecione um serviço para prosseguir com o agendamento.' }, { status: 400 });
    }

    // 2. Validar telefone
    const telefoneNormalizado = normalizarTelefone(formData.phone);
    if (telefoneNormalizado.length < 10) {
      return Response.json({ error: 'O telefone informado é inválido. Por favor, verifique se possui pelo menos 10 dígitos.' }, { status: 400 });
    }

    // 3. Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      return Response.json({ error: 'O email informado é inválido. Por favor, verifique e tente novamente.' }, { status: 400 });
    }

    // 4. Validar formato da data - deve ser YYYY-MM-DD
    const dataRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dataRegex.test(formData.data)) {
      return Response.json({ error: 'A data informada está em um formato inválido. Por favor, selecione uma data válida.' }, { status: 400 });
    }

    // 5. Validar formato do horário - deve ser HH:MM
    const horarioRegex = /^\d{2}:\d{2}$/;
    if (!horarioRegex.test(formData.horario)) {
      return Response.json({ error: 'O horário informado está em um formato inválido. Por favor, selecione um horário válido.' }, { status: 400 });
    }

    // 6. Validar data não está no passado
    const dataSelecionada = new Date(formData.data);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    if (dataSelecionada < hoje) {
      return Response.json({ error: 'Não é possível agendar para datas no passado. Por favor, escolha uma data futura.' }, { status: 400 });
    }

    // 7. Buscar e validar profissional existe
    const profissionais = await base44.asServiceRole.entities.Profissional.filter({ 
      id: formData.profissional_id 
    });
    if (profissionais.length === 0) {
      return Response.json({ error: 'O profissional selecionado não foi encontrado em nossa base de dados. Por favor, selecione outro profissional.' }, { status: 404 });
    }
    const profissional = profissionais[0];

    // 8. Buscar e validar serviços existem
    const todosServicos = await base44.asServiceRole.entities.Servico.list();
    const servicosSelecionados = todosServicos.filter(s => formData.servicos_ids.includes(s.id));
    if (servicosSelecionados.length === 0) {
      return Response.json({ error: 'Os serviços selecionados não foram encontrados. Por favor, selecione novamente.' }, { status: 404 });
    }
    if (servicosSelecionados.length !== formData.servicos_ids.length) {
      return Response.json({ error: 'Um ou mais serviços selecionados não estão mais disponíveis. Por favor, revise sua seleção.' }, { status: 404 });
    }

    // 9. Calcular durações e horário fim
    // Usa duração real (sem arredondamento) para conflitos e slots.
    // O arredondamento só existe para reservar slots no grid do intervalo do profissional.
    const duracaoTotal = servicosSelecionados.reduce((total, s) => total + s.duracao, 0);

    // Buscar configuração do profissional antecipadamente (necessário para intervalo)
    const configsAgenda = await base44.asServiceRole.entities.ConfigAgendaProfissional.filter({
      profissional_id: formData.profissional_id
    });
    const intervalo = configsAgenda[0]?.intervalo_minutos || 30;
    const duracaoArredondada = Math.ceil(duracaoTotal / intervalo) * intervalo;

    const [hora, min] = formData.horario.split(':').map(Number);
    if (hora < 0 || hora > 23 || min < 0 || min > 59) {
      return Response.json({ error: 'Horário inválido' }, { status: 400 });
    }

    const inicioMinutos = hora * 60 + min;
    // fimMinutos usa duração REAL para detecção precisa de conflitos
    const fimMinutos = inicioMinutos + duracaoTotal;
    // fimMinutosSlots usa duração arredondada para bloquear o grid de horários
    const fimMinutosSlots = inicioMinutos + duracaoArredondada;
    const horaFim = Math.floor(fimMinutosSlots / 60).toString().padStart(2, '0');
    const minFim = (fimMinutosSlots % 60).toString().padStart(2, '0');
    const horarioFim = `${horaFim}:${minFim}`;

    // 10. Buscar cliente existente (para validação, ainda não criar)
    const clientesExistentes = await base44.asServiceRole.entities.Cliente.filter({
      telefone: telefoneNormalizado
    });

    // 11. Validar se o agendamento não inicia ou termina durante o horário de almoço
    // (configsAgenda já foi buscado no passo 9)
    if (configsAgenda.length > 0 && configsAgenda[0].horario_almoco_inicio && configsAgenda[0].horario_almoco_fim) {
      const [horaAlmocoIni, minAlmocoIni] = configsAgenda[0].horario_almoco_inicio.split(':').map(Number);
      const [horaAlmocoFim, minAlmocoFim] = configsAgenda[0].horario_almoco_fim.split(':').map(Number);
      const almocoInicio = horaAlmocoIni * 60 + minAlmocoIni;
      const almocoFim = horaAlmocoFim * 60 + minAlmocoFim;
      
      // Bloquear se o agendamento inicia, termina ou passa pelo horário de almoço
      const iniciaNoAlmoco = inicioMinutos >= almocoInicio && inicioMinutos < almocoFim;
      const terminaNoAlmoco = fimMinutos > almocoInicio && fimMinutos <= almocoFim;
      const passaPeloAlmoco = inicioMinutos < almocoInicio && fimMinutos > almocoFim;
      
      if (iniciaNoAlmoco || terminaNoAlmoco || passaPeloAlmoco) {
        return Response.json({ 
          error: `Este horário não está disponível pois coincide com o horário de almoço/intervalo do profissional (${configsAgenda[0].horario_almoco_inicio} - ${configsAgenda[0].horario_almoco_fim}). Por favor, escolha outro horário.` 
        }, { status: 400 });
      }
    }

    // 12. Verificar conflito de horário do profissional
    const agendamentosExistentes = await base44.asServiceRole.entities.Agendamento.filter({
      profissional_id: formData.profissional_id,
      data: formData.data,
      status: { $in: ['pendente', 'confirmado'] }
    });

    const temConflitoProfissional = agendamentosExistentes.some(ag => {
      const [agHora, agMin] = ag.horario.split(':').map(Number);
      const agInicio = agHora * 60 + agMin;
      const agFim = agInicio + (ag.duracao_total || 30);

      return (inicioMinutos >= agInicio && inicioMinutos < agFim) ||
             (fimMinutos > agInicio && fimMinutos <= agFim) ||
             (inicioMinutos <= agInicio && fimMinutos >= agFim);
    });

    if (temConflitoProfissional) {
      return Response.json({ 
        error: `O profissional ${profissional.nome} não está disponível neste horário. Por favor, escolha outro horário ou outro dia.` 
      }, { status: 400 });
    }

    // 13. Verificar se cliente já tem agendamento no mesmo dia/horário
    const agendamentosCliente = await base44.asServiceRole.entities.Agendamento.filter({
      cliente_telefone: telefoneNormalizado,
      data: formData.data,
      status: { $in: ['pendente', 'confirmado'] }
    });

    const temAgendamentoDuplicado = agendamentosCliente.some(ag => {
      const [agHora, agMin] = ag.horario.split(':').map(Number);
      const agInicio = agHora * 60 + agMin;
      const agFim = agInicio + (ag.duracao_total || 30);

      return (inicioMinutos >= agInicio && inicioMinutos < agFim) ||
             (fimMinutos > agInicio && fimMinutos <= agFim) ||
             (inicioMinutos <= agInicio && fimMinutos >= agFim);
    });

    if (temAgendamentoDuplicado) {
      return Response.json({ 
        error: `Você já possui um agendamento marcado para ${formData.data} às ${agendamentosCliente[0].horario}. Não é possível agendar dois serviços no mesmo horário. Por favor, escolha outra data ou horário.` 
      }, { status: 400 });
    }

    // ===== FASE 2: TODAS AS VALIDAÇÕES PASSARAM - AGORA SIM SALVAR NO BANCO =====

    // Verificar configuração de confirmação automática
    const configs = await base44.asServiceRole.entities.Configuracao.filter({
      chave: 'confirmacao_automatica_agendamento'
    });
    const confirmacaoAutomatica = configs.length > 0 && configs[0].valor === 'true';

    let clienteId = null;

    if (clientesExistentes.length > 0) {
      // Cliente existente - atualizar dados
      clienteId = clientesExistentes[0].id;
      await base44.asServiceRole.entities.Cliente.update(clienteId, {
        nome: formData.name,
        email: formData.email,
      });
    } else {
      // Novo cliente - criar com telefone normalizado
      const novoCliente = await base44.asServiceRole.entities.Cliente.create({
        nome: formData.name,
        telefone: telefoneNormalizado,
        email: formData.email,
        observacoes: formData.message,
        tem_canal: false,
        ai_credits: 0,
      });
      clienteId = novoCliente.id;
    }

    // Criar agendamento com status baseado na configuração
    const servicosNomes = servicosSelecionados.map(s => s.nome).join(', ');
    const agendamento = await base44.asServiceRole.entities.Agendamento.create({
      cliente_nome: formData.name,
      cliente_telefone: telefoneNormalizado,
      profissional_id: formData.profissional_id,
      profissional_nome: profissional.nome,
      servico: servicosNomes,
      data: formData.data,
      horario: formData.horario,
      horario_fim: horarioFim,
      duracao_total: duracaoArredondada,
      observacoes: formData.message,
      status: confirmacaoAutomatica ? 'confirmado' : 'pendente',
      confirmado_automaticamente: confirmacaoAutomatica
    });

    // Marcar slots como ocupados via Promise.all (paralelo)
    const todosHorarios = await base44.asServiceRole.entities.HorarioDisponivel.filter({
      profissional_id: formData.profissional_id,
      data: formData.data
    });

    const slotsOcupados = [];
    let minutoAtual = inicioMinutos;
    while (minutoAtual < fimMinutosSlots) {
      const h = Math.floor(minutoAtual / 60).toString().padStart(2, '0');
      const m = (minutoAtual % 60).toString().padStart(2, '0');
      slotsOcupados.push(`${h}:${m}`);
      minutoAtual += intervalo;
    }

    const updatePromises = slotsOcupados
      .map(slot => {
        const horarioObj = todosHorarios.find(h => h.horario === slot);
        return horarioObj
          ? base44.asServiceRole.entities.HorarioDisponivel.update(horarioObj.id, { disponivel: false })
          : null;
      })
      .filter(Boolean);

    if (updatePromises.length > 0) await Promise.all(updatePromises);

    return Response.json({ 
      success: true, 
      agendamento_id: agendamento.id,
      confirmado_automaticamente: confirmacaoAutomatica 
    });
  } catch (error) {
    console.error('Erro ao processar agendamento:', error?.message || error, error?.stack);
    return Response.json({ 
      error: 'Erro ao processar agendamento. Por favor, tente novamente.' 
    }, { status: 500 });
  }
});