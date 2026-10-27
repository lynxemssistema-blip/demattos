import { supabase } from '@/lib/supabaseClient';

const DEFAULT_API_URL = import.meta.env.VITE_EVOLUTION_API_URL || 'https://evo.lynxems.com.br';
const DEFAULT_API_KEY = import.meta.env.VITE_EVOLUTION_API_KEY || 'F10230BCFE78-4B5A-80F3-789AD4E58B79';
const DEFAULT_INSTANCE = import.meta.env.VITE_EVOLUTION_INSTANCE || 'DeMattos';
export const LUAN_DEFAULT_PHONE = '5531973651924';

export const DEFAULT_TEMPLATES = {
  confirmacao: `💈 *Barbearia DeMattos* 💈

Olá, *{{cliente_nome}}*! Seu agendamento foi confirmado com sucesso. ✅

✂️ *Profissional:* {{barbeiro_nome}}
🛠️ *Serviço:* {{servico}}
📅 *Data:* {{data}}
⏰ *Horário:* {{horario}}
📍 *Endereço:* {{endereco}}

Agradecemos a confiança! Caso precise remarcar, nos avise com antecedência.`,

  cancelamento: `💈 *Barbearia DeMattos* 💈

Olá, *{{cliente_nome}}*! Informamos que o seu agendamento foi cancelado. ❌

✂️ *Profissional:* {{barbeiro_nome}}
🛠️ *Serviço:* {{servico}}
📅 *Data:* {{data}} às {{horario}}

Caso deseje reagendar para outro dia ou horário, estamos à total disposição!`,

  lembrete: `💈 *Lembrete de Horário - Barbearia DeMattos* 💈

Olá, *{{cliente_nome}}*! Passando para lembrar do seu horário agendado:

✂️ *Profissional:* {{barbeiro_nome}}
🛠️ *Serviço:* {{servico}}
⏰ *Horário:* {{horario}} ({{data}})
📍 *Endereço:* {{endereco}}

Por favor, chegue com alguns minutos de antecedência. Te esperamos! ✂️🔥`
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
   * Substitui placeholders no modelo de mensagem
   */
  formatTemplate(template, data = {}) {
    if (!template) return '';
    return template
      .replace(/\{\{\s*cliente_nome\s*\}\}/gi, data.cliente_nome || 'Cliente')
      .replace(/\{\{\s*barbeiro_nome\s*\}\}/gi, data.barbeiro_nome || data.profissional_nome || 'Luan')
      .replace(/\{\{\s*servico\s*\}\}/gi, data.servico || 'Corte e Barba')
      .replace(/\{\{\s*data\s*\}\}/gi, data.data || '')
      .replace(/\{\{\s*horario\s*\}\}/gi, data.horario || '')
      .replace(/\{\{\s*endereco\s*\}\}/gi, data.endereco || 'R. Rio Tocantins, 328 - Riacho das Pedras, Contagem')
      .replace(/\{\{\s*telefone_barbearia\s*\}\}/gi, data.telefone_barbearia || '(31) 97365-1924');
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
        modo_operacao: map.whatsapp_modo_operacao || 'teste', // 'teste' ou 'oficial'
        numero_teste_luan: map.whatsapp_numero_teste_luan || LUAN_DEFAULT_PHONE,
        confirmacao_ativa: map.whatsapp_confirmacao_ativo !== 'false',
        cancelamento_ativo: map.whatsapp_cancelamento_ativo !== 'false',
        lembrete_ativo: map.whatsapp_lembrete_ativo !== 'false',
        lembrete_timing: map.whatsapp_lembrete_timing || '3_horas_antes', // '1_dia_antes', '3_horas_antes', '2_horas_antes', '1_hora_antes', 'no_dia_cedo'
        template_confirmacao: map.whatsapp_template_confirmacao || DEFAULT_TEMPLATES.confirmacao,
        template_cancelamento: map.whatsapp_template_cancelamento || DEFAULT_TEMPLATES.cancelamento,
        template_lembrete: map.whatsapp_template_lembrete || DEFAULT_TEMPLATES.lembrete,
      };
    } catch (e) {
      console.error('Erro ao carregar configurações de WhatsApp:', e);
      return {
        modo_operacao: 'teste',
        numero_teste_luan: LUAN_DEFAULT_PHONE,
        confirmacao_ativa: true,
        cancelamento_ativo: true,
        lembrete_ativo: true,
        lembrete_timing: '3_horas_antes',
        template_confirmacao: DEFAULT_TEMPLATES.confirmacao,
        template_cancelamento: DEFAULT_TEMPLATES.cancelamento,
        template_lembrete: DEFAULT_TEMPLATES.lembrete,
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
        { chave: 'whatsapp_lembrete_timing', valor: settings.lembrete_timing, descricao: 'Momento de envio do lembrete' },
        { chave: 'whatsapp_template_confirmacao', valor: settings.template_confirmacao, descricao: 'Modelo de mensagem de confirmação' },
        { chave: 'whatsapp_template_cancelamento', valor: settings.template_cancelamento, descricao: 'Modelo de mensagem de cancelamento' },
        { chave: 'whatsapp_template_lembrete', valor: settings.template_lembrete, descricao: 'Modelo de mensagem de lembrete' },
      ];

      for (const item of items) {
        await supabase
          .from('configuracao')
          .upsert(item, { onConflict: 'chave' });
      }

      return { success: true };
    } catch (error) {
      console.error('Erro ao salvar modelos de WhatsApp:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Dispara notificação automática de agendamento respeitando modo oficial vs teste
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

      let formattedText = this.formatTemplate(template, agendamentoData);

      let targetNumber = agendamentoData.cliente_telefone;

      // REGRA DE TESTE VS OFICIAL
      if (settings.modo_operacao === 'teste') {
        targetNumber = settings.numero_teste_luan || LUAN_DEFAULT_PHONE;
        formattedText = `🧪 *[MODO DE TESTE - Destinado a: ${agendamentoData.cliente_nome || 'Cliente'} (${agendamentoData.cliente_telefone || 'Sem número'})]*\n\n${formattedText}`;
        console.log(`[WhatsApp] Disparando em MODO TESTE exclusivamente para o Barbeiro Luan (${targetNumber})`);
      } else {
        console.log(`[WhatsApp] Disparando em MODO OFICIAL para o cliente (${targetNumber})`);
      }

      const res = await this.sendTextMessage(targetNumber, formattedText);

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
  }
};
