import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Testar filter direto por data >= 2026-04-01
  let abrilRaw;
  try {
    abrilRaw = await base44.asServiceRole.entities.Agendamento.filter({ data: '2026-04-03' }, '-created_date', 10);
  } catch (e) {
    abrilRaw = 'ERRO: ' + e.message;
  }

  let abrilParsed = abrilRaw;
  if (typeof abrilRaw === 'string') {
    try { abrilParsed = JSON.parse(abrilRaw); } catch (_) { abrilParsed = 'PARSE FALHOU'; }
  }

  // Testar filter por status pendente
  let pendenteRaw;
  try {
    pendenteRaw = await base44.asServiceRole.entities.Agendamento.filter({ status: 'pendente' }, '-created_date', 5);
  } catch (e) {
    pendenteRaw = 'ERRO: ' + e.message;
  }

  let pendenteParsed = pendenteRaw;
  if (typeof pendenteRaw === 'string') {
    try { pendenteParsed = JSON.parse(pendenteRaw); } catch (_) { pendenteParsed = 'PARSE FALHOU'; }
  }

  return Response.json({
    abril_total: Array.isArray(abrilParsed) ? abrilParsed.length : abrilParsed,
    abril_amostra: Array.isArray(abrilParsed) ? abrilParsed.slice(0, 2).map(ag => ({ id: ag.id, data: ag.data, cliente_nome: ag.cliente_nome, status: ag.status })) : abrilParsed,
    pendente_total: Array.isArray(pendenteParsed) ? pendenteParsed.length : pendenteParsed,
    pendente_amostra: Array.isArray(pendenteParsed) ? pendenteParsed.slice(0, 2).map(ag => ({ id: ag.id, data: ag.data, cliente_nome: ag.cliente_nome })) : pendenteParsed,
  });
});