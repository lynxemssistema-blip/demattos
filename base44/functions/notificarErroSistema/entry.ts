import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Função para enviar notificação de erro/evento ao suporte técnico
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { 
      tipo = 'erro', // 'erro', 'aviso', 'critico'
      funcao, 
      mensagem, 
      detalhes = {},
      usuario_email = 'sistema',
      stack_trace = ''
    } = await req.json();

    // Buscar email do suporte
    const configs = await base44.asServiceRole.entities.Configuracao.filter({});
    const emailSuporteConfig = configs.find(c => c.chave === 'email_suporte_tecnico');
    
    if (!emailSuporteConfig || !emailSuporteConfig.valor) {
      console.error('Email do suporte técnico não configurado');
      return Response.json({ 
        success: false, 
        error: 'Email do suporte não configurado' 
      }, { status: 400 });
    }

    // Determinar grau de urgência e cores
    const urgenciaConfig = {
      critico: { label: '🔴 CRÍTICO', delay: 'IMEDIATO' },
      erro: { label: '🟠 ERRO', delay: '5 minutos' },
      aviso: { label: '🟡 AVISO', delay '30 minutos' }
    };

    const urgencia = urgenciaConfig[tipo] || urgenciaConfig.aviso;
    const dataNow = new Date().toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    // Montar corpo do email com máximo de informação
    const corpoEmail = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background-color: #f5f5f5; }
    .container { background-color: white; padding: 20px; border-radius: 8px; margin: 20px auto; max-width: 800px; }
    .header { border-left: 5px solid #ff4444; padding: 15px; background-color: #fff5f5; }
    .header h2 { margin: 0; color: #333; }
    .urgencia { font-size: 18px; font-weight: bold; color: #ff4444; }
    .secao { margin: 20px 0; padding: 15px; background-color: #f9f9f9; border-left: 3px solid #D4AF37; }
    .secao-titulo { font-weight: bold; color: #333; margin-bottom: 10px; }
    .campo { margin: 8px 0; }
    .label { font-weight: bold; color: #666; }
    .valor { color: #333; font-family: monospace; word-break: break-all; }
    .stack { background-color: #000; color: #0f0; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 11px; overflow-x: auto; }
    .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>🛠️ Notificação de Erro do Sistema - Barbearia DeMattos</h2>
      <div class="urgencia">${urgencia.label}</div>
    </div>

    <div class="secao">
      <div class="secao-titulo">📋 Informações Gerais</div>
      <div class="campo">
        <span class="label">Título:</span>
        <span class="valor">Barbearia DeMattos - ${dataNow} - ${urgencia.label}</span>
      </div>
      <div class="campo">
        <span class="label">Data/Hora:</span>
        <span class="valor">${dataNow}</span>
      </div>
      <div class="campo">
        <span class="label">Urgência:</span>
        <span class="valor">${urgencia.label} (Tempo resposta esperado: ${urgencia.delay})</span>
      </div>
      <div class="campo">
        <span class="label">Tipo de Evento:</span>
        <span class="valor">${tipo.toUpperCase()}</span>
      </div>
    </div>

    <div class="secao">
      <div class="secao-titulo">⚠️ Detalhes do Erro</div>
      <div class="campo">
        <span class="label">Função Afetada:</span>
        <span class="valor">${funcao || 'Não especificada'}</span>
      </div>
      <div class="campo">
        <span class="label">Mensagem:</span>
        <span class="valor">${mensagem || 'Sem mensagem'}</span>
      </div>
      <div class="campo">
        <span class="label">Usuário Afetado:</span>
        <span class="valor">${usuario_email}</span>
      </div>
    </div>

    ${stack_trace ? `
    <div class="secao">
      <div class="secao-titulo">📜 Stack Trace</div>
      <div class="stack">${escapeHtml(stack_trace)}</div>
    </div>
    ` : ''}

    <div class="secao">
      <div class="secao-titulo">🔍 Detalhes Adicionais (JSON)</div>
      <div class="stack">${escapeHtml(JSON.stringify(detalhes, null, 2))}</div>
    </div>

    <div class="secao" style="background-color: #fffbf0; border-left-color: #D4AF37;">
      <div class="secao-titulo">📌 Recomendações para Resolução</div>
      <ul style="color: #333;">
        <li>Verificar os logs completos do servidor</li>
        <li>Replicar o erro em ambiente de teste</li>
        <li>Validar as dependências e integrações externas</li>
        <li>Revisar as alterações recentes no código</li>
        <li>Contactar o desenvolvedor responsável se necessário</li>
      </ul>
    </div>

    <div class="footer">
      <p>Este é um email automático gerado pelo sistema de monitoramento da Barbearia DeMattos.</p>
      <p>Não responda este email. Acesse o painel de administração para mais detalhes.</p>
    </div>
  </div>
</body>
</html>
    `;

    // Enviar email
    const emailResponse = await base44.integrations.Core.SendEmail({
      to: emailSuporteConfig.valor,
      from_name: 'Sistema DeMattos - Suporte Técnico',
      subject: `[${urgencia.label}] Barbearia DeMattos - ${dataNow}`,
      body: corpoEmail
    });

    // Registrar notificação no banco (para histórico)
    await base44.asServiceRole.entities.NotificacaoErro.create({
      tipo,
      funcao,
      mensagem,
      usuario_email,
      detalhes_json: JSON.stringify(detalhes),
      stack_trace,
      email_enviado_para: emailSuporteConfig.valor,
      data_hora: new Date().toISOString(),
      lido: false
    }).catch(() => {
      // Se entidade não existir, apenas ignora
    });

    return Response.json({ 
      success: true, 
      message: 'Notificação de erro enviada com sucesso' 
    });

  } catch (error) {
    console.error('Erro ao enviar notificação:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});

// Função auxiliar para escapar HTML
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}