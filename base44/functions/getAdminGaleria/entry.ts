import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const [imagens, secaoSobre, agendamentosRealizados] = await Promise.all([
      base44.asServiceRole.entities.ImagemGaleria.list('ordem'),
      base44.asServiceRole.entities.SecaoSobre.list(),
      base44.asServiceRole.entities.Agendamento.filter({ status: 'realizado' })
    ]);

    return Response.json({
      success: true,
      imagens,
      secaoSobre: secaoSobre[0] || null,
      agendamentosRealizados
    });
  } catch (error) {
    return Response.json({ error: 'Erro ao buscar dados da galeria' }, { status: 500 });
  }
});