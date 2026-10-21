import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const configs = await base44.asServiceRole.entities.Configuracao.list();

    // Retornar apenas configurações públicas
    const configsPublicas = configs.filter(c => 
      ['endereco', 'telefone', 'horario_semana', 'horario_sabado', 'horario_domingo'].includes(c.chave)
    );

    return Response.json({
      success: true,
      configuracoes: configsPublicas
    });
  } catch (error) {
    return Response.json({ error: 'Erro ao buscar configurações' }, { status: 500 });
  }
});