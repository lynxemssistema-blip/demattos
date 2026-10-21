import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const configs = await base44.asServiceRole.entities.ConfiguracaoAssistente.list();
    
    return Response.json({
      success: true,
      config: configs.length > 0 ? configs[0] : {
        voz_tipo: 'pt-BR-Female',
        velocidade_fala: 1.2,
        tom_voz: 1.1,
        volume: 1.0,
        audio_respostas_ativo: true,
        audio_entrada_ativo: true
      }
    });
  } catch (error) {
    return Response.json({ error: 'Erro ao buscar configuração' }, { status: 500 });
  }
});