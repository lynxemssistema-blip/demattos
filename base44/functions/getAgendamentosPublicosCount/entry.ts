import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { profissional_id } = await req.json();

    if (profissional_id) {
      // Contar agendamentos de um profissional específico
      const agendamentos = await base44.asServiceRole.entities.Agendamento.filter({
        profissional_id,
        status: 'realizado'
      });

      return Response.json({
        success: true,
        count: agendamentos.length
      });
    }

    // Contar todos agendamentos realizados (para seção Sobre)
    const agendamentos = await base44.asServiceRole.entities.Agendamento.filter({ 
      status: 'realizado' 
    });

    return Response.json({
      success: true,
      count: agendamentos.length
    });
  } catch (error) {
    return Response.json({ error: 'Erro ao contar agendamentos' }, { status: 500 });
  }
});