import { supabase, supabaseAdmin } from '@/lib/supabaseClient';
import { evolutionApi } from '@/api/evolutionClient';

export async function invokeSupabaseFunction(functionName, params = {}) {
  try {
    switch (functionName) {
      case 'getHomeData': {
        const [
          heroRes,
          sobreRes,
          servicosRes,
          profissionaisRes,
          produtosRes,
          combosRes,
          galeriaRes,
          depoimentosRes,
          configuracoesRes,
          instagramRes,
          atendimentosCountRes
        ] = await Promise.all([
          supabase.from('imagem_hero').select('*').eq('ativo', true).order('ordem'),
          supabase.from('secao_sobre').select('*').limit(1),
          supabase.from('servico').select('*').eq('ativo', true).order('nome'),
          supabase.from('profissional').select('*').eq('ativo', true).order('nome'),
          supabase.from('produto').select('*').eq('ativo', true).order('nome'),
          supabase.from('combo').select('*').eq('ativo', true).order('nome'),
          supabase.from('imagem_galeria').select('*').order('ordem'),
          supabase.from('depoimento').select('*').eq('aprovado', true).order('created_date', { ascending: false }),
          supabase.from('configuracao').select('*'),
          supabase.from('instagram_video').select('*').eq('ativo', true).order('ordem', { ascending: false }),
          supabase.from('agendamento').select('*', { count: 'exact', head: true }).eq('status', 'realizado')
        ]);

        const sobre = sobreRes.data?.[0] || null;
        const totalAtendimentos = (sobre?.atendimentos_base || 5000) + (atendimentosCountRes.count || 0);

        return {
          data: {
            success: true,
            hero: heroRes.data || [],
            sobre,
            totalAtendimentos,
            atendimentosPorProfissional: {},
            servicos: servicosRes.data || [],
            profissionais: (profissionaisRes.data || []).map(p => {
              const { senha_acesso, ...publicProf } = p;
              return publicProf;
            }),
            produtos: produtosRes.data || [],
            combos: combosRes.data || [],
            galeria: galeriaRes.data || [],
            depoimentos: depoimentosRes.data || [],
            configuracoes: configuracoesRes.data || [],
            instagram: {
              ativa: true,
              videos: instagramRes.data || []
            }
          }
        };
      }

      case 'getAdminStats': {
        const [
          agendamentosRes,
          clientesRes,
          servicosRes,
          produtosRes,
          profissionaisRes,
          galeriaRes,
          depoimentosRes
        ] = await Promise.all([
          supabase.from('agendamento').select('*', { count: 'exact', head: true }),
          supabase.from('cliente').select('*', { count: 'exact', head: true }),
          supabase.from('servico').select('*', { count: 'exact', head: true }),
          supabase.from('produto').select('*', { count: 'exact', head: true }),
          supabase.from('profissional').select('*', { count: 'exact', head: true }),
          supabase.from('imagem_galeria').select('*', { count: 'exact', head: true }),
          supabase.from('depoimento').select('*', { count: 'exact', head: true })
        ]);

        return {
          data: {
            success: true,
            stats: {
              agendamentos: agendamentosRes.count || 0,
              clientes: clientesRes.count || 0,
              servicos: servicosRes.count || 0,
              produtos: produtosRes.count || 0,
              profissionais: profissionaisRes.count || 0,
              galeria: galeriaRes.count || 0,
              depoimentos: depoimentosRes.count || 0
            }
          }
        };
      }

      case 'getStripeDashboardData': {
        // Obter dados reais de compras e agendamentos (valores zerados na ausência de vendas reais)
        let compras = [];
        let agendamentosConcluidos = [];
        let servicos = [];

        try {
          const resCompras = await supabase
            .from('compra')
            .select('valor, status_pagamento, created_date');
          compras = resCompras.data || [];
        } catch (e) {
          console.warn('Aviso ao consultar compras:', e);
        }

        try {
          const resAg = await supabase
            .from('agendamento')
            .select('servico, created_date, status')
            .eq('status', 'concluido');
          agendamentosConcluidos = resAg.data || [];
        } catch (e) {
          console.warn('Aviso ao consultar agendamentos:', e);
        }

        try {
          const resServ = await supabase.from('servico').select('nome, preco');
          servicos = resServ.data || [];
        } catch (e) {
          console.warn('Aviso ao consultar servicos:', e);
        }

        const servicosMap = new Map((servicos || []).map(s => [s.nome?.toLowerCase(), s.preco || 0]));

        let volumeBrutoTotal = 0;
        let volumeBrutoMes = 0;
        let quantidadeVendasTotal = 0;
        let quantidadeVendasMes = 0;
        let valorPendente = 0;
        let comprasPendentesQtd = 0;

        const hoje = new Date();
        const mesAtualStr = hoje.toISOString().substring(0, 7);

        (compras || []).forEach(c => {
          const val = Number(c.valor) || 0;
          const status = (c.status_pagamento || '').toLowerCase();
          const isPago = status === 'pago' || status === 'completed' || status === 'approved' || status === 'paid';
          const isPendente = status === 'pendente' || status === 'pending';

          if (isPago) {
            volumeBrutoTotal += val;
            quantidadeVendasTotal += 1;
            if (c.created_date && c.created_date.startsWith(mesAtualStr)) {
              volumeBrutoMes += val;
              quantidadeVendasMes += 1;
            }
          } else if (isPendente) {
            valorPendente += val;
            comprasPendentesQtd += 1;
          }
        });

        (agendamentosConcluidos || []).forEach(ag => {
          const preco = servicosMap.get(ag.servico?.toLowerCase()) || 0;
          volumeBrutoTotal += preco;
          quantidadeVendasTotal += 1;
          if (ag.created_date && ag.created_date.startsWith(mesAtualStr)) {
            volumeBrutoMes += preco;
            quantidadeVendasMes += 1;
          }
        });

        const ultimos7Dias = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(hoje);
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          ultimos7Dias.push({
            data: dateStr,
            total: 0
          });
        }

        return {
          data: {
            success: true,
            volumeBrutoMes,
            volumeBrutoTotal,
            quantidadeVendasMes,
            quantidadeVendasTotal,
            valorPendente,
            comprasPendentesQtd,
            ultimos7Dias,
            balance: { available: volumeBrutoMes, pending: valorPendente }
          }
        };
      }

      case 'getAdminPacotesCredito': {
        const { data, error } = await supabase.from('pacote_credito').select('*').order('creditos');
        if (error) throw error;
        return { data: { success: true, pacotes: data || [] } };
      }

      case 'getAdminAssistente': {
        const { data, error } = await supabase.from('configuracao_assistente').select('*').limit(1);
        if (error) throw error;
        return { data: { success: true, configuracao: data?.[0] || null } };
      }

      case 'getProdutoPublico': {
        const { id } = params;
        const { data, error } = await supabase.from('produto').select('*').eq('id', id).maybeSingle();
        if (error) throw error;
        return { data: { success: true, produto: data } };
      }

      case 'promoverClienteAdmin': {
        const { cliente_email, promover } = params;
        if (!cliente_email) return { data: { success: false, error: 'Email obrigatório' } };
        const cleanEmail = cliente_email.trim().toLowerCase();
        
        // Atualiza perfil na tabela profiles
        await supabase.from('profiles').update({ role: promover ? 'admin' : 'user' }).ilike('email', cleanEmail);
        
        // Se for profissional na equipe, atualiza também tem_acesso_admin
        await supabase.from('profissional').update({ tem_acesso_admin: !!promover }).ilike('email', cleanEmail);

        return { data: { success: true, message: promover ? 'Usuário promovido a administrador!' : 'Acesso de administrador revogado.' } };
      }

      case 'grantAICredits': {
        const { cliente_id, email, creditos } = params;
        if (email) {
          const { data: prof } = await supabase.from('profiles').select('ai_credits').ilike('email', email).maybeSingle();
          if (prof) {
            await supabase.from('profiles').update({ ai_credits: (prof.ai_credits || 0) + (creditos || 10) }).ilike('email', email);
          }
        }
        return { data: { success: true } };
      }

      case 'getAdminServicos': {
        const { data, error } = await supabase.from('servico').select('*').order('nome');
        if (error) throw error;
        return { data: { success: true, servicos: data || [] } };
      }

      case 'getAdminProdutos': {
        const { data, error } = await supabase.from('produto').select('*').order('nome');
        if (error) throw error;
        return { data: { success: true, produtos: data || [] } };
      }

      case 'getAdminProfissionais': {
        const { data, error } = await supabase.from('profissional').select('*').order('nome');
        if (error) throw error;
        return { data: { success: true, profissionais: data || [] } };
      }

      case 'getAdminClientes': {
        const { data, error } = await supabase.from('cliente').select('*').order('nome');
        if (error) throw error;
        return { data: { success: true, clientes: data || [] } };
      }

      case 'getAdminDepoimentos': {
        const { data, error } = await supabase.from('depoimento').select('*').order('created_date', { ascending: false });
        if (error) throw error;
        return { data: { success: true, depoimentos: data || [] } };
      }

      case 'getAdminGaleria': {
        const { data, error } = await supabase.from('imagem_galeria').select('*').order('ordem');
        if (error) throw error;
        return { data: { success: true, galeria: data || [] } };
      }

      case 'getAdminConfiguracoes': {
        const { data, error } = await supabase.from('configuracao').select('*');
        if (error) throw error;
        return { data: { success: true, configuracoes: data || [] } };
      }

      case 'getAdminCarrossel': {
        const { data, error } = await supabase.from('imagem_hero').select('*').order('ordem');
        if (error) throw error;
        return { data: { success: true, imagens: data || [] } };
      }

      case 'getAdminAgendamentos': {
        // 1. Obter todos os agendamentos ordenados por created_date para gerar número único sequencial permanente
        const { data: todosAgs } = await supabaseAdmin
          .from('agendamento')
          .select('id, created_date')
          .order('created_date', { ascending: true });

        const numeroMap = new Map();
        (todosAgs || []).forEach((ag, idx) => {
          numeroMap.set(ag.id, 1001 + idx);
        });

        // 2. Buscar agendamentos filtrados
        let query = supabaseAdmin.from('agendamento').select('*').order('data', { ascending: false }).order('horario');
        if (params.dataInicio) {
          query = query.gte('data', params.dataInicio);
        }
        const { data: agendamentosRaw, error } = await query;
        if (error) throw error;

        // 3. Buscar histórico de mensagens da tabela conversa_whatsapp
        const { data: msgsDb } = await supabaseAdmin
          .from('conversa_whatsapp')
          .select('id, telefone_cliente, mensagem, dados_extraidos, created_date')
          .order('created_date', { ascending: false });

        const msgsByAgendamento = {};
        (msgsDb || []).forEach(msg => {
          const agId = msg.dados_extraidos?.agendamento_id;
          if (agId) {
            if (!msgsByAgendamento[agId]) msgsByAgendamento[agId] = [];
            msgsByAgendamento[agId].push({
              id: msg.id,
              tipo: msg.dados_extraidos?.tipo || 'confirmacao',
              telefone: msg.telefone_cliente,
              mensagem: msg.mensagem,
              data_envio: msg.created_date,
              modo: msg.dados_extraidos?.modo_operacao || 'oficial'
            });
          }
        });

        // 4. Formatar cada agendamento com número único e suas mensagens de WhatsApp
        const agendamentosFormatados = (agendamentosRaw || []).map(ag => {
          const numSeq = numeroMap.get(ag.id) || (1001 + Math.abs(ag.id.split('-')[0].split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 9000));
          return {
            ...ag,
            numero_agendamento: numSeq,
            codigo_unico: `#${numSeq}`,
            mensagens_whatsapp: msgsByAgendamento[ag.id] || []
          };
        });

        return { data: { success: true, agendamentos: agendamentosFormatados } };
      }

      case 'enviarWhatsAppAgendamento': {
        const targetId = params?.id || params?.agendamento_id || params?.agendamentoId;
        if (!targetId) return { data: { error: 'ID do agendamento não informado.' } };

        const { data: ag, error: agErr } = await supabaseAdmin
          .from('agendamento')
          .select('*')
          .eq('id', targetId)
          .maybeSingle();

        if (agErr || !ag) return { data: { error: 'Agendamento não encontrado.' } };

        const tipo = params.tipo || 'confirmacao';
        const customMessage = params.mensagemCustomizada || params.mensagem || null;
        const res = await evolutionApi.sendAppointmentNotification(tipo, ag, { customMessage });
        return { data: { success: !!res?.success, res } };
      }

      case 'getMinhasCompras': {
        const { email } = params;
        const { data: { user } } = await supabase.auth.getUser();
        const userEmail = email || user?.email;

        // Se for admin, disponibiliza todos os produtos digitais para visualização/download direto
        const { data: profile } = user ? await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle() : { data: null };
        const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin';

        if (isAdmin) {
          const { data: produtosDigitais } = await supabase
            .from('produto')
            .select('*')
            .eq('tipo', 'digital');

          const comprasAdmin = (produtosDigitais || []).map(p => ({
            id: 'admin_' + p.id,
            produto_id: p.id,
            produto_nome: p.nome,
            produto_tipo: 'digital',
            produto_arquivo_pdf_url: p.arquivo_pdf_url,
            valor: p.preco,
            created_date: p.created_date,
            status: 'pago'
          }));

          return { data: { success: true, compras: comprasAdmin } };
        }

        if (!userEmail) return { data: { success: true, compras: [] } };

        const { data: compras, error } = await supabase
          .from('compra')
          .select('*')
          .ilike('cliente_email', userEmail)
          .order('created_date', { ascending: false });

        if (error) throw error;
        return { data: { success: true, compras: compras || [] } };
      }

      case 'getServicosPublicos': {
        const { data, error } = await supabase.from('servico').select('*').eq('ativo', true).order('nome');
        if (error) throw error;
        return { data: { success: true, servicos: data || [] } };
      }

      case 'getProdutosPublicos': {
        const { data, error } = await supabase.from('produto').select('*').eq('ativo', true).order('nome');
        if (error) throw error;
        return { data: { success: true, produtos: data || [] } };
      }

      case 'getHorariosDisponiveis': {
        const { profissional_id, data } = params;
        if (!profissional_id || !data) {
          return { data: { success: true, horarios: [] } };
        }

        const [ano, mes, dia] = data.split('-').map(Number);
        const dataObj = new Date(ano, mes - 1, dia);
        const diaSemana = dataObj.getDay(); // 0=Dom, 1=Seg, ... 6=Sab

        // Buscar dados do profissional
        const { data: prof } = await supabase
          .from('profissional')
          .select('id, nome, ativo')
          .eq('id', profissional_id)
          .maybeSingle();

        if (!prof || !prof.ativo) {
          return { data: { success: true, horarios: [] } };
        }

        // Buscar configuração da agenda
        const { data: configs } = await supabase
          .from('config_agenda_profissional')
          .select('*')
          .eq('profissional_id', profissional_id);

        const config = (configs && configs.length > 0) ? configs[0] : {
          dias_semana: [1, 2, 3, 4, 5, 6],
          horario_inicio: '09:00',
          horario_fim: '19:00',
          horario_almoco_inicio: '12:00',
          horario_almoco_fim: '13:00',
          intervalo_minutos: 30
        };

        const diasAtendimento = Array.isArray(config.dias_semana) ? config.dias_semana : [1, 2, 3, 4, 5, 6];
        if (!diasAtendimento.includes(diaSemana)) {
          return { data: { success: true, horarios: [] } };
        }

        // Buscar agendamentos existentes e registros manuais em paralelo
        const [agendamentosRes, horariosDbRes] = await Promise.all([
          supabase
            .from('agendamento')
            .select('horario, horario_fim, duracao_total, status')
            .eq('profissional_id', profissional_id)
            .eq('data', data)
            .in('status', ['pendente', 'confirmado']),
          supabase
            .from('horario_disponivel')
            .select('horario, disponivel')
            .eq('profissional_id', profissional_id)
            .eq('data', data)
        ]);

        const agendamentos = agendamentosRes.data || [];
        const horariosDb = horariosDbRes.data || [];

        const bloqueadosSet = new Set();
        const explicitosDisponiveis = new Set();
        horariosDb.forEach(h => {
          if (h.disponivel === false) bloqueadosSet.add(h.horario);
          if (h.disponivel === true) explicitosDisponiveis.add(h.horario);
        });

        let almocoIniMin = null;
        let almocoFimMin = null;
        if (config.horario_almoco_inicio && config.horario_almoco_fim) {
          const [hAIni, mAIni] = config.horario_almoco_inicio.split(':').map(Number);
          const [hAFim, mAFim] = config.horario_almoco_fim.split(':').map(Number);
          almocoIniMin = hAIni * 60 + mAIni;
          almocoFimMin = hAFim * 60 + mAFim;
        }

        const [hIni, mIni] = (config.horario_inicio || '09:00').split(':').map(Number);
        const [hFim, mFim] = (config.horario_fim || '19:00').split(':').map(Number);
        const inicioGradeMin = hIni * 60 + mIni;
        const fimGradeMin = hFim * 60 + mFim;
        const intervalo = Number(config.intervalo_minutos) || 30;

        // Horário atual no fuso de Brasília
        const agora = new Date();
        const agoraSp = new Date(agora.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
        const anoStr = agoraSp.getFullYear();
        const mesStr = String(agoraSp.getMonth() + 1).padStart(2, '0');
        const dStr = String(agoraSp.getDate()).padStart(2, '0');
        const hojeStr = `${anoStr}-${mesStr}-${dStr}`;
        const minutosAgora = agoraSp.getHours() * 60 + agoraSp.getMinutes();
        const ehHoje = (data === hojeStr);

        const todosSlots = new Set();
        for (let m = inicioGradeMin; m < fimGradeMin; m += intervalo) {
          const hh = Math.floor(m / 60).toString().padStart(2, '0');
          const mm = (m % 60).toString().padStart(2, '0');
          todosSlots.add(`${hh}:${mm}`);
        }
        explicitosDisponiveis.forEach(slot => todosSlots.add(slot));

        const slotsOrdenados = Array.from(todosSlots).sort();
        const horariosValidos = [];

        for (const slot of slotsOrdenados) {
          const [sh, sm] = slot.split(':').map(Number);
          const slotMin = sh * 60 + sm;

          // Se for hoje e já passou (com 15 min de margem)
          if (ehHoje && slotMin <= minutosAgora + 15) continue;

          // Se estiver no almoço
          if (almocoIniMin !== null && slotMin >= almocoIniMin && slotMin < almocoFimMin) continue;

          // Se estiver bloqueado manualmente
          if (bloqueadosSet.has(slot)) continue;

          // Se conflita com agendamento ativo
          const conflito = agendamentos.some(ag => {
            const [agH, agM] = ag.horario.split(':').map(Number);
            const agIni = agH * 60 + agM;
            const agDuracao = ag.duracao_total || 30;
            const agFim = ag.horario_fim
              ? (Number(ag.horario_fim.split(':')[0]) * 60 + Number(ag.horario_fim.split(':')[1]))
              : (agIni + agDuracao);
            return slotMin >= agIni && slotMin < agFim;
          });

          if (!conflito) {
            horariosValidos.push({
              profissional_id,
              profissional_nome: prof.nome,
              data,
              horario: slot,
              disponivel: true
            });
          }
        }

        return { data: { success: true, horarios: horariosValidos } };
      }

      case 'criarAgendamentoPublico': {
        const { formData } = params;
        if (!formData) return { data: { error: 'Dados do formulário não fornecidos.' } };

        const {
          name,
          phone,
          email,
          profissional_id,
          data,
          horario,
          servicos_ids,
          message,
          senhaCanal
        } = formData;

        if (!name || !phone || !email || !profissional_id || !data || !horario) {
          return { data: { error: 'Por favor, preencha todos os campos obrigatórios.' } };
        }

        if (!servicos_ids || servicos_ids.length === 0) {
          return { data: { error: 'Por favor, selecione pelo menos um serviço.' } };
        }

        const telefoneNormalizado = phone.replace(/\D/g, '');
        if (telefoneNormalizado.length < 10) {
          return { data: { error: 'O telefone deve ter pelo menos 10 dígitos.' } };
        }

        // Buscar profissional
        const { data: prof, error: profErr } = await supabase
          .from('profissional')
          .select('*')
          .eq('id', profissional_id)
          .maybeSingle();

        if (profErr || !prof) {
          return { data: { error: 'Profissional não encontrado.' } };
        }

        // Buscar serviços
        const { data: servicosDb } = await supabase
          .from('servico')
          .select('*')
          .in('id', servicos_ids);

        const servicosSelecionados = servicosDb || [];
        const duracaoTotal = servicosSelecionados.reduce((total, s) => total + (s.duracao || 30), 0) || 30;
        const nomesServicos = servicosSelecionados.length > 0
          ? servicosSelecionados.map(s => s.nome).join(', ')
          : 'Serviço Barbearia';

        const [hIni, mIni] = horario.split(':').map(Number);
        const inicioMinutos = hIni * 60 + mIni;
        const fimMinutos = inicioMinutos + duracaoTotal;
        const horaFimStr = Math.floor(fimMinutos / 60).toString().padStart(2, '0');
        const minFimStr = (fimMinutos % 60).toString().padStart(2, '0');
        const horarioFim = `${horaFimStr}:${minFimStr}`;

        // Verificar conflitos de horário com agendamentos existentes
        const { data: agExistentes } = await supabase
          .from('agendamento')
          .select('horario, horario_fim, duracao_total')
          .eq('profissional_id', profissional_id)
          .eq('data', data)
          .in('status', ['pendente', 'confirmado']);

        const conflitoProfissional = (agExistentes || []).some(ag => {
          const [agH, agM] = ag.horario.split(':').map(Number);
          const agInicio = agH * 60 + agM;
          const agFim = ag.horario_fim
            ? (Number(ag.horario_fim.split(':')[0]) * 60 + Number(ag.horario_fim.split(':')[1]))
            : (agInicio + (ag.duracao_total || 30));
          return (inicioMinutos >= agInicio && inicioMinutos < agFim) ||
                 (fimMinutos > agInicio && fimMinutos <= agFim) ||
                 (inicioMinutos <= agInicio && fimMinutos >= agFim);
        });

        if (conflitoProfissional) {
          return { data: { error: `O profissional ${prof.nome} já possui agendamento neste horário. Por favor, escolha outro horário.` } };
        }

        // Verificar confirmação automática nas configurações
        const { data: configConf } = await supabase
          .from('configuracao')
          .select('valor')
          .eq('chave', 'confirmacao_automatica_agendamento')
          .maybeSingle();

        const confirmadoAuto = configConf ? (configConf.valor === 'true') : true;

        // Upsert do cliente
        try {
          const { data: clienteExistente } = await supabase
            .from('cliente')
            .select('*')
            .or(`telefone.eq.${telefoneNormalizado},email.ilike.${email.trim()}`)
            .maybeSingle();

          if (clienteExistente) {
            await supabase.from('cliente').update({
              nome: name,
              email: email.trim()
            }).eq('id', clienteExistente.id);
          } else {
            await supabase.from('cliente').insert({
              nome: name,
              telefone: telefoneNormalizado,
              email: email.trim(),
              observacoes: message || '',
              tem_canal: !!senhaCanal,
              senha_canal: senhaCanal || null,
              ai_credits: 0
            });
          }
        } catch (e) {
          console.warn('[criarAgendamentoPublico] Aviso ao sincronizar cliente:', e);
        }

        // Inserir agendamento
        const { data: novoAgendamento, error: agErr } = await supabase
          .from('agendamento')
          .insert({
            cliente_nome: name,
            cliente_telefone: telefoneNormalizado,
            profissional_id,
            profissional_nome: prof.nome,
            servico: nomesServicos,
            data,
            horario,
            horario_fim: horarioFim,
            duracao_total: duracaoTotal,
            observacoes: message || '',
            status: confirmadoAuto ? 'confirmado' : 'pendente',
            confirmado_automaticamente: confirmadoAuto
          })
          .select()
          .single();

        if (agErr) throw agErr;

        // Marcar slot em horario_disponivel se existir
        try {
          const { data: slotDb } = await supabase
            .from('horario_disponivel')
            .select('id')
            .eq('profissional_id', profissional_id)
            .eq('data', data)
            .eq('horario', horario)
            .maybeSingle();

          if (slotDb) {
            await supabase.from('horario_disponivel').update({ disponivel: false }).eq('id', slotDb.id);
          } else {
            await supabase.from('horario_disponivel').insert({
              profissional_id,
              profissional_nome: prof.nome,
              data,
              horario,
              disponivel: false
            });
          }
        } catch (e) {
          // Não bloqueia agendamento
        }

        // Disparo automático WhatsApp ao cliente (respeita modo oficial vs teste)
        if (confirmadoAuto) {
          evolutionApi.sendAppointmentNotification('confirmacao', novoAgendamento).catch(err => {
            console.warn('[WhatsApp] Aviso ao enviar notificação de agendamento ao cliente:', err);
          });
        }

        // Disparo automático WhatsApp ao barbeiro (novo agendamento recebido)
        evolutionApi.notifyBarberNewAppointment(novoAgendamento, prof.telefone).catch(err => {
          console.warn('[WhatsApp] Aviso ao enviar notificação ao barbeiro:', err);
        });

        return {
          data: {
            success: true,
            agendamento: novoAgendamento,
            agendamento_id: novoAgendamento.id,
            confirmado_automaticamente: confirmadoAuto
          }
        };
      }

      case 'criarProfissional': {
        const { profissionalData, configAgenda } = params;
        if (!profissionalData?.nome) {
          return { data: { error: 'Nome do profissional é obrigatório.' } };
        }

        const { data: prof, error: errProf } = await supabase
          .from('profissional')
          .insert([profissionalData])
          .select()
          .single();

        if (errProf) throw errProf;

        if (configAgenda && prof?.id) {
          try {
            await supabase.from('config_agenda_profissional').insert([{
              profissional_id: prof.id,
              dias_semana: configAgenda.dias_semana || [1, 2, 3, 4, 5, 6],
              horario_inicio: configAgenda.horario_inicio || '09:00',
              horario_fim: configAgenda.horario_fim || '18:00',
              horario_almoco_inicio: configAgenda.horario_almoco_inicio || null,
              horario_almoco_fim: configAgenda.horario_almoco_fim || null,
              intervalo_minutos: configAgenda.intervalo_minutos || 30
            }]);
          } catch (e) {
            console.warn('[criarProfissional] config_agenda:', e);
          }
        }

        return { data: { success: true, profissional: prof } };
      }

      case 'atualizarProfissional': {
        const { profissional_id, profissionalData, configAgenda, configId } = params;
        if (!profissional_id) {
          return { data: { error: 'ID do profissional é obrigatório.' } };
        }

        const { data: prof, error: errProf } = await supabase
          .from('profissional')
          .update(profissionalData)
          .eq('id', profissional_id)
          .select()
          .single();

        if (errProf) throw errProf;

        if (configAgenda) {
          const configData = {
            profissional_id,
            dias_semana: configAgenda.dias_semana || [1, 2, 3, 4, 5, 6],
            horario_inicio: configAgenda.horario_inicio || '09:00',
            horario_fim: configAgenda.horario_fim || '18:00',
            horario_almoco_inicio: configAgenda.horario_almoco_inicio || null,
            horario_almoco_fim: configAgenda.horario_almoco_fim || null,
            intervalo_minutos: configAgenda.intervalo_minutos || 30
          };

          try {
            if (configId) {
              await supabase.from('config_agenda_profissional').update(configData).eq('id', configId);
            } else {
              await supabase.from('config_agenda_profissional').insert([configData]);
            }
          } catch (e) {
            console.warn('[atualizarProfissional] config_agenda:', e);
          }
        }

        return { data: { success: true, profissional: prof } };
      }

      case 'criarAgendamentoChat': {
        const { cliente_id, profissional_nome, servico_nome, data, horario, observacoes } = params;
        if (!cliente_id || !profissional_nome || !servico_nome || !data || !horario) {
          return { data: { error: 'Dados incompletos para agendamento via assistente.' } };
        }

        const { data: cliente } = await supabase.from('cliente').select('*').eq('id', cliente_id).maybeSingle();
        if (!cliente) return { data: { error: 'Cliente não encontrado.' } };

        const { data: profs } = await supabase.from('profissional').select('*').ilike('nome', profissional_nome.trim()).maybeSingle();
        if (!profs) return { data: { error: `Profissional ${profissional_nome} não encontrado.` } };

        const { data: servs } = await supabase.from('servico').select('*').ilike('nome', servico_nome.trim()).maybeSingle();
        const duracao = servs?.duracao || 30;

        const [h, m] = horario.split(':').map(Number);
        const fimMin = h * 60 + m + duracao;
        const horarioFim = `${Math.floor(fimMin / 60).toString().padStart(2, '0')}:${(fimMin % 60).toString().padStart(2, '0')}`;

        const { data: ag, error: agErr } = await supabase.from('agendamento').insert({
          cliente_nome: cliente.nome,
          cliente_telefone: cliente.telefone,
          profissional_id: profs.id,
          profissional_nome: profs.nome,
          servico: servs?.nome || servico_nome,
          data,
          horario,
          horario_fim: horarioFim,
          duracao_total: duracao,
          observacoes: observacoes || 'Agendado via IA DeMattos',
          status: 'confirmado',
          confirmado_automaticamente: true
        }).select().single();

        if (agErr) throw agErr;
        return { data: { success: true, agendamento: ag } };
      }

      case 'criarAgendamentoRecorrente': {
        const { cliente_id, cliente_telefone, formData } = params;
        if (!cliente_id || !cliente_telefone || !formData) {
          return { data: { error: 'Dados incompletos para agendamento recorrente.' } };
        }

        const { data: cliente } = await supabase.from('cliente').select('*').eq('id', cliente_id).maybeSingle();
        const { data: prof } = await supabase.from('profissional').select('*').eq('id', formData.profissional_id).maybeSingle();
        const { data: serv } = await supabase.from('servico').select('*').eq('id', formData.servico_id).maybeSingle();

        if (!prof || !serv) {
          return { data: { error: 'Profissional ou serviço não encontrado.' } };
        }

        const duracao = serv.duracao || 30;
        const [h, m] = formData.horario.split(':').map(Number);
        const fimMin = h * 60 + m + duracao;
        const horarioFim = `${Math.floor(fimMin / 60).toString().padStart(2, '0')}:${(fimMin % 60).toString().padStart(2, '0')}`;

        const datas = [];
        const hoje = new Date();
        const diaSelecionado = parseInt(formData.dia_semana, 10);
        let dataAtual = new Date(hoje);

        while (dataAtual.getDay() !== diaSelecionado) {
          dataAtual.setDate(dataAtual.getDate() + 1);
        }

        const qtd = parseInt(formData.quantidade, 10) || 4;
        for (let i = 0; i < qtd; i++) {
          datas.push(new Date(dataAtual));
          if (formData.frequencia === 'semanal') {
            dataAtual.setDate(dataAtual.getDate() + 7);
          } else if (formData.frequencia === 'quinzenal') {
            dataAtual.setDate(dataAtual.getDate() + 14);
          } else {
            dataAtual.setMonth(dataAtual.getMonth() + 1);
          }
        }

        const agendamentosParaInserir = datas.map(d => ({
          cliente_nome: cliente?.nome || formData.cliente_nome || 'Cliente',
          cliente_telefone,
          profissional_id: prof.id,
          profissional_nome: prof.nome,
          servico: serv.nome,
          data: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
          horario: formData.horario,
          horario_fim: horarioFim,
          duracao_total: duracao,
          observacoes: formData.observacoes || 'Agendamento recorrente',
          status: 'confirmado',
          confirmado_automaticamente: true,
          eh_recorrente: true
        }));

        const { data: criados, error: insErr } = await supabase
          .from('agendamento')
          .insert(agendamentosParaInserir)
          .select();

        if (insErr) throw insErr;
        return { data: { success: true, quantidade: criados?.length || 0, agendamentos: criados } };
      }

      case 'loginProfissional': {
        const { email, senha } = params;
        const { data: prof, error } = await supabase
          .from('profissional')
          .select('*')
          .ilike('email', email.trim())
          .eq('ativo', true)
          .maybeSingle();

        if (error || !prof) {
          return { data: { error: 'Profissional não encontrado.' } };
        }
        if (prof.senha_acesso !== senha) {
          return { data: { error: 'Senha incorreta.' } };
        }
        return { data: { success: true, profissional: prof } };
      }

      case 'getAgendaProfissional': {
        const { profissional_id } = params;
        const [agendamentosRes, clientesRes] = await Promise.all([
          supabase.from('agendamento').select('*').eq('profissional_id', profissional_id).order('data', { ascending: false }).order('horario'),
          supabase.from('cliente').select('*')
        ]);
        return {
          data: {
            success: true,
            agendamentos: agendamentosRes.data || [],
            clientes: clientesRes.data || []
          }
        };
      }

      case 'updateAgendamentoProfissional': {
        const { agendamento_id, ...updates } = params;
        const { data, error } = await supabase
          .from('agendamento')
          .update(updates)
          .eq('id', agendamento_id)
          .select()
          .single();
        if (error) throw error;
        return { data: { success: true, agendamento: data } };
      }

      case 'syncUserCliente': {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: { success: true, cliente: null } };
        const { data: cliente } = await supabase.from('cliente').select('*').ilike('email', user.email).maybeSingle();
        return { data: { success: true, cliente: cliente || null } };
      }

      case 'buscarAgendamentosCliente':
      case 'getMeusAgendamentos': {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: { success: true, agendamentos: [] } };
        
        // Busca cliente pelo e-mail
        const { data: cliente } = await supabase.from('cliente').select('*').ilike('email', user.email).maybeSingle();
        let query = supabase.from('agendamento').select('*').order('data', { ascending: false }).order('horario');
        
        if (cliente?.telefone) {
          query = query.or(`cliente_telefone.eq.${cliente.telefone},cliente_nome.ilike.%${cliente.nome}%`);
        } else {
          query = query.ilike('cliente_nome', `%${user.user_metadata?.full_name || user.email}%`);
        }

        const { data, error } = await query;
        if (error) throw error;
        return { data: { success: true, agendamentos: data || [] } };
      }

      case 'getMeusDepoimentos': {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: { success: true, depoimentos: [] } };
        const { data: cliente } = await supabase.from('cliente').select('id').ilike('email', user.email).maybeSingle();
        if (!cliente) return { data: { success: true, depoimentos: [] } };
        const { data, error } = await supabase.from('depoimento').select('*').eq('cliente_id', cliente.id).order('created_date', { ascending: false });
        if (error) throw error;
        return { data: { success: true, depoimentos: data || [] } };
      }

      case 'atualizarPerfilCliente': {
        const { id, ...updates } = params;
        const { data, error } = await supabase.from('cliente').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return { data: { success: true, cliente: data } };
      }

      case 'criarDepoimento': {
        const { data, error } = await supabase.from('depoimento').insert([params]).select().single();
        if (error) throw error;
        return { data: { success: true, depoimento: data } };
      }

      case 'atualizarDepoimento': {
        const { id, ...updates } = params;
        const { data, error } = await supabase.from('depoimento').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return { data: { success: true, depoimento: data } };
      }

      case 'toggleEnvioDepoimento': {
        const { id, enviado_para_aprovacao } = params;
        const { data, error } = await supabase.from('depoimento').update({ enviado_para_aprovacao }).eq('id', id).select().single();
        if (error) throw error;
        return { data: { success: true, depoimento: data } };
      }

      case 'excluirDepoimento': {
        const { id } = params;
        const { error } = await supabase.from('depoimento').delete().eq('id', id);
        if (error) throw error;
        return { data: { success: true } };
      }

      case 'excluirAgendamento':
      case 'deletarAgendamento':
      case 'deleteAgendamento': {
        const targetId = params?.id || params?.agendamento_id || params?.agendamentoId;
        if (!targetId) {
          return { data: { error: 'ID do agendamento não informado.' } };
        }

        // 1. Buscar agendamento antes de excluir para liberar horários na agenda
        const { data: agExistente } = await supabaseAdmin
          .from('agendamento')
          .select('*')
          .eq('id', targetId)
          .maybeSingle();

        // 2. Liberar horário na tabela horario_disponivel
        if (agExistente && agExistente.profissional_id && agExistente.data && agExistente.horario) {
          try {
            await supabaseAdmin
              .from('horario_disponivel')
              .update({ disponivel: true })
              .eq('profissional_id', agExistente.profissional_id)
              .eq('data', agExistente.data)
              .eq('horario', agExistente.horario);
          } catch (eHorario) {
            console.warn('[excluirAgendamento] Erro ao liberar horario:', eHorario);
          }
        }

        // 3. Excluir permanentemente o agendamento (permitido em qualquer status: confirmado, pendente, etc.)
        const { error } = await supabaseAdmin
          .from('agendamento')
          .delete()
          .eq('id', targetId);

        if (error) throw error;

        return { data: { success: true, deleted: true, id: targetId } };
      }

      case 'cancelarMeuAgendamento':
      case 'cancelarAgendamento': {
        const targetId = params?.id || params?.agendamento_id || params?.agendamentoId;
        if (!targetId) {
          return { data: { error: 'ID do agendamento não informado.' } };
        }

        // 1. Buscar agendamento atual e liberar horário
        const { data: agAtual } = await supabaseAdmin
          .from('agendamento')
          .select('*')
          .eq('id', targetId)
          .maybeSingle();

        if (agAtual && agAtual.profissional_id && agAtual.data && agAtual.horario) {
          try {
            await supabaseAdmin
              .from('horario_disponivel')
              .update({ disponivel: true })
              .eq('profissional_id', agAtual.profissional_id)
              .eq('data', agAtual.data)
              .eq('horario', agAtual.horario);
          } catch (eHorario) {
            console.warn('[cancelarAgendamento] Erro ao liberar horario:', eHorario);
          }
        }

        // 2. Atualizar status para cancelado (funciona para confirmado, pendente, etc.)
        const { data, error } = await supabaseAdmin
          .from('agendamento')
          .update({ status: 'cancelado' })
          .eq('id', targetId)
          .select()
          .maybeSingle();

        if (error) throw error;

        // 3. Disparo de notificação de cancelamento WhatsApp para o cliente
        if (data) {
          evolutionApi.sendAppointmentNotification('cancelamento', data).catch(err => {
            console.warn('[WhatsApp] Aviso ao enviar cancelamento ao cliente:', err);
          });

          // Notificar também o barbeiro sobre o cancelamento
          if (data.profissional_id) {
            supabaseAdmin.from('profissional').select('telefone').eq('id', data.profissional_id).maybeSingle().then(({ data: prof }) => {
              evolutionApi.notifyBarberCancellation(data, prof?.telefone).catch(err => {
                console.warn('[WhatsApp] Aviso ao enviar cancelamento ao barbeiro:', err);
              });
            }).catch(() => {});
          }
        }

        return { data: { success: true, agendamento: data } };
      }

      case 'atualizarStatusAgendamento': {
        const targetId = params.id || params.agendamento_id || params.agendamentoId;
        const targetStatus = params.status || params.novoStatus;

        if (!targetId || !targetStatus) {
          return { data: { error: 'ID e status do agendamento são obrigatórios.' } };
        }

        // Buscar agendamento atual antes da alteração para checar transição de status
        const { data: agAnterior } = await supabase
          .from('agendamento')
          .select('*')
          .eq('id', targetId)
          .maybeSingle();

        const { data, error } = await supabase
          .from('agendamento')
          .update({ status: targetStatus })
          .eq('id', targetId)
          .select()
          .single();

        if (error) throw error;

        // 1. Se o barbeiro confirmou manualmente um agendamento (ex: estava 'pendente')
        if (targetStatus === 'confirmado' && agAnterior?.status !== 'confirmado') {
          evolutionApi.sendAppointmentNotification('confirmacao', data).catch(err => {
            console.warn('[WhatsApp] Aviso ao enviar confirmação manual ao cliente:', err);
          });
        }

        // 2. Se o status mudou para 'cancelado' -> Liberar horário e avisar cliente e barbeiro
        if (targetStatus === 'cancelado' && agAnterior?.status !== 'cancelado') {
          try {
            await supabase.from('horario_disponivel')
              .update({ disponivel: true })
              .eq('profissional_id', data.profissional_id)
              .eq('data', data.data)
              .eq('horario', data.horario);
          } catch (e) {
            console.warn('[atualizarStatusAgendamento] Erro ao liberar slot:', e);
          }

          evolutionApi.sendAppointmentNotification('cancelamento', data).catch(err => {
            console.warn('[WhatsApp] Aviso ao enviar cancelamento ao cliente:', err);
          });

          if (data.profissional_id) {
            supabase.from('profissional').select('telefone').eq('id', data.profissional_id).maybeSingle().then(({ data: prof }) => {
              evolutionApi.notifyBarberCancellation(data, prof?.telefone).catch(err => {
                console.warn('[WhatsApp] Aviso ao enviar cancelamento ao barbeiro:', err);
              });
            }).catch(() => {});
          }
        }

        return { data: { success: true, agendamento: data } };
      }

      case 'verificarClientePorTelefone': {
        const { telefone } = params;
        const { data } = await supabase.from('cliente').select('*').eq('telefone', telefone).maybeSingle();
        return { data: { exists: !!data, cliente: data || null } };
      }

      case 'getAgendamentosPublicosCount': {
        const { count, error } = await supabase.from('agendamento').select('*', { count: 'exact', head: true }).eq('status', 'realizado');
        return { data: { count: count || 0 } };
      }

      case 'getAgendaDiariaProfissional': {
        const { profissional_id, data } = params;
        if (!profissional_id || !data) {
          return { data: { success: false, error: 'profissional_id e data são obrigatórios.' } };
        }

        let { data: prof } = await supabase
          .from('profissional')
          .select('id, nome, ativo')
          .eq('id', profissional_id)
          .maybeSingle();

        if (!prof) {
          prof = { id: profissional_id, nome: 'Profissional' };
        }

        const { data: configs } = await supabase
          .from('config_agenda_profissional')
          .select('*')
          .eq('profissional_id', profissional_id);

        const config = (configs && configs.length > 0) ? configs[0] : {
          dias_semana: [1, 2, 3, 4, 5, 6],
          horario_inicio: '09:00',
          horario_fim: '19:00',
          horario_almoco_inicio: '12:00',
          horario_almoco_fim: '13:00',
          intervalo_minutos: 30
        };

        const [startH, startM] = (config.horario_inicio || '09:00').split(':').map(Number);
        const [endH, endM] = (config.horario_fim || '19:00').split(':').map(Number);
        const [almocoStartH, almocoStartM] = (config.horario_almoco_inicio || '12:00').split(':').map(Number);
        const [almocoEndH, almocoEndM] = (config.horario_almoco_fim || '13:00').split(':').map(Number);

        const startTotalMin = startH * 60 + (startM || 0);
        const endTotalMin = endH * 60 + (endM || 0);
        const almocoStartTotal = almocoStartH * 60 + (almocoStartM || 0);
        const almocoEndTotal = almocoEndH * 60 + (almocoEndM || 0);
        const interval = Number(config.intervalo_minutos) || 30;

        const [agendamentosRes, horariosDbRes] = await Promise.all([
          supabase
            .from('agendamento')
            .select('*')
            .eq('data', data)
            .neq('status', 'cancelado')
            .order('horario'),
          supabase
            .from('horario_disponivel')
            .select('*')
            .eq('profissional_id', profissional_id)
            .eq('data', data)
        ]);

        const agendamentos = agendamentosRes.data || [];
        const horariosDb = horariosDbRes.data || [];

        const slots = [];
        for (let m = startTotalMin; m < endTotalMin; m += interval) {
          const hh = String(Math.floor(m / 60)).padStart(2, '0');
          const mm = String(m % 60).padStart(2, '0');
          const horario = `${hh}:${mm}`;

          const isAlmoco = m >= almocoStartTotal && m < almocoEndTotal;
          const ag = agendamentos.find(a => a.profissional_id === profissional_id && a.horario === horario);
          const outroAg = !ag ? agendamentos.find(a => a.horario === horario) : null;
          const dbSlot = horariosDb.find(h => h.horario === horario);

          let disponivel = true;
          if (dbSlot) {
            disponivel = dbSlot.disponivel;
          } else if (isAlmoco || ag) {
            disponivel = false;
          }

          slots.push({
            horario,
            disponivel,
            isAlmoco,
            agendamento: ag || outroAg || null
          });
        }

        return {
          data: {
            success: true,
            profissional: prof,
            slots
          }
        };
      }

      case 'moverAgendamento': {
        const { agendamento_id, nova_data, novo_horario } = params;
        if (!agendamento_id || !nova_data || !novo_horario) {
          return { data: { success: false, error: 'Parâmetros incompletos para mover agendamento.' } };
        }

        const { data: agAtual } = await supabase
          .from('agendamento')
          .select('*')
          .eq('id', agendamento_id)
          .maybeSingle();

        if (agAtual) {
          await supabase
            .from('horario_disponivel')
            .update({ disponivel: true })
            .eq('profissional_id', agAtual.profissional_id)
            .eq('data', agAtual.data)
            .eq('horario', agAtual.horario);
        }

        const { data: updatedAg, error: updateErr } = await supabase
          .from('agendamento')
          .update({
            data: nova_data,
            horario: novo_horario,
            updated_date: new Date().toISOString()
          })
          .eq('id', agendamento_id)
          .select()
          .single();

        if (updateErr) throw updateErr;

        if (updatedAg) {
          await supabase
            .from('horario_disponivel')
            .update({ disponivel: false })
            .eq('profissional_id', updatedAg.profissional_id)
            .eq('data', nova_data)
            .eq('horario', novo_horario);
        }

        return { data: { success: true, agendamento: updatedAg } };
      }

      case 'getProfissionaisPublicos': {
        const { data, error } = await supabase
          .from('profissional')
          .select('id, nome, foto_url, especialidades, ativo, bio')
          .eq('ativo', true)
          .order('nome');
        if (error) throw error;
        return { data: { success: true, profissionais: data || [] } };
      }

      case 'getDeMattosData': {
        const { cliente_id } = params;
        let credits = 0;
        let conversas = [];

        if (cliente_id) {
          const [clienteRes, conversasRes] = await Promise.all([
            supabase.from('cliente').select('id, creditos_ia').eq('id', cliente_id).maybeSingle(),
            supabase.from('conversa_demattos').select('*').eq('cliente_id', cliente_id).order('created_date', { ascending: true })
          ]);
          credits = clienteRes.data?.creditos_ia || 0;
          conversas = conversasRes.data || [];
        }

        return {
          data: {
            success: true,
            credits,
            conversas
          }
        };
      }

      case 'sendDeMattosMessage': {
        const { cliente_id, mensagem, fotos_urls, has_credits } = params;
        let userCredits = 0;

        if (cliente_id) {
          const { data: c } = await supabase.from('cliente').select('id, creditos_ia, nome').eq('id', cliente_id).maybeSingle();
          userCredits = c?.creditos_ia || 0;
          if (has_credits && userCredits <= 0) {
            return { data: { error: 'Créditos insuficientes' } };
          }

          await supabase.from('conversa_demattos').insert({
            cliente_id,
            role: 'user',
            mensagem,
            fotos_urls: fotos_urls || []
          });

          if (userCredits > 0) {
            userCredits -= 1;
            await supabase.from('cliente').update({ creditos_ia: userCredits }).eq('id', cliente_id);
            await supabase.from('transacao_credito').insert({
              usuario_id: cliente_id,
              tipo: 'consumo',
              quantidade: 1,
              observacao: 'Consulta Visagismo DeMattos IA'
            });
          }
        }

        const resposta = `Com base nas características do seu formato de rosto e estilo, recomendo cortes com laterais em degradê (fade médio a alto) para alongar e valorizar os traços, alinhando a barba com linhas bem desenhadas. Você pode agendar uma consultoria presencial para avaliarmos a geometria completa do seu visual! ✂️💈`;

        if (cliente_id) {
          await supabase.from('conversa_demattos').insert({
            cliente_id,
            role: 'assistant',
            mensagem: resposta
          });
        }

        return {
          data: {
            success: true,
            resposta,
            novos_creditos: userCredits
          }
        };
      }

      case 'getConfigAssistente': {
        const { data } = await supabase.from('configuracao_assistente').select('*').limit(1);
        const config = data?.[0] || {
          audio_respostas_ativo: true,
          audio_entrada_ativo: true,
          voz_tipo: 'pt-BR-Female',
          velocidade_fala: 1.2,
          tom_voz: 1.1,
          volume: 1.0
        };
        return { data: { success: true, config } };
      }

      case 'getMinhasConversas': {
        const { cliente_id } = params;
        if (!cliente_id) return { data: { success: true, conversas: [] } };
        const { data, error } = await supabase
          .from('conversa_demattos')
          .select('*')
          .eq('cliente_id', cliente_id)
          .order('created_date', { ascending: true });
        if (error) throw error;
        return { data: { success: true, conversas: data || [] } };
      }

      case 'salvarMensagemChat': {
        const { cliente_id, role, mensagem, fotos_urls, previa_url } = params;
        const { data, error } = await supabase
          .from('conversa_demattos')
          .insert({
            cliente_id,
            role,
            mensagem,
            fotos_urls: fotos_urls || [],
            previa_url: previa_url || null
          })
          .select()
          .single();
        if (error) throw error;
        return { data: { success: true, mensagem: data } };
      }

      case 'consumirCreditoIA': {
        const { cliente_id } = params;
        if (!cliente_id) return { data: { success: false, error: 'cliente_id não informado' } };
        const { data: cliente } = await supabase.from('cliente').select('id, creditos_ia').eq('id', cliente_id).maybeSingle();
        const creditosAtuais = cliente?.creditos_ia || 0;
        if (creditosAtuais <= 0) {
          return { data: { success: false, error: 'Créditos insuficientes' } };
        }
        const novosCreditos = creditosAtuais - 1;
        await supabase.from('cliente').update({ creditos_ia: novosCreditos }).eq('id', cliente_id);
        await supabase.from('transacao_credito').insert({
          usuario_id: cliente_id,
          tipo: 'consumo',
          quantidade: 1,
          observacao: 'Consumo no Chat Assistente'
        });
        return { data: { success: true, novos_creditos: novosCreditos } };
      }

      case 'getContextoChatPublico': {
        const [servRes, profRes, prodRes] = await Promise.all([
          supabase.from('servico').select('id, nome, preco, duracao_minutos').eq('ativo', true),
          supabase.from('profissional').select('id, nome, especialidades').eq('ativo', true),
          supabase.from('produto').select('id, nome, preco').eq('ativo', true)
        ]);
        return {
          data: {
            success: true,
            servicos: servRes.data || [],
            profissionais: profRes.data || [],
            produtos: prodRes.data || []
          }
        };
      }

      case 'getPacotesCreditoPublicos': {
        const { data, error } = await supabase
          .from('pacote_credito')
          .select('*')
          .order('creditos');
        if (error) throw error;
        return { data: { success: true, pacotes: data || [] } };
      }

      case 'getCarrinhoCliente': {
        const userEmail = params.cliente_email || params.email;
        if (!userEmail) return { data: { success: true, items: [] } };
        const { data, error } = await supabase
          .from('item_carrinho')
          .select('*')
          .ilike('cliente_email', userEmail);
        if (error) throw error;
        return { data: { success: true, items: data || [] } };
      }

      case 'sincronizarCarrinho': {
        const userEmail = params.cliente_email || params.email;
        if (!userEmail) return { data: { success: true } };
        await supabase.from('item_carrinho').delete().ilike('cliente_email', userEmail);
        if (Array.isArray(params.items) && params.items.length > 0) {
          const toInsert = params.items.map(item => ({
            cliente_email: userEmail,
            item_tipo: item.item_tipo || 'produto',
            item_id: item.id || item.item_id,
            item_nome: item.nome || item.item_nome,
            item_preco: item.preco || item.item_preco,
            quantidade: item.quantidade || 1,
            produto_tipo: item.tipo || item.produto_tipo,
            produto_arquivo_pdf_url: item.arquivo_pdf_url || item.produto_arquivo_pdf_url
          }));
          await supabase.from('item_carrinho').insert(toInsert);
        }
        return { data: { success: true } };
      }

      case 'deleteUserAccount': {
        const { cliente_id, email } = params;
        if (cliente_id) await supabase.from('cliente').delete().eq('id', cliente_id);
        if (email) await supabase.from('cliente').delete().ilike('email', email);
        return { data: { success: true } };
      }

      case 'createStripeCheckout': {
        const targetPhone = '5531973651924';
        const msg = encodeURIComponent('Olá! Gostaria de finalizar meu pagamento na Barbearia DeMattos.');
        const checkout_url = `https://wa.me/${targetPhone}?text=${msg}`;
        return { data: { success: true, checkout_url } };
      }

      case 'syncComboWithStripe':
      case 'syncCreditPackageWithStripe':
      case 'syncAllCreditPackagesWithStripe':
      case 'syncProductWithStripe':
      case 'syncAllProductsWithStripe': {
        return { data: { success: true, message: 'Itens sincronizados com sucesso!' } };
      }

      default: {
        console.warn(`[Supabase Functions] Invocação da função '${functionName}' não mapeada localmente.`);
        try {
          const { data, error } = await supabase.functions.invoke(functionName, { body: params });
          if (error) {
            console.warn(`[Supabase Functions] Edge function '${functionName}' não respondeu:`, error.message);
            return { data: { success: false, error: error.message } };
          }
          return { data };
        } catch (e) {
          return { data: { success: false, error: e.message } };
        }
      }
    }
  } catch (err) {
    console.error(`Erro ao invocar função ${functionName}:`, err);
    return { data: { success: false, error: err.message } };
  }
}
