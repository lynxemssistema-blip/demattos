import { supabase, supabaseAdmin } from '@/lib/supabaseClient';
import { getBrazilHour, getBrazilMinutesNow, getBrazilNowParts } from '@/lib/brazilTime';
import { extractCleanFirstName } from '@/lib/brazilianMaleNames';

// Cache em memória de números já validados na Evolution API (evita repetir chamadas /chat/whatsappNumbers)
const resolvedWhatsAppJidCache = new Map();

// Cache em memória do estado da conexão por instância para evitar chamadas repetidas quando desconectada
const connectionStateCache = new Map();

const VALID_BR_DDDS = new Set([
  '11', '12', '13', '14', '15', '16', '17', '18', '19',
  '21', '22', '24', '27', '28',
  '31', '32', '33', '34', '35', '37', '38',
  '41', '42', '43', '44', '45', '46', '47', '48', '49',
  '51', '53', '54', '55',
  '61', '62', '63', '64', '65', '66', '67', '68', '69',
  '71', '73', '74', '75', '77', '79',
  '81', '82', '83', '84', '85', '86', '87', '88', '89',
  '91', '92', '93', '94', '95', '96', '97', '98', '99'
]);

function isDisconnectedApiResponse(res) {
  if (!res) return false;
  if (res.status === 428 || res.status === 401) return true;
  const outputStatus = res?.data?.output?.statusCode;
  if (outputStatus === 428 || outputStatus === 401) return true;
  try {
    const serialized = JSON.stringify(res.data || {});
    return /connection\s*closed|device_removed|not\s*connected|instance.*not\s*connected|stream\s*errored/i.test(serialized);
  } catch {
    return false;
  }
}

/**
 * Normaliza e valida um número de telefone antes de qualquer chamada à Evolution API.
 * Quando `hasCountryCodeHint` é verdadeiro (ex: JID sincronizado da agenda Evolution),
 * números internacionais com DDI diferente de 55 são preservados sem prefixar `55`.
 */
export function normalizeAndValidatePhone(number, { hasCountryCodeHint = false } = {}) {
  const invalid = {
    valid: false,
    number: null,
    isBrazil: false,
    reason: 'invalid_phone',
    error: 'Número de telefone inválido'
  };

  const digits = String(number || '').replace(/\D/g, '').replace(/^0+/, '');
  if (!digits || digits.length < 10 || digits.length > 15) {
    return invalid;
  }

  if (/^(\d)\1+$/.test(digits) || /^(\d)\1{7,}$/.test(digits.slice(-8))) {
    return invalid;
  }

  const isValidBrWithDdi = (num) => {
    if (!num.startsWith('55') || (num.length !== 12 && num.length !== 13)) return false;
    if (!VALID_BR_DDDS.has(num.slice(2, 4))) return false;
    if (num.length === 13 && num[4] !== '9') return false;
    if (num.length === 12 && !/^[2-9]$/.test(num[4])) return false;
    return true;
  };

  if (hasCountryCodeHint) {
    if (digits.startsWith('55')) {
      return isValidBrWithDdi(digits) ? { valid: true, number: digits, isBrazil: true } : invalid;
    }
    return { valid: true, number: digits, isBrazil: false };
  }

  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    return isValidBrWithDdi(digits) ? { valid: true, number: digits, isBrazil: true } : invalid;
  }

  if (digits.length === 11) {
    if (VALID_BR_DDDS.has(digits.slice(0, 2)) && digits[2] === '9') {
      return { valid: true, number: `55${digits}`, isBrazil: true };
    }
    return invalid;
  }

  if (digits.length === 10) {
    if (VALID_BR_DDDS.has(digits.slice(0, 2)) && /^[2-9]$/.test(digits[2])) {
      return { valid: true, number: `55${digits}`, isBrazil: true };
    }
    return invalid;
  }

  if (digits.length >= 12 && digits.length <= 15 && !digits.startsWith('55')) {
    return { valid: true, number: digits, isBrazil: false };
  }

  return invalid;
}

/**
 * Garante que o link do site em mensagens de convite/marketing leve o parâmetro ?origem=whatsapp
 * para marcar automaticamente os clientes que se cadastrarem ou agendarem pelo link.
 */
export function ensureWhatsAppTrackingLink(text) {
  if (!text || typeof text !== 'string') return '';
  return text.replace(
    /https:\/\/demattos\.lynxems\.com\.br(\/?)(?!\?[a-zA-Z0-9_=&-]*origem=whatsapp)(?=\s|$)/gi,
    'https://demattos.lynxems.com.br/?origem=whatsapp'
  );
}

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
  const hora = getBrazilHour();
  if (hora >= 5 && hora < 12) return 'Bom dia';
  if (hora >= 12 && hora < 18) return 'Boa tarde';
  return 'Boa noite';
}

/**
 * Valida URLs de foto de perfil do WhatsApp CDN (pps.whatsapp.net / fbcdn.net).
 * As URLs assinadas da Meta trazem o parâmetro hexadecimal `oe=` (timestamp Unix de expiração).
 * Filtrar URLs já expiradas ANTES de renderizar <img> elimina 100% dos erros `403 (Forbidden)` no console.
 */
export function sanitizeWhatsAppAvatarUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return null;

  const oeMatch = trimmed.match(/[?&]oe=([0-9a-fA-F]+)/);
  if (oeMatch && oeMatch[1]) {
    const expSec = parseInt(oeMatch[1], 16);
    if (!isNaN(expSec)) {
      // Margem de segurança de 5 minutos antes da expiração
      if (expSec * 1000 <= Date.now() + 5 * 60 * 1000) {
        return null;
      }
    }
  }
  return trimmed;
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

O horário foi liberado novamente na sua agenda.`,

  reagendamento: `{💈 *Barbearia DeMattos* 💈|✂️ *DeMattos Visage* ✂️}

{{saudacao_periodo}}, *{{cliente_nome}}*! {Seu agendamento foi atualizado com sucesso|Confirmamos o novo horário do seu atendimento}. 🔄✅

✂️ *Profissional:* {{barbeiro_nome}}
🛠️ *Serviço:* {{servico}}
📅 *Nova Data:* {{data}}
⏰ *Novo Horário:* {{horario}}
📍 *Endereço:* {{endereco}}

{Te esperamos no novo horário marcado!|Agradecemos a preferência! Qualquer dúvida, fale conosco por aqui.} 💈`,

  aviso_barbeiro_reagendamento: `💈 *Horário de Agendamento Atualizado* 💈

{{saudacao_periodo}}, *{{barbeiro_nome}}*! Um agendamento teve o horário atualizado na agenda:

👤 *Cliente:* {{cliente_nome}}
📱 *Telefone:* {{cliente_telefone}}
🛠️ *Serviço:* {{servico}}
📅 *Nova Data:* {{data}}
⏰ *Novo Horário:* {{horario}}`,

  marketing: `💈 *Barbearia DeMattos* | *Sua Imagem, Seu Sucesso* ✂️🔥

{{saudacao_periodo}}, *{{cliente_primeiro_nome}}*! {Tudo bem com você?|Como você está?|Esperamos que seu dia esteja excelente!}

Você já reparou na diferença que faz um corte alinhado e uma barba bem cuidada na sua rotina? 💼✨

Cuidar do seu visual vai muito além da estética: é sobre *autoestima, autoconfiança e a presença que você transmite em cada ambiente*. Quando você se olha no espelho e se sente impecável, suas reuniões, decisões e momentos de lazer ganham outra energia.

Aqui na *Barbearia DeMattos*, nosso compromisso é valorizar a sua melhor versão com técnica, visagismo e atendimento de alto padrão.

✂️ {Que tal renovar seu estilo para os próximos dias?|Está na hora de dar aquele trato no visual?|Seu estilo e bem-estar merecem esse cuidado.}

📲 *Agende seu próximo horário com facilidade pelo nosso site:*
👉 https://demattos.lynxems.com.br/?origem=whatsapp

_Te esperamos para um café especial e um atendimento diferenciado!_ ☕💈`
};

export const evolutionApi = {
  getApiUrl() {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('evolution_api_url') : null;
    return (stored || DEFAULT_API_URL).replace(/\/+$/, '');
  },

  getApiKey() {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('evolution_api_key') : null;
    return stored || DEFAULT_API_KEY;
  },

  getInstanceName() {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('evolution_instance') : null;
    return stored || DEFAULT_INSTANCE;
  },

  markInstanceDisconnected(instanceName = this.getInstanceName()) {
    connectionStateCache.set(instanceName, { state: 'close', checkedAt: Date.now() });
  },

  async ensureInstanceConnected(instanceName = this.getInstanceName(), { force = false } = {}) {
    const cached = connectionStateCache.get(instanceName);
    if (!force && cached) {
      const ttl = cached.state === 'open' ? 10000 : 5000;
      if (Date.now() - cached.checkedAt < ttl) {
        return { connected: cached.state === 'open', state: cached.state };
      }
    }

    const stateRes = await this.getConnectionState(instanceName);
    return {
      connected: !!stateRes.success && stateRes.state === 'open',
      state: stateRes.state
    };
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
      const state = res.data?.instance?.state || 'unknown';
      connectionStateCache.set(instanceName, { state, checkedAt: Date.now() });
      return {
        success: res.ok,
        state,
        raw: res.data
      };
    } catch (error) {
      connectionStateCache.set(instanceName, { state: 'error', checkedAt: Date.now() });
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
        const inst = { ...res.data[0] };
        inst.profilePicUrl = sanitizeWhatsAppAvatarUrl(inst.profilePicUrl);
        return {
          success: true,
          instance: inst
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
      this.markInstanceDisconnected(instanceName);
      return {
        success: res.ok,
        data: res.data
      };
    } catch (error) {
      this.markInstanceDisconnected(instanceName);
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
      this.markInstanceDisconnected(instanceName);
      return {
        success: res.ok,
        data: res.data
      };
    } catch (error) {
      this.markInstanceDisconnected(instanceName);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Busca todos os contatos individuais sincronizados na agenda da Evolution API
   */
  async getContacts(instanceName = this.getInstanceName()) {
    try {
      const conn = await this.ensureInstanceConnected(instanceName);
      if (!conn.connected) {
        return [];
      }

      const res = await this.request(`/chat/findContacts/${instanceName}`, {
        method: 'POST',
        body: JSON.stringify({})
      });

      if (isDisconnectedApiResponse(res)) {
        this.markInstanceDisconnected(instanceName);
        return [];
      }

      if (res.ok && Array.isArray(res.data)) {
        return res.data
          .filter(c => !c.isGroup && c.remoteJid && c.remoteJid.includes('@s.whatsapp.net'))
          .map(c => {
            const rawPhone = (c.remoteJid || '').split('@')[0].replace(/\D/g, '');
            const norm = normalizeAndValidatePhone(rawPhone, { hasCountryCodeHint: true });
            if (!norm.valid) return null;
            return {
              id: c.id || norm.number,
              nome: (c.pushName || c.name || 'Lead WhatsApp').trim(),
              telefone: norm.number,
              hasCountryCode: true,
              profilePicUrl: sanitizeWhatsAppAvatarUrl(c.profilePicUrl),
              origem: 'agenda_evolution'
            };
          })
          .filter(Boolean);
      }
      return [];
    } catch (error) {
      console.warn('Erro ao buscar contatos da Evolution API:', error);
      return [];
    }
  },

  /**
   * Valida em modo fail-closed se a instância está conectada, se o telefone é válido e se possui conta ativa no WhatsApp
   * (resolvendo o JID exato com ou sem 9º dígito). Caso desconectada, inválida ou sem WhatsApp, desconsidera o envio.
   */
  async resolveValidWhatsAppNumber(number, instanceName = this.getInstanceName(), options = {}) {
    const norm = normalizeAndValidatePhone(number, { hasCountryCodeHint: !!options.hasCountryCodeHint });
    if (!norm.valid) {
      return {
        valid: false,
        number: null,
        skipped: true,
        invalidNumber: true,
        reason: 'invalid_phone',
        error: norm.error
      };
    }

    const conn = await this.ensureInstanceConnected(instanceName);
    if (!conn.connected) {
      return {
        valid: false,
        number: null,
        skipped: true,
        disconnected: true,
        reason: 'instance_disconnected',
        error: 'Instância WhatsApp desconectada'
      };
    }

    const cacheKey = `${instanceName}:${norm.number}`;
    if (resolvedWhatsAppJidCache.has(cacheKey)) {
      return resolvedWhatsAppJidCache.get(cacheKey);
    }

    const candidates = [norm.number];
    // Testar também variante com/sem 9º dígito para celulares brasileiros (55 + DDD + 9 + 8 dígitos <-> 55 + DDD + 8 dígitos)
    if (norm.isBrazil) {
      if (norm.number.length === 13 && norm.number[4] === '9') {
        candidates.push(norm.number.slice(0, 4) + norm.number.slice(5));
      } else if (norm.number.length === 12 && /^[6-9]$/.test(norm.number[4])) {
        candidates.push(norm.number.slice(0, 4) + '9' + norm.number.slice(4));
      }
    }

    try {
      const res = await this.request(`/chat/whatsappNumbers/${instanceName}`, {
        method: 'POST',
        body: JSON.stringify({ numbers: candidates })
      });

      if (isDisconnectedApiResponse(res)) {
        this.markInstanceDisconnected(instanceName);
        return {
          valid: false,
          number: null,
          skipped: true,
          disconnected: true,
          reason: 'instance_disconnected',
          error: 'Instância WhatsApp desconectada'
        };
      }

      if (res.ok && Array.isArray(res.data)) {
        const match = res.data.find(item => item && item.exists === true && item.jid);
        if (match) {
          const resolvedNum = String(match.jid).split('@')[0].replace(/\D/g, '') || norm.number;
          const result = { valid: true, number: resolvedNum, jid: match.jid };
          resolvedWhatsAppJidCache.set(cacheKey, result);
          return result;
        }
        const notFound = {
          valid: false,
          number: norm.number,
          skipped: true,
          invalidNumber: true,
          reason: 'no_whatsapp',
          error: 'Número não possui WhatsApp ativo'
        };
        resolvedWhatsAppJidCache.set(cacheKey, notFound);
        return notFound;
      }

      return {
        valid: false,
        number: null,
        skipped: true,
        apiError: true,
        reason: 'validation_failed',
        error: res?.data?.error || 'Não foi possível validar WhatsApp do número'
      };
    } catch (e) {
      return {
        valid: false,
        number: null,
        skipped: true,
        apiError: true,
        reason: 'validation_failed',
        error: e?.message || 'Não foi possível validar WhatsApp do número'
      };
    }
  },

  /**
   * Envia presença no WhatsApp (ex: 'composing' para simular "digitando...", 'paused' para parar)
   * Essencial para a Meta registrar atividade humana antes do disparo de mensagens automáticas.
   */
  async sendPresence(number, presence = 'composing', delay = 2500, instanceName = this.getInstanceName(), options = {}) {
    try {
      const conn = await this.ensureInstanceConnected(instanceName);
      if (!conn.connected) {
        return {
          success: false,
          skipped: true,
          disconnected: true,
          reason: 'instance_disconnected',
          error: 'Instância WhatsApp desconectada'
        };
      }

      const norm = normalizeAndValidatePhone(number, {
        hasCountryCodeHint: !!options.hasCountryCodeHint || !!options.alreadyValidated
      });
      if (!norm.valid) {
        return {
          success: false,
          skipped: true,
          invalidNumber: true,
          reason: 'invalid_phone',
          error: norm.error
        };
      }

      const res = await this.request(`/chat/sendPresence/${instanceName}`, {
        method: 'POST',
        body: JSON.stringify({
          number: norm.number,
          presence,
          delay
        })
      });

      if (isDisconnectedApiResponse(res)) {
        this.markInstanceDisconnected(instanceName);
        return {
          success: false,
          skipped: true,
          disconnected: true,
          reason: 'instance_disconnected',
          data: res.data,
          error: 'Instância WhatsApp desconectada'
        };
      }

      return { success: res.ok, data: res.data };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  /**
   * Prepara e executa disparo validado (conexão + telefone + WhatsApp ativo) compartilhado entre texto e mídia.
   */
  async _sendValidatedPayload(endpointPath, buildPayload, number, instanceName, options = {}) {
    try {
      const conn = await this.ensureInstanceConnected(instanceName);
      if (!conn.connected) {
        return {
          success: false,
          skipped: true,
          disconnected: true,
          reason: 'instance_disconnected',
          error: 'Instância WhatsApp desconectada'
        };
      }

      let cleanNumber = null;
      if (!options.alreadyValidated) {
        const check = await this.resolveValidWhatsAppNumber(number, instanceName, {
          hasCountryCodeHint: !!options.hasCountryCodeHint
        });
        if (!check.valid || !check.number) {
          return {
            success: false,
            skipped: true,
            invalidNumber: !!check.invalidNumber,
            disconnected: !!check.disconnected,
            apiError: !!check.apiError,
            reason: check.reason,
            error: check.error
          };
        }
        cleanNumber = check.number;
      } else {
        const norm = normalizeAndValidatePhone(number, { hasCountryCodeHint: true });
        if (!norm.valid) {
          return {
            success: false,
            skipped: true,
            invalidNumber: true,
            reason: 'invalid_phone',
            error: norm.error
          };
        }
        cleanNumber = norm.number;
      }

      const res = await this.request(`${endpointPath}/${instanceName}`, {
        method: 'POST',
        body: JSON.stringify(buildPayload(cleanNumber))
      });

      if (isDisconnectedApiResponse(res)) {
        this.markInstanceDisconnected(instanceName);
        return {
          success: false,
          skipped: true,
          disconnected: true,
          reason: 'instance_disconnected',
          data: res.data,
          error: 'Instância WhatsApp desconectada'
        };
      }

      return {
        success: res.ok,
        data: res.data,
        error: res.ok ? null : (res.data?.error || `HTTP ${res.status}`)
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Envia mensagem de texto direta
   */
  async sendTextMessage(number, text, instanceName = this.getInstanceName(), options = {}) {
    return this._sendValidatedPayload(
      '/message/sendText',
      (cleanNumber) => ({ number: cleanNumber, text }),
      number,
      instanceName,
      options
    );
  },

  /**
   * Envia mensagem de mídia (imagem, logotipo, documento) com legenda
   */
  async sendMediaMessage(number, mediaUrl, caption = '', mimetype = 'image/jpeg', fileName = 'logo_demattos.jpg', instanceName = this.getInstanceName(), options = {}) {
    return this._sendValidatedPayload(
      '/message/sendMedia',
      (cleanNumber) => ({
        number: cleanNumber,
        mediatype: 'image',
        mimetype,
        caption: caption || '',
        media: mediaUrl,
        fileName
      }),
      number,
      instanceName,
      options
    );
  },

  /**
   * Envio inteligente com Proteção Anti-Ban Meta e suporte a Mídia/Logo:
   * 0. Verifica se a instância está conectada e se o número possui WhatsApp ativo (fail-closed).
   * 1. Verifica janela de horário permitido (evita denúncias de spam durante a noite).
   * 2. Simula ação humana de digitação ("composing") no WhatsApp do destinatário.
   * 3. Aplica delay humanizado com jitter aleatório para quebrar padrões repetitivos.
   * 4. Dispara a mensagem com logo/mídia se fornecido, com fallback seguro para texto simples.
   */
  async sendHumanizedTextMessage(number, text, settingsOverride = null, instanceName = this.getInstanceName(), options = {}) {
    try {
      // 0a. Se instância desconectada, desconsiderar qualquer ação imediatamente
      const conn = await this.ensureInstanceConnected(instanceName);
      if (!conn.connected) {
        return {
          success: false,
          skipped: true,
          disconnected: true,
          reason: 'instance_disconnected',
          error: 'Instância WhatsApp desconectada'
        };
      }

      // 0b. Validar previamente telefone e conta ativa no WhatsApp (fail-closed)
      const checkRes = await this.resolveValidWhatsAppNumber(number, instanceName, {
        hasCountryCodeHint: !!options.hasCountryCode
      });
      if (!checkRes.valid || !checkRes.number) {
        return {
          success: false,
          skipped: true,
          invalidNumber: !!checkRes.invalidNumber,
          disconnected: !!checkRes.disconnected,
          apiError: !!checkRes.apiError,
          reason: checkRes.reason,
          error: checkRes.error || 'Número inválido ou sem WhatsApp ativo'
        };
      }
      const resolvedNumber = checkRes.number;

      const settings = settingsOverride || await this.getWhatsAppSettings();

      const finalMessageText = options.tipo === 'campanha_marketing'
        ? ensureWhatsAppTrackingLink(text)
        : text;

      // 1. Verificação da Janela de Silêncio Noturno (Anti-Denúncia)
      // Mensagens transacionais imediatas (confirmação que o cliente acabou de fazer, cancelamento, aviso ao barbeiro)
      // NUNCA devem ser bloqueadas, pois o usuário acabou de interagir e aguarda o retorno imediato.
      const isTransactionalImmediate = options.isImmediate || 
                                       options.tipo === 'confirmacao' || 
                                       options.tipo === 'reagendamento' ||
                                       options.tipo === 'aviso_barbeiro_novo' || 
                                       options.tipo === 'aviso_barbeiro_reagendamento' ||
                                       options.tipo === 'cancelamento' || 
                                       options.tipo === 'aviso_barbeiro_cancelamento' ||
                                       options.bypassWindow;

      if (settings.antiban_janela_ativa && !isTransactionalImmediate) {
        const currentTotalMin = getBrazilMinutesNow();
        const { hourStr, minuteStr } = getBrazilNowParts();

        const [iniH, iniM] = (settings.antiban_janela_inicio || '08:00').split(':').map(Number);
        const [fimH, fimM] = (settings.antiban_janela_fim || '23:59').split(':').map(Number);
        const inicioTotalMin = (iniH || 8) * 60 + (iniM || 0);
        const fimTotalMin = (fimH || 23) * 60 + (fimM || 59);

        if (currentTotalMin < inicioTotalMin || currentTotalMin > fimTotalMin) {
          console.warn(`[Anti-Ban] Envio cancelado fora da janela permitida (${settings.antiban_janela_inicio} às ${settings.antiban_janela_fim}). Hora Brasília: ${hourStr}:${minuteStr}`);
          return {
            success: false,
            skipped: true,
            reason: `Fora da janela de horário permitida (${settings.antiban_janela_inicio} às ${settings.antiban_janela_fim}) para proteger o número contra denúncias de spam.`
          };
        }
      }

      // 2. Simular Digitação ("composing"): curto (~800ms) em transacionais imediatas para não congelar no Safari iOS
      if (settings.antiban_simular_digitando) {
        try {
          const presenceMs = isTransactionalImmediate ? 900 : 2000;
          const presenceRes = await this.sendPresence(
            resolvedNumber,
            'composing',
            presenceMs,
            instanceName,
            { alreadyValidated: true, hasCountryCodeHint: true }
          );
          if (presenceRes?.disconnected) {
            return {
              success: false,
              skipped: true,
              disconnected: true,
              reason: 'instance_disconnected',
              error: 'Instância WhatsApp desconectada'
            };
          }
          const typingWait = isTransactionalImmediate
            ? 800
            : (Math.floor(Math.random() * 1200) + 1800);
          await new Promise(r => setTimeout(r, typingWait));
        } catch (ePresence) {
          // Continua mesmo se o status presence falhar
        }
      }

      // 3. Delay Anti-Ban de campanha (SOMENTE para campanhas/disparos em massa; NUNCA segurar confirmações de agendamento por minutos!)
      if (!isTransactionalImmediate) {
        const minSec = Math.max(1, settings.antiban_delay_min || 3);
        const maxSec = Math.max(minSec, settings.antiban_delay_max || 8);
        const randomDelayMs = Math.floor(Math.random() * ((maxSec - minSec) * 1000 + 1)) + (minSec * 1000);
        if (randomDelayMs > 0) {
          await new Promise(r => setTimeout(r, randomDelayMs));
        }
      }

      // 4. Envio oficial (com mídia/logo se fornecido, fallback transparente para texto)
      if (options.mediaUrl) {
        try {
          const mediaRes = await this.sendMediaMessage(
            resolvedNumber,
            options.mediaUrl,
            finalMessageText,
            options.mimetype || 'image/jpeg',
            options.fileName || 'logo_demattos.jpg',
            instanceName,
            { alreadyValidated: true, hasCountryCodeHint: true }
          );
          if (mediaRes.success || mediaRes.disconnected) {
            return mediaRes;
          }
          console.warn('[WhatsApp] Falha ao enviar com logo/mídia, recorrendo a texto simples:', mediaRes.error);
        } catch (errMedia) {
          console.warn('[WhatsApp] Exceção ao enviar mídia, recorrendo a texto simples:', errMedia.message);
        }
      }

      return await this.sendTextMessage(resolvedNumber, finalMessageText, instanceName, {
        alreadyValidated: true,
        hasCountryCodeHint: true
      });
    } catch (error) {
      console.error('[Anti-Ban] Erro no envio humanizado:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Substitui placeholders no modelo de mensagem e aplica variações Spintax
   */
  formatTemplate(template, data = {}, applySpintax = true) {
    if (!template) return '';
    const primeiroNome = extractCleanFirstName(data.cliente_primeiro_nome || data.cliente_nome || 'Amigo');
    const saudacao = getSaudacaoPeriodo();

    const rawDate = String(data.data || '').trim().split('T')[0];
    let dataFormatada = rawDate;
    if (rawDate && rawDate.includes('-')) {
      const parts = rawDate.split('-');
      if (parts.length === 3) {
        dataFormatada = `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }

    const horarioLimpo = String(data.horario || '').trim().slice(0, 5);

    let text = template
      .replace(/\{\{\s*saudacao_periodo\s*\}\}/gi, saudacao)
      .replace(/\{\{\s*cliente_primeiro_nome\s*\}\}/gi, primeiroNome)
      .replace(/\{\{\s*cliente_nome\s*\}\}/gi, data.cliente_nome || 'Cliente')
      .replace(/\{\{\s*cliente_telefone\s*\}\}/gi, data.cliente_telefone || data.phone || '')
      .replace(/\{\{\s*barbeiro_nome\s*\}\}/gi, data.barbeiro_nome || data.profissional_nome || 'Luan')
      .replace(/\{\{\s*servico\s*\}\}/gi, data.servico || 'Corte e Barba')
      .replace(/\{\{\s*data\s*\}\}/gi, dataFormatada)
      .replace(/\{\{\s*horario\s*\}\}/gi, horarioLimpo)
      .replace(/\{\{\s*endereco\s*\}\}/gi, data.endereco || 'R. Rio Tocantins, 328 - Riacho das Pedras, Contagem')
      .replace(/\{\{\s*telefone_barbearia\s*\}\}/gi, data.telefone_barbearia || '(31) 97365-1924')
      .replace(/\{\{\s*numero_agendamento\s*\}\}/gi, data.codigo_unico || (data.numero_agendamento ? `#${data.numero_agendamento}` : ''))
      .replace(/\{\{\s*codigo_agendamento\s*\}\}/gi, data.codigo_unico || (data.numero_agendamento ? `#${data.numero_agendamento}` : ''))
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
        template_marketing: map.whatsapp_template_marketing || DEFAULT_TEMPLATES.marketing,
        marketing_imagem_url: map.whatsapp_marketing_imagem_url || DEFAULT_LOGO_URL,
        marketing_incluir_imagem: map.whatsapp_marketing_incluir_imagem !== 'false',
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
        template_marketing: DEFAULT_TEMPLATES.marketing,
        marketing_imagem_url: DEFAULT_LOGO_URL,
        marketing_incluir_imagem: true,
      };
    }
  },

  /**
   * Atualiza uma chave única no banco de dados Supabase imediatamente
   */
  async updateSingleSetting(chave, valor, descricao = '') {
    try {
      const valStr = typeof valor === 'boolean' ? String(valor) : String(valor ?? '');
      const { error } = await supabaseAdmin
        .from('configuracao')
        .upsert(
          { chave, valor: valStr, descricao: descricao || chave },
          { onConflict: 'chave' }
        );
      if (error) {
        console.error(`Erro ao salvar chave ${chave}:`, error);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (e) {
      console.error(`Erro ao salvar chave ${chave}:`, e);
      return { success: false, error: e.message };
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
        { chave: 'whatsapp_template_marketing', valor: settings.template_marketing || DEFAULT_TEMPLATES.marketing, descricao: 'Modelo de mensagem de marketing e autoestima' },
        { chave: 'whatsapp_marketing_imagem_url', valor: settings.marketing_imagem_url || DEFAULT_LOGO_URL, descricao: 'URL da imagem da campanha de marketing' },
        { chave: 'whatsapp_marketing_incluir_imagem', valor: String(settings.marketing_incluir_imagem !== false), descricao: 'Incluir imagem na campanha de marketing' },
      ];

      for (const item of items) {
        await supabaseAdmin
          .from('configuracao')
          .upsert(item, { onConflict: 'chave' });
      }

      return { success: true };
    } catch (error) {
      console.error('Erro ao salvar modelos e regras de WhatsApp:', error);
      return { success: false, error: error.message };
    }
  },

  async _logSentNotification(telefoneCliente, mensagem, dadosExtraidos) {
    try {
      await supabaseAdmin.from('conversa_whatsapp').insert({
        telefone_cliente: telefoneCliente,
        role: 'assistant',
        mensagem,
        dados_extraidos: {
          ...dadosExtraidos,
          status: 'enviado'
        }
      });
    } catch (errDb) {
      // Ignora erro secundário de log
    }
  },

  /**
   * Dispara notificação de agendamento respeitando modo oficial vs teste e Anti-Ban
   * @param {'confirmacao'|'cancelamento'|'lembrete'|'aviso_barbeiro'|'personalizada'} tipo
   * @param {Object} agendamentoData
   * @param {Object} [options]
   */
  async sendAppointmentNotification(tipo, agendamentoData, options = {}) {
    try {
      const instanceName = this.getInstanceName();
      const conn = await this.ensureInstanceConnected(instanceName);
      if (!conn.connected) {
        return { success: false, skipped: true, disconnected: true, reason: 'Instância WhatsApp desconectada' };
      }

      const settings = await this.getWhatsAppSettings();

      // Se for mensagem customizada direta (acionada pelo admin), não barra por switch inativo
      if (!options.customMessage) {
        if ((tipo === 'confirmacao' || tipo === 'reagendamento') && !settings.confirmacao_ativa) return { skipped: true, reason: 'Desativado' };
        if (tipo === 'cancelamento' && !settings.cancelamento_ativo) return { skipped: true, reason: 'Desativado' };
        if (tipo === 'lembrete' && !settings.lembrete_ativo) return { skipped: true, reason: 'Desativado' };
        if ((tipo === 'aviso_barbeiro' || tipo === 'aviso_barbeiro_reagendamento') && !settings.notificar_barbeiro_ativo) return { skipped: true, reason: 'Desativado' };
      }

      // Obter template correto
      let template = settings.template_confirmacao;
      if (tipo === 'reagendamento') template = DEFAULT_TEMPLATES.reagendamento;
      if (tipo === 'cancelamento') template = settings.template_cancelamento;
      if (tipo === 'lembrete') template = settings.template_lembrete;
      if (tipo === 'aviso_barbeiro') template = settings.template_aviso_barbeiro;
      if (tipo === 'aviso_barbeiro_reagendamento') template = DEFAULT_TEMPLATES.aviso_barbeiro_reagendamento;

      let formattedText = options.customMessage
        ? options.customMessage
        : this.formatTemplate(template, agendamentoData, settings.antiban_spintax_ativo);

      let targetNumber = options.targetPhone || agendamentoData.cliente_telefone;

      if ((tipo === 'aviso_barbeiro' || tipo === 'aviso_barbeiro_reagendamento') && !options.targetPhone) {
        targetNumber = agendamentoData.profissional_telefone || settings.numero_teste_luan || LUAN_DEFAULT_PHONE;
      }

      // REGRA DE TESTE VS OFICIAL
      if (settings.modo_operacao === 'teste') {
        targetNumber = settings.numero_teste_luan || LUAN_DEFAULT_PHONE;
        formattedText = `🧪 *[MODO DE TESTE - Destinado a: ${agendamentoData.cliente_nome || 'Cliente'} (${agendamentoData.cliente_telefone || 'Sem número'})]*\n\n${formattedText}`;
        console.log(`[WhatsApp] Disparando em MODO TESTE exclusivamente para o Barbeiro Luan (${targetNumber})`);
      } else {
        console.log(`[WhatsApp] Disparando em MODO OFICIAL com Proteção Anti-Ban para (${targetNumber})`);
      }

      const targetNorm = normalizeAndValidatePhone(targetNumber);
      if (!targetNorm.valid) {
        return { success: false, skipped: true, invalidNumber: true, reason: 'Número de telefone inválido' };
      }

      // Definir mídia/logo oficial se configurada
      let mediaUrl = null;
      if (settings.whatsapp_incluir_logo) {
        const logo = settings.whatsapp_logo_url || DEFAULT_LOGO_URL;
        if ((tipo === 'confirmacao' || tipo === 'reagendamento') && settings.whatsapp_logo_em_confirmacao) mediaUrl = logo;
        if (tipo === 'lembrete' && settings.whatsapp_logo_em_lembrete) mediaUrl = logo;
        if (tipo === 'cancelamento' && settings.whatsapp_logo_em_cancelamento) mediaUrl = logo;
        if ((tipo === 'aviso_barbeiro' || tipo === 'aviso_barbeiro_reagendamento') && settings.whatsapp_logo_em_aviso_barbeiro) mediaUrl = logo;
      }

      // Envio humanizado (digitando + jitter + janela de horário + logo/mídia se ativa)
      const res = await this.sendHumanizedTextMessage(
        targetNorm.number,
        formattedText,
        settings,
        instanceName,
        { mediaUrl, tipo, isImmediate: true }
      );

      // Registrar histórico em conversa_whatsapp somente quando o envio foi efetivamente concluído
      if (res && res.success) {
        await this._logSentNotification(targetNorm.number, formattedText, {
          tipo,
          agendamento_id: agendamentoData.id || null,
          modo_operacao: settings.modo_operacao,
          cliente_original: agendamentoData.cliente_nome
        });
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
      const instanceName = this.getInstanceName();
      const conn = await this.ensureInstanceConnected(instanceName);
      if (!conn.connected) {
        return { success: false, skipped: true, disconnected: true, reason: 'Instância WhatsApp desconectada' };
      }

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

      const targetNorm = normalizeAndValidatePhone(targetNumber);
      if (!targetNorm.valid) {
        return { success: false, skipped: true, invalidNumber: true, reason: 'Número de telefone inválido' };
      }

      let mediaUrl = null;
      if (settings.whatsapp_incluir_logo && settings.whatsapp_logo_em_aviso_barbeiro) {
        mediaUrl = settings.whatsapp_logo_url || DEFAULT_LOGO_URL;
      }

      const res = await this.sendHumanizedTextMessage(
        targetNorm.number,
        formattedText,
        settings,
        instanceName,
        { mediaUrl, tipo: 'aviso_barbeiro_novo', isImmediate: true }
      );

      if (res && res.success) {
        await this._logSentNotification(targetNorm.number, formattedText, {
          tipo: 'aviso_barbeiro_novo',
          agendamento_id: agendamentoData.id || null,
          modo_operacao: settings.modo_operacao,
          cliente_nome: agendamentoData.cliente_nome
        });
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
      const instanceName = this.getInstanceName();
      const conn = await this.ensureInstanceConnected(instanceName);
      if (!conn.connected) {
        return { success: false, skipped: true, disconnected: true, reason: 'Instância WhatsApp desconectada' };
      }

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

      const targetNorm = normalizeAndValidatePhone(targetNumber);
      if (!targetNorm.valid) {
        return { success: false, skipped: true, invalidNumber: true, reason: 'Número de telefone inválido' };
      }

      let mediaUrl = null;
      if (settings.whatsapp_incluir_logo && settings.whatsapp_logo_em_aviso_barbeiro) {
        mediaUrl = settings.whatsapp_logo_url || DEFAULT_LOGO_URL;
      }

      const res = await this.sendHumanizedTextMessage(
        targetNorm.number,
        formattedText,
        settings,
        instanceName,
        { mediaUrl, tipo: 'aviso_barbeiro_cancelamento', isImmediate: true }
      );

      if (res && res.success) {
        await this._logSentNotification(targetNorm.number, formattedText, {
          tipo: 'aviso_barbeiro_cancelamento',
          agendamento_id: agendamentoData.id || null,
          modo_operacao: settings.modo_operacao,
          cliente_nome: agendamentoData.cliente_nome
        });
      }

      return res;
    } catch (e) {
      console.error('[WhatsApp] Erro ao notificar cancelamento ao barbeiro:', e);
      return { success: false, error: e.message };
    }
  }
};
