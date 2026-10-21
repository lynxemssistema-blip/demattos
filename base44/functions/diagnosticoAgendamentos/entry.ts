import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const [pendentes, confirmados, realizados, cancelados] = await Promise.all([
      base44.asServiceRole.entities.Agendamento.filter({ status: 'pendente' }, '-data', 500).catch(() => []),
      base44.asServiceRole.entities.Agendamento.filter({ status: 'confirmado' }, '-data', 500).catch(() => []),
      base44.asServiceRole.entities.Agendamento.filter({ status: 'realizado' }, '-data', 500).catch(() => []),
      base44.asServiceRole.entities.Agendamento.filter({ status: 'cancelado' }, '-data', 500).catch(() => []),
    ]);

    const p = Array.isArray(pendentes) ? pendentes : [];
    const c = Array.isArray(confirmados) ? confirmados : [];
    const r = Array.isArray(realizados) ? realizados : [];
    const k = Array.isArray(cancelados) ? cancelados : [];

    // Contagem por status
    const resumo = {
      pendente: p.length,
      confirmado: c.length,
      realizado: r.length,
      cancelado: k.length,
      total: p.length + c.length + r.length + k.length,
    };

    // Filtrar apenas com nome (válidos)
    const todos = [...p, ...c, ...r, ...k].filter(ag => ag && ag.cliente_nome && ag.cliente_telefone);
    
    resumo.validos_com_nome = todos.length;
    resumo.sem_nome = (p.length + c.length + r.length + k.length) - todos.length;

    // Distribuição por mês
    const porMes = {};
    todos.forEach(ag => {
      if (ag.data) {
        const mes = ag.data.substring(0, 7);
        if (!porMes[mes]) porMes[mes] = { total: 0, pendente: 0, confirmado: 0, realizado: 0, cancelado: 0 };
        porMes[mes].total++;
        porMes[mes][ag.status] = (porMes[mes][ag.status] || 0) + 1;
      }
    });

    // Distribuição por profissional
    const porProfissional = {};
    todos.forEach(ag => {
      const nome = ag.profissional_nome || 'Desconhecido';
      if (!porProfissional[nome]) porProfissional[nome] = { total: 0, pendente: 0, confirmado: 0, realizado: 0, cancelado: 0 };
      porProfissional[nome].total++;
      porProfissional[nome][ag.status] = (porProfissional[nome][ag.status] || 0) + 1;
    });

    // Últimos 5 de cada status
    const amostras = {
      pendentes: p.filter(ag => ag.cliente_nome).slice(0, 5).map(ag => ({ id: ag.id, nome: ag.cliente_nome, data: ag.data, horario: ag.horario, profissional: ag.profissional_nome })),
      confirmados: c.filter(ag => ag.cliente_nome).slice(0, 5).map(ag => ({ id: ag.id, nome: ag.cliente_nome, data: ag.data, horario: ag.horario, profissional: ag.profissional_nome })),
      realizados: r.filter(ag => ag.cliente_nome).slice(0, 5).map(ag => ({ id: ag.id, nome: ag.cliente_nome, data: ag.data, horario: ag.horario, profissional: ag.profissional_nome })),
      cancelados: k.filter(ag => ag.cliente_nome).slice(0, 5).map(ag => ({ id: ag.id, nome: ag.cliente_nome, data: ag.data, horario: ag.horario, profissional: ag.profissional_nome })),
    };

    // Datas range
    const todasDatas = todos.map(ag => ag.data).filter(Boolean).sort();
    const rangeData = {
      mais_antiga: todasDatas[0] || null,
      mais_recente: todasDatas[todasDatas.length - 1] || null,
    };

    return Response.json({
      success: true,
      resumo,
      range_datas: rangeData,
      por_mes: Object.entries(porMes).sort((a, b) => b[0].localeCompare(a[0])).reduce((acc, [k, v]) => { acc[k] = v; return acc; }, {}),
      por_profissional: porProfissional,
      amostras,
    });
  } catch (error) {
    console.error('Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});