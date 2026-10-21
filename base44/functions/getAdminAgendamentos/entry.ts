import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Helper para garantir que o retorno do SDK é um array JS
const parseSDK = (raw) => {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch (_) { return []; }
  }
  return [];
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  let body = {};
  try {
    const text = await req.text();
    body = text ? JSON.parse(text) : {};
  } catch (_) {}

  const hoje = new Date();
  hoje.setDate(hoje.getDate() - 5);
  const dataInicioPadrao = hoje.toISOString().split('T')[0];
  const dataInicio = body.dataInicio || dataInicioPadrao;

  let user = null;
  try { user = await base44.auth.me(); } catch (_) {}
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Acesso negado' }, { status: 403 });
  }

  // Buscar por status separadamente — o SDK já desaninha os campos automaticamente
  const [pendentes, confirmados, realizados, cancelados] = await Promise.all([
    base44.asServiceRole.entities.Agendamento.filter({ status: 'pendente' }, '-created_date', 500).then(parseSDK).catch(() => []),
    base44.asServiceRole.entities.Agendamento.filter({ status: 'confirmado' }, '-created_date', 500).then(parseSDK).catch(() => []),
    base44.asServiceRole.entities.Agendamento.filter({ status: 'realizado' }, '-created_date', 500).then(parseSDK).catch(() => []),
    base44.asServiceRole.entities.Agendamento.filter({ status: 'cancelado' }, '-created_date', 500).then(parseSDK).catch(() => []),
  ]);

  const todos = [...pendentes, ...confirmados, ...realizados, ...cancelados];

  const resultado = todos
    .filter(ag => {
      if (!ag || !ag.cliente_nome || !ag.cliente_telefone) return false;
      if (ag.data && ag.data < dataInicio) return false;
      return true;
    })
    .sort((a, b) => {
      if ((a.data || '') < (b.data || '')) return -1;
      if ((a.data || '') > (b.data || '')) return 1;
      return (a.horario || '').localeCompare(b.horario || '');
    });

  return Response.json({ success: true, agendamentos: resultado });
});