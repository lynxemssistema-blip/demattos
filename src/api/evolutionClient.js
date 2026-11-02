import { supabase } from '@/lib/supabaseClient';

const DEFAULT_API_URL = import.meta.env.VITE_EVOLUTION_API_URL || 'https://evo.lynxems.com.br';
const DEFAULT_API_KEY = import.meta.env.VITE_EVOLUTION_API_KEY || 'F10230BCFE78-4B5A-80F3-789AD4E58B79';
const DEFAULT_INSTANCE = import.meta.env.VITE_EVOLUTION_INSTANCE || 'DeMattos';
export const LUAN_DEFAULT_PHONE = '5531973651924';
export const DEFAULT_LOGO_URL = 'https://demattos.lynxems.com.br/logo_demattos.jpg';

/**
 * Processa sintaxe Spintax {opcao1|opcao2|opcao3} para gerar variações dinâmicas de texto.
 * Isso evita que mensagens idênticas sejam enviadas repetidamente, protegendo o número contra banimento da Meta.
 */
export function processSpintax(text) {
  if (!text) return '';
  const regex = /\{([^{}]+)\}/g;
  let result = text;
  let iterations = 0;
  while (regex.test(result) && iterations < 10) {
    iterations++;
    result = result.replace(regex, (_, choices) => {
      const options = choices.split('|');
      const randomChoice = options[Math.floor(Math.random() * options.length)];
      return randomChoice ? randomChoice.trim() : '';
    });
  }
  return result;
}

/**
 * Retorna uma saudação humanizada dinâmica baseada no horário atual (Bom dia, Boa tarde, Boa noite).
 */
export function getSaudacaoPeriodo() {
  const hora = new Date().getHours();
  if (hora >= 5 && hora < 12) return 'Bom dia';
  if (hora >= 12 && hora < 18) return 'Boa tarde';
  return 'Boa noite';
}

export const DEFAULT_TEMPLATES = {
  confirmacao: `{💈 *Barbearia DeMattos* 💈|✂️ *DeMattos Visage* ✂️}

{{saudacao_periodo}}, *{{cliente_nome}}*! {Seu agendamento foi confirmado com sucesso|Tudo pronto com o seu horário|Seu horário está 100% confirmado}. ✅

✂️ *Profissional:* {{barbeiro_nome}}
🛠️ *Serviço:* {{servico}}
📅 *Data:* {{data}}
⏰ *Horário:* {{horario}}
📍 *Endereço:* {{endereco}}

{Agradecemos a confiança e preferência!|Te esperamos no horário marcado!|Conte conosco para um atendimento impecável!} Caso precise remarcar, nos avise com antecedência por aqui.`,

  cancelamento: `{💈 *Barbearia DeMattos* 💈|✂️ *DeMattos Visage* ✂️}

{{saudacao_periodo}}, *{{cliente_nome}}*! {Informamos que o seu agendamento foi cancelado|Confirmamos o cancelamento do seu agendamento}. ❌

✂️ *Profissional:* {{barbeiro_nome}}
🛠️ *Serviço:* {{servico}}
📅 *Data:* {{data}} às {{horario}}

{Caso deseje reagendar para outro dia ou horário, estamos à total disposição!|Quando quiser marcar um novo horário, acesse nosso site!} 💈`,

  lembrete: `{💈 *Lembrete de Horário - Barbearia DeMattos* 💈|⏰ *Lembrete de Atendimento - Barbearia DeMattos* ⏰}

{{saudacao_periodo}}, *{{cliente_nome}}*! {Passando para lembrar do seu horário agendado|Lembrando você do seu atendimento|Não se esqueça do seu horário conosco}:

✂️ *Profissional:* {{barbeiro_nome}}
🛠️ *Serviço:* {{servico}}
⏰ *Horário:* {{horario}} ({{data}})
📍 *Endereço:* {{endereco}}

{Por favor, chegue com alguns minutos de antecedência. Te esperamos!|Te esperamos no horário marcado! Qualquer imprevisto, nos avise por aqui.} ✂️🔥`,

  aviso_barbeiro: `💈 *Novo Agendamento Recebido!* 💈

{{saudacao_periodo}}, *{{barbeiro_nome}}*! Um novo agendamento acabou de ser realizado:

👤 *Cliente:* {{cliente_nome}}
📱 *Telefone:* {{cliente_telefone}}
🛠️ *Serviço:* {{servico}}
📅 *Data:* {{data}}
⏰ *Horário:* {{horario}}
💬 *Obs:* {{observacoes}}

Acesse o painel para acompanhar sua agenda!`,

  aviso_barbeiro_cancelamento: `💈 *Agendamento Cancelado* 💈

{{saudacao_periodo}}, *{{barbeiro_nome}}*! O seguinte agendamento foi cancelado:

👤 *Cliente:* {{cliente_nome}}
📱 *Telefone:* {{cliente_telefone}}
🛠️ *Serviço:* {{servico}}
📅 *Data:* {{data}} às {{horario}}

O horário foi liberado novamente na sua agenda.`
};

export const evolutionApi = {
  getApiUrl() {
    return (localStorage.getItem('evolution_api_url') || DEFAULT_API_URL).replace(/\/+$/, '');
  },

  getApiKey() {
    return localStorage.getItem('evolution_api_key') || DEFAULT_API_KEY;
  },

  getInstanceName() {
    return localStorage.getItem('evolution_instance') || DEFAULT_INSTANCE;
  },

  async request(endpoint, options = {}) {
    const url = `${this.getApiUrl()}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'apikey': this.getApiKey(),
      ...(options.headers || {})
    };

    const response = await fetch(url, {
      ...options,
      headers
    });

    const data = await response.json().catch(() => ({}));
    return {
      status: response.status,
      ok: response.ok,
      data
    };
  },

  /**
   * Obtém o estado atual da conexão (ex: 'open', 'connecting', 'close')
   */
  async getConnectionState(instanceName = this.getInstanceName()) {
    try {
      const res = await this.request(`/instance/connectionState/${instanceName}`);
      return {
        success: res.ok,
        state: res.data?.instance?.state || 'unknown',
        raw: res.data
      };
    } catch (error) {
      return {
        success: false,
        state: 'error',
        error: error.message
      };
    }
  },

  /**
   * Obtém detalhes da instância (nome, telefone do dono, foto de perfil, etc.)
   */
  async getInstanceDetails(instanceName = this.getInstanceName()) {
    try {
      const res = await this.request(`/instance/fetchInstances?instanceName=${instanceName}`);
      if (Array.isArray(res.data) && res.data.length > 0) {
        return {
          success: true,
          instance: res.data[0]
        };
      }
      return {
        success: false,
        instance: null
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Gera o QR Code para conectar o WhatsApp
   */
  async connect(instanceName = this.getInstanceName()) {
    try {
      const res = await this.request(`/instance/connect/${instanceName}`);
      return {
        success: res.ok,
        base64: res.data?.base64 || null,
        code: res.data?.code || null,
        pairingCode: res.data?.pairingCode || null,
        raw: res.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Desconecta a sessão do WhatsApp (logout)
   */
  async disconnect(instanceName = this.getInstanceName()) {
    try {
      const res = await this.request(`/instance/logout/${instanceName}`, {
        method: 'DELETE'
      });
      return {
        success: res.ok,
        data: res.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Reinicia a instância
   */
  async restart(instanceName = this.getInstanceName()) {
    try {
      const res = await this.request(`/instance/restart/${instanceName}`, {
        method: 'POST'
      });
      return {
        success: res.ok,
        data: res.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Envia presença no WhatsApp (ex: 'composing' para simular "digitando...", 'paused' para parar)
   * Essencial para a Meta registrar atividade humana antes do disparo de mensagens automáticas.
   */
  async sendPresence(number, presence = 'composing', delay = 2500, instanceName = this.getInstanceName()) {
    try {
      let cleanNumber = (number || '').toString().replace(/\D/g, '');
      if (!cleanNumber) return { success: false };
      if (cleanNumber.length <= 11 && !cleanNumber.startsWith('55')) {
        cleanNumber = `55${cleanNumber}`;
      }
      const res = await this.request(`/chat/sendPresence/${instanceName}`, {
        method: 'POST',
        body: JSON.stringify({
          number: cleanNumber,
          presence,
          delay
        })
      });
      return { success: res.ok, data: res.data };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  /**
   * Envia mensagem de texto direta
   */
  async sendTextMessage(number, text, instanceName = this.getInstanceName()) {
    try {
      let cleanNumber = (number || '').toString().replace(/\D/g, '');
      if (!cleanNumber) throw new Error('Número de telefone inválido.');

      if (cleanNumber.length <= 11 && !cleanNumber.startsWith('55')) {
        cleanNumber = `55${cleanNumber}`;
      }

      const res = await this.request(`/message/sendText/${instanceName}`, {
        method: 'POST',
        body: JSON.stringify({
          number: cleanNumber,
          text: text
        })
      });

      return {
        success: res.ok,
        data: res.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Envia mensagem de mídia (imagem, logotipo, documento) com legenda
   */
  async sendMediaMessage(number, mediaUrl, caption = '', mimetype = 'image/jpeg', fileName = 'logo_demattos.jpg', instanceName = this.getInstanceName()) {
    try {
      let cleanNumber = (number || '').toString().replace(/\D/g, '');
      if (!cleanNumber) throw new Error('Número de telefone inválido.');

      if (cleanNumber.length <= 11 && !cleanNumber.startsWith('55')) {
        cleanNumber = `55${cleanNumber}`;
      }

      const res = await this.request(`/message/sendMedia/${instanceName}`, {
        method: 'POST',
        body: JSON.stringify({
          number: cleanNumber,
          mediatype: 'image',
          mimetype,
          caption: caption || '',
          media: mediaUrl,
          fileName
        })
      });

      return {
        success: res.ok,
        data: res.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Envio inteligente com Proteção Anti-Ban Meta e suporte a Mídia/Logo:
   * 1. Verifica janela de horário permitido (evita denúncias de spam durante a noite).
   * 2. Simula ação humana de digitação ("composing") no WhatsApp do destinatário.
   * 3. Aplica delay humanizado com jitter aleatório para quebrar padrões repetitivos.
   * 4. Dispara a mensagem com logo/mídia se fornecido, com fallback seguro para texto simples.
   */
  async sendHumanizedTextMessage(number, text, settingsOverride = null, instanceName = this.getInstanceName(), options = {}) {
    try {
      const settings = settingsOverride || await this.getWhatsAppSettings();

      // 1. Verificação da Janela de Silêncio Noturno (Anti-Denúncia)
      if (settings.antiban_janela_ativa) {
        const now = new Date();
        const currentHours = now.getHours();
        const currentMinutes = now.getMinutes();
        const currentTotalMin = currentHours * 60 + currentMinutes;

        const [iniH, iniM] = (settings.antiban_janela_inicio || '08:00').split(':').map(Number);
        const [fimH, fimM] = (settings.antiban_janela_fim || '21:30').split(':').map(Number);
        const inicioTotalMin = (iniH || 8) * 60 + (iniM || 0);
        const fimTotalMin = (fimH || 21) * 60 + (fimM || 30);

        if (currentTotalMin < inicioTotalMin || currentTotalMin > fimTotalMin) {
          console.warn(`[Anti-Ban] Envio cancelado fora da janela permitida (${settings.antiban_janela_inicio} às ${settings.antiban_janela_fim}). Hora atual: ${now.toLocaleTimeString()}`);
          return {
            success: false,
            skipped: true,
            reason: `Fora da janela de horário permitida (${settings.antiban_janela_inicio} às ${settings.antiban_janela_fim}) para proteger o número contra denúncias de spam.`
          };
        }
      }

      // 2. Simular Digitação ("composing") se ativado
      if (settings.antiban_simular_digitando) {
        try {
          await this.sendPresence(number, 'composing', 2000, instanceName);
          const typingWait = Math.floor(Math.random() * 1200) + 1800; // 1.8s a 3s
          await new Promise(r => setTimeout(r, typingWait));
        } catch (ePresence) {
          // Continua mesmo se o status presence falhar
        }
      }

      // 3. Delay com Jitter aleatório para quebrar padrões da Meta
      const minSec = Math.max(1, settings.antiban_delay_min || 3);
      const maxSec = Math.max(minSec, settings.antiban_delay_max || 8);
      const randomDelayMs = Math.floor(Math.random() * ((maxSec - minSec) * 1000 + 1)) + (minSec * 1000);
      if (randomDelayMs > 0) {
        await new Promise(r => setTimeout(r, randomDelayMs));
      }

      // 4. Envio oficial (com mídia/logo se fornecido, fallback transparente para texto)
      if (options.mediaUrl) {
        try {
          const mediaRes = await this.sendMediaMessage(
            number,
            options.mediaUrl,
            text,
            options.mimetype || 'image/jpeg',
            options.fileName || 'logo_demattos.jpg',
            instanceName
          );
          if (mediaRes.success) {
            return mediaRes;
          }
          console.warn('[WhatsApp] Falha ao enviar com logo/mídia, recorrendo a texto simples:', mediaRes.error);
        } catch (errMedia) {
          console.warn('[WhatsApp] Exceção ao enviar mídia, recorrendo a texto simples:', errMedia.message);
        }
      }

      return await this.sendTextMessage(number, text, instanceName);
    } catch (error) {
      console.error('[Anti-Ban] Erro no envio humanizado, usando envio padrão:', error);
      return await this.sendTextMessage(number, text, instanceName);
    }
  },

  /**
   * Substitui placeholders no modelo de mensagem e aplica variações Spintax
   */
  formatTemplate(template, data = {}, applySpintax = true) {
    if (!template) return '';
    const primeiroNome = (data.cliente_nome || 'Cliente').trim().split(' ')[0];
    const saudacao = getSaudacaoPeriodo();

    let text = template
      .replace(/\{\{\s*saudacao_periodo\s*\}\}/gi, saudacao)
      .replace(/\{\{\s*cliente_primeiro_nome\s*\}\}/gi, primeiroNome)
      .replace(/\{\{\s*cliente_nome\s*\}\}/gi, data.cliente_nome || 'Cliente')
      .replace(/\{\{\s*cliente_telefone\s*\}\}/gi, data.cliente_telefone || data.phone || '')
      .replace(/\{\{\s*barbeiro_nome\s*\}\}/gi, data.barbeiro_nome || data.profissional_nome || 'Luan')
      .replace(/\{\{\s*servico\s*\}\}/gi, data.servico || 'Corte e Barba')
      .replace(/\{\{\s*data\s*\}\}/gi, data.data || '')
      .replace(/\{\{\s*horario\s*\}\}/gi, data.horario || '')
      .replace(/\{\{\s*endereco\s*\}\}/gi, data.endereco || 'R. Rio Tocantins, 328 - Riacho das Pedras, Contagem')
      .replace(/\{\{\s*telefone_barbearia\s*\}\}/gi, data.telefone_barbearia || '(31) 97365-1924')
      .replace(/\{\{\s*observacoes\s*\}\}/gi, data.observacoes || data.message || 'Nenhuma');

    if (applySpintax) {
      text = processSpintax(text);
    }
    return text;
  },

  /**
   * Carrega configurações e modelos de WhatsApp da tabela configuracao
   */
  async getWhatsAppSettings() {
    try {
      const { data: configs } = await supabase
        .from('configuracao')
        .select('chave, valor');

      const map = {};
      (configs || []).forEach(c => {
        map[c.chave] = c.valor;
      });

      return {
        // Modos e Destinatários
        modo_operacao: map.whatsapp_modo_operacao || 'teste', // 'teste' ou 'oficial'
        numero_teste_luan: map.whatsapp_numero_teste_luan || LUAN_DEFAULT_PHONE,

        // Ativação dos Disparos
        confirmacao_ativa: map.whatsapp_confirmacao_ativo !== 'false',
        cancelamento_ativo: map.whatsapp_cancelamento_ativo !== 'false',
        lembrete_ativo: map.whatsapp_lembrete_ativo !== 'false',
        notificar_barbeiro_ativo: map.whatsapp_notificar_barbeiro_ativo !== 'false',

        // Parâmetros de Lembretes & Confirmação
        lembrete_timing: map.whatsapp_lembrete_timing || '1_dia_antes_noite', // '1_dia_antes_noite', '1_dia_antes_24h', '3_horas_antes', '2_horas_antes', '1_hora_antes', 'no_dia_cedo'
        segundo_lembrete_ativo: map.whatsapp_segundo_lembrete_ativo === 'true',
        segundo_lembrete_timing: map.whatsapp_segundo_lembrete_timing || '2_horas_antes',
        confirmacao_delay_modo: map.whatsapp_confirmacao_delay_modo || 'instantaneo', // 'instantaneo' ou 'delay_1_min'

        // Parâmetros de Proteção Anti-Ban Meta
        antiban_simular_digitando: map.whatsapp_antiban_simular_digitando !== 'false',
        antiban_spintax_ativo: map.whatsapp_antiban_spintax_ativo !== 'false',
        antiban_delay_min: Number(map.whatsapp_antiban_delay_min) || 3,
        antiban_delay_max: Number(map.whatsapp_antiban_delay_max) || 8,
        antiban_janela_ativa: map.whatsapp_antiban_janela_ativa !== 'false',
        antiban_janela_inicio: map.whatsapp_antiban_janela_inicio || '08:00',
        antiban_janela_fim: map.whatsapp_antiban_janela_fim || '21:30',
        antiban_limite_hora: Number(map.whatsapp_antiban_limite_hora) || 30,
        antiban_rodape_optout: map.whatsapp_antiban_rodape_optout !== 'false',

        // Identidade Visual e Inclusão da Logo da Barbearia
        whatsapp_incluir_logo: map.whatsapp_incluir_logo !== 'false',
        whatsapp_logo_url: map.whatsapp_logo_url || DEFAULT_LOGO_URL,
        whatsapp_logo_em_confirmacao: map.whatsapp_logo_em_confirmacao !== 'false',
        whatsapp_logo_em_lembrete: map.whatsapp_logo_em_lembrete !== 'false',
        whatsapp_logo_em_cancelamento: map.whatsapp_logo_em_cancelamento !== 'false',
        whatsapp_logo_em_aviso_barbeiro: map.whatsapp_logo_em_aviso_barbeiro === 'true',

        // Modelos de Mensagens
        template_confirmacao: map.whatsapp_template_confirmacao || DEFAULT_TEMPLATES.confirmacao,
        template_cancelamento: map.whatsapp_template_cancelamento || DEFAULT_TEMPLATES.cancelamento,
        template_lembrete: map.whatsapp_template_lembrete || DEFAULT_TEMPLATES.lembrete,
        template_aviso_barbeiro: map.whatsapp_template_aviso_barbeiro || DEFAULT_TEMPLATES.aviso_barbeiro,
      };
    } catch (e) {
      console.error('Erro ao carregar configurações de WhatsApp:', e);
      return {
        modo_operacao: 'teste',
        numero_teste_luan: LUAN_DEFAULT_PHONE,
        confirmacao_ativa: true,
        cancelamento_ativo: true,
        lembrete_ativo: true,
        notificar_barbeiro_ativo: true,
        lembrete_timing: '1_dia_antes_noite',
        segundo_lembrete_ativo: false,
        segundo_lembrete_timing: '2_horas_antes',
        confirmacao_delay_modo: 'instantaneo',
        antiban_simular_digitando: true,
        antiban_spintax_ativo: true,
        antiban_delay_min: 3,
        antiban_delay_max: 8,
        antiban_janela_ativa: true,
        antiban_janela_inicio: '08:00',
        antiban_janela_fim: '21:30',
        antiban_limite_hora: 30,
        antiban_rodape_optout: true,
        whatsapp_incluir_logo: true,
        whatsapp_logo_url: DEFAULT_LOGO_URL,
        whatsapp_logo_em_confirmacao: true,
        whatsapp_logo_em_lembrete: true,
        whatsapp_logo_em_cancelamento: true,
        whatsapp_logo_em_aviso_barbeiro: false,
        template_confirmacao: DEFAULT_TEMPLATES.confirmacao,
        template_cancelamento: DEFAULT_TEMPLATES.cancelamento,
        template_lembrete: DEFAULT_TEMPLATES.lembrete,
        template_aviso_barbeiro: DEFAULT_TEMPLATES.aviso_barbeiro,
      };
    }
  },

  /**
   * Salva configurações e modelos no Supabase
   */
  async saveWhatsAppSettings(settings) {
    try {
      const items = [
        { chave: 'whatsapp_modo_operacao', valor: settings.modo_operacao, descricao: 'Modo do WhatsApp: teste ou oficial' },
        { chave: 'whatsapp_numero_teste_luan', valor: settings.numero_teste_luan, descricao: 'Número do Barbeiro Luan para modo de teste' },
        { chave: 'whatsapp_confirmacao_ativo', valor: String(settings.confirmacao_ativa), descricao: 'Disparo de confirmação ativo' },
        { chave: 'whatsapp_cancelamento_ativo', valor: String(settings.cancelamento_ativo), descricao: 'Disparo de cancelamento ativo' },
        { chave: 'whatsapp_lembrete_ativo', valor: String(settings.lembrete_ativo), descricao: 'Disparo de lembrete ativo' },
        { chave: 'whatsapp_notificar_barbeiro_ativo', valor: String(settings.notificar_barbeiro_ativo), descricao: 'Disparo de aviso ao barbeiro ativo' },
        { chave: 'whatsapp_lembrete_timing', valor: settings.lembrete_timing, descricao: 'Momento de envio do lembrete principal' },
        { chave: 'whatsapp_segundo_lembrete_ativo', valor: String(settings.segundo_lembrete_ativo), descricao: 'Disparo de segundo lembrete ativo' },
        { chave: 'whatsapp_segundo_lembrete_timing', valor: settings.segundo_lembrete_timing, descricao: 'Momento de envio do segundo lembrete' },
        { chave: 'whatsapp_confirmacao_delay_modo', valor: settings.confirmacao_delay_modo, descricao: 'Modo de delay para confirmação' },
        { chave: 'whatsapp_antiban_simular_digitando', valor: String(settings.antiban_simular_digitando), descricao: 'Anti-Ban: Simular digitando' },
        { chave: 'whatsapp_antiban_spintax_ativo', valor: String(settings.antiban_spintax_ativo), descricao: 'Anti-Ban: Variações Spintax ativas' },
        { chave: 'whatsapp_antiban_delay_min', valor: String(settings.antiban_delay_min), descricao: 'Anti-Ban: Delay mínimo em segundos' },
        { chave: 'whatsapp_antiban_delay_max', valor: String(settings.antiban_delay_max), descricao: 'Anti-Ban: Delay máximo em segundos' },
        { chave: 'whatsapp_antiban_janela_ativa', valor: String(settings.antiban_janela_ativa), descricao: 'Anti-Ban: Janela de envio permitida ativa' },
        { chave: 'whatsapp_antiban_janela_inicio', valor: settings.antiban_janela_inicio, descricao: 'Anti-Ban: Início da janela de envio' },
        { chave: 'whatsapp_antiban_janela_fim', valor: settings.antiban_janela_fim, descricao: 'Anti-Ban: Fim da janela de envio' },
        { chave: 'whatsapp_antiban_limite_hora', valor: String(settings.antiban_limite_hora), descricao: 'Anti-Ban: Limite de mensagens por hora' },
        { chave: 'whatsapp_antiban_rodape_optout', valor: String(settings.antiban_rodape_optout), descricao: 'Anti-Ban: Rodapé de remarcação e opt-out cortês' },
        { chave: 'whatsapp_incluir_logo', valor: String(settings.whatsapp_incluir_logo), descricao: 'Identidade: Incluir logo da barbearia' },
        { chave: 'whatsapp_logo_url', valor: settings.whatsapp_logo_url || DEFAULT_LOGO_URL, descricao: 'Identidade: URL da logo da barbearia' },
        { chave: 'whatsapp_logo_em_confirmacao', valor: String(settings.whatsapp_logo_em_confirmacao), descricao: 'Identidade: Logo em confirmação' },
        { chave: 'whatsapp_logo_em_lembrete', valor: String(settings.whatsapp_logo_em_lembrete), descricao: 'Identidade: Logo em lembrete' },
        { chave: 'whatsapp_logo_em_cancelamento', valor: String(settings.whatsapp_logo_em_cancelamento), descricao: 'Identidade: Logo em cancelamento' },
        { chave: 'whatsapp_logo_em_aviso_barbeiro', valor: String(settings.whatsapp_logo_em_aviso_barbeiro), descricao: 'Identidade: Logo em aviso ao barbeiro' },
        { chave: 'whatsapp_template_confirmacao', valor: settings.template_confirmacao, descricao: 'Modelo de mensagem de confirmação' },
        { chave: 'whatsapp_template_cancelamento', valor: settings.template_cancelamento, descricao: 'Modelo de mensagem de cancelamento' },
        { chave: 'whatsapp_template_lembrete', valor: settings.template_lembrete, descricao: 'Modelo de mensagem de lembrete' },
        { chave: 'whatsapp_template_aviso_barbeiro', valor: settings.template_aviso_barbeiro, descricao: 'Modelo de mensagem de aviso ao barbeiro' },
      ];

      for (const item of items) {
        await supabase
          .from('configuracao')
          .upsert(item, { onConflict: 'chave' });
      }

      return { success: true };
    } catch (error) {
      console.error('Erro ao salvar modelos e regras de WhatsApp:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Dispara notificação automática de agendamento respeitando modo oficial vs teste e Anti-Ban
   * @param {'confirmacao'|'cancelamento'|'lembrete'} tipo
   * @param {Object} agendamentoData
   */
  async sendAppointmentNotification(tipo, agendamentoData) {
    try {
      const settings = await this.getWhatsAppSettings();

      // Verificar se o tipo está ativado
      if (tipo === 'confirmacao' && !settings.confirmacao_ativa) return { skipped: true, reason: 'Desativado' };
      if (tipo === 'cancelamento' && !settings.cancelamento_ativo) return { skipped: true, reason: 'Desativado' };
      if (tipo === 'lembrete' && !settings.lembrete_ativo) return { skipped: true, reason: 'Desativado' };

      // Obter template correto
      let template = settings.template_confirmacao;
      if (tipo === 'cancelamento') template = settings.template_cancelamento;
      if (tipo === 'lembrete') template = settings.template_lembrete;

      let formattedText = this.formatTemplate(template, agendamentoData, settings.antiban_spintax_ativo);

      let targetNumber = agendamentoData.cliente_telefone;

      // REGRA DE TESTE VS OFICIAL
      if (settings.modo_operacao === 'teste') {
        targetNumber = settings.numero_teste_luan || LUAN_DEFAULT_PHONE;
        formattedText = `🧪 *[MODO DE TESTE - Destinado a: ${agendamentoData.cliente_nome || 'Cliente'} (${agendamentoData.cliente_telefone || 'Sem número'})]*\n\n${formattedText}`;
        console.log(`[WhatsApp] Disparando em MODO TESTE exclusivamente para o Barbeiro Luan (${targetNumber})`);
      } else {
        console.log(`[WhatsApp] Disparando em MODO OFICIAL com Proteção Anti-Ban para (${targetNumber})`);
      }

      // Definir mídia/logo oficial se configurada
      let mediaUrl = null;
      if (settings.whatsapp_incluir_logo) {
        const logo = settings.whatsapp_logo_url || DEFAULT_LOGO_URL;
        if (tipo === 'confirmacao' && settings.whatsapp_logo_em_confirmacao) mediaUrl = logo;
        if (tipo === 'lembrete' && settings.whatsapp_logo_em_lembrete) mediaUrl = logo;
        if (tipo === 'cancelamento' && settings.whatsapp_logo_em_cancelamento) mediaUrl = logo;
      }

      // Envio humanizado (digitando + jitter + janela de horário + logo/mídia se ativa)
      const res = await this.sendHumanizedTextMessage(targetNumber, formattedText, settings, this.getInstanceName(), { mediaUrl });

      // Registrar histórico em conversa_whatsapp se possível
      try {
        await supabase.from('conversa_whatsapp').insert({
          telefone_cliente: targetNumber,
          role: 'assistant',
          mensagem: formattedText,
          dados_extraidos: {
            tipo,
            agendamento_id: agendamentoData.id || null,
            modo_operacao: settings.modo_operacao,
            cliente_original: agendamentoData.cliente_nome
          }
        });
      } catch (errDb) {
        // Ignora erro de gravação secundária
      }

      return res;
    } catch (e) {
      console.error('[WhatsApp] Erro ao disparar notificação:', e);
      return { success: false, error: e.message };
    }
  },

  /**
   * Notifica o barbeiro sobre um novo agendamento realizado
   * @param {Object} agendamentoData
   * @param {string|null} profissionalTelefone
   */
  async notifyBarberNewAppointment(agendamentoData, profissionalTelefone = null) {
    try {
      const settings = await this.getWhatsAppSettings();
      if (!settings.notificar_barbeiro_ativo) {
        return { skipped: true, reason: 'Notificação ao barbeiro desativada' };
      }

      let template = settings.template_aviso_barbeiro || DEFAULT_TEMPLATES.aviso_barbeiro;
      let formattedText = this.formatTemplate(template, agendamentoData, settings.antiban_spintax_ativo);

      let targetNumber = profissionalTelefone || settings.numero_teste_luan || LUAN_DEFAULT_PHONE;

      if (settings.modo_operacao === 'teste') {
        targetNumber = settings.numero_teste_luan || LUAN_DEFAULT_PHONE;
        formattedText = `🧪 *[MODO DE TESTE - AVISO AO BARBEIRO]*\n\n${formattedText}`;
        console.log(`[WhatsApp] Disparando aviso ao barbeiro em MODO TESTE para (${targetNumber})`);
      } else {
        console.log(`[WhatsApp] Disparando aviso ao barbeiro em MODO OFICIAL para (${targetNumber})`);
      }

      let mediaUrl = null;
      if (settings.whatsapp_incluir_logo && settings.whatsapp_logo_em_aviso_barbeiro) {
        mediaUrl = settings.whatsapp_logo_url || DEFAULT_LOGO_URL;
      }

      const res = await this.sendHumanizedTextMessage(targetNumber, formattedText, settings, this.getInstanceName(), { mediaUrl });

      try {
        await supabase.from('conversa_whatsapp').insert({
          telefone_cliente: targetNumber,
          role: 'assistant',
          mensagem: formattedText,
          dados_extraidos: {
            tipo: 'aviso_barbeiro_novo',
            agendamento_id: agendamentoData.id || null,
            modo_operacao: settings.modo_operacao,
            cliente_nome: agendamentoData.cliente_nome
          }
        });
      } catch (errDb) {
        // Ignora erro secundário
      }

      return res;
    } catch (e) {
      console.error('[WhatsApp] Erro ao notificar barbeiro de novo agendamento:', e);
      return { success: false, error: e.message };
    }
  },

  /**
   * Notifica o barbeiro sobre cancelamento de agendamento
   * @param {Object} agendamentoData
   * @param {string|null} profissionalTelefone
   */
  async notifyBarberCancellation(agendamentoData, profissionalTelefone = null) {
    try {
      const settings = await this.getWhatsAppSettings();
      if (!settings.notificar_barbeiro_ativo) {
        return { skipped: true, reason: 'Notificação ao barbeiro desativada' };
      }

      let template = DEFAULT_TEMPLATES.aviso_barbeiro_cancelamento;
      let formattedText = this.formatTemplate(template, agendamentoData, settings.antiban_spintax_ativo);

      let targetNumber = profissionalTelefone || settings.numero_teste_luan || LUAN_DEFAULT_PHONE;

      if (settings.modo_operacao === 'teste') {
        targetNumber = settings.numero_teste_luan || LUAN_DEFAULT_PHONE;
        formattedText = `🧪 *[MODO DE TESTE - CANCELAMENTO AO BARBEIRO]*\n\n${formattedText}`;
      }

      let mediaUrl = null;
      if (settings.whatsapp_incluir_logo && settings.whatsapp_logo_em_aviso_barbeiro) {
        mediaUrl = settings.whatsapp_logo_url || DEFAULT_LOGO_URL;
      }

      const res = await this.sendHumanizedTextMessage(targetNumber, formattedText, settings, this.getInstanceName(), { mediaUrl });

      try {
        await supabase.from('conversa_whatsapp').insert({
          telefone_cliente: targetNumber,
          role: 'assistant',
          mensagem: formattedText,
          dados_extraidos: {
            tipo: 'aviso_barbeiro_cancelamento',
            agendamento_id: agendamentoData.id || null,
            modo_operacao: settings.modo_operacao,
            cliente_nome: agendamentoData.cliente_nome
          }
        });
      } catch (errDb) {
        // Ignora erro secundário
      }

      return res;
    } catch (e) {
      console.error('[WhatsApp] Erro ao notificar cancelamento ao barbeiro:', e);
      return { success: false, error: e.message };
    }
  }
};
