import { supabase } from '@/lib/supabaseClient';

const ENTITY_TABLE_MAP = {
  Cliente: 'cliente',
  Servico: 'servico',
  Produto: 'produto',
  Agendamento: 'agendamento',
  Configuracao: 'configuracao',
  ImagemGaleria: 'imagem_galeria',
  Depoimento: 'depoimento',
  ConversaDeMattos: 'conversa_demattos',
  Compra: 'compra',
  ItemCarrinho: 'item_carrinho',
  Profissional: 'profissional',
  HorarioDisponivel: 'horario_disponivel',
  ConfigAgendaProfissional: 'config_agenda_profissional',
  ConfiguracaoAssistente: 'configuracao_assistente',
  ImagemHero: 'imagem_hero',
  SecaoSobre: 'secao_sobre',
  PacoteCredito: 'pacote_credito',
  TransacaoCredito: 'transacao_credito',
  CreditoPendente: 'credito_pendente',
  InstagramVideo: 'instagram_video',
  ConversaWhatsApp: 'conversa_whatsapp',
  Combo: 'combo',
  TentativaCompra: 'tentativa_compra',
  ConfiguracoesRastreamento: 'configuracoes_rastreamento',
  User: 'profiles',
  Profile: 'profiles',
};

function resolveTableName(entityName) {
  return ENTITY_TABLE_MAP[entityName] || entityName.toLowerCase();
}

function applyOrdering(builder, sort) {
  if (!sort) return builder;
  const isDesc = sort.startsWith('-');
  const column = isDesc ? sort.substring(1) : sort;
  return builder.order(column, { ascending: !isDesc });
}

function createEntityRepository(entityName) {
  const tableName = resolveTableName(entityName);

  return {
    async list(sort = '-created_date', limit = 1000) {
      let builder = supabase.from(tableName).select('*');
      builder = applyOrdering(builder, sort);
      if (limit) {
        builder = builder.limit(limit);
      }
      const { data, error } = await builder;
      if (error) {
        console.error(`Erro ao listar ${entityName} (${tableName}):`, error);
        throw error;
      }
      return data || [];
    },

    async filter(filterObj = {}, sort, limit) {
      let builder = supabase.from(tableName).select('*');
      for (const [key, value] of Object.entries(filterObj)) {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            builder = builder.in(key, value);
          } else {
            builder = builder.eq(key, value);
          }
        }
      }
      if (sort) {
        builder = applyOrdering(builder, sort);
      }
      if (limit) {
        builder = builder.limit(limit);
      }
      const { data, error } = await builder;
      if (error) {
        console.error(`Erro ao filtrar ${entityName} (${tableName}):`, error);
        throw error;
      }
      return data || [];
    },

    async get(id) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', id)
        .single();
      if (error) {
        console.error(`Erro ao obter ${entityName} id ${id}:`, error);
        throw error;
      }
      return data;
    },

    async create(itemData) {
      const { data, error } = await supabase
        .from(tableName)
        .insert([itemData])
        .select()
        .single();
      if (error) {
        console.error(`Erro ao criar ${entityName}:`, error);
        throw error;
      }
      return data;
    },

    async bulkCreate(items) {
      if (!Array.isArray(items) || items.length === 0) return [];
      const { data, error } = await supabase
        .from(tableName)
        .insert(items)
        .select();
      if (error) {
        console.error(`Erro ao criar em lote ${entityName}:`, error);
        throw error;
      }
      return data || [];
    },

    async update(id, updates) {
      const { data, error } = await supabase
        .from(tableName)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) {
        console.error(`Erro ao atualizar ${entityName} id ${id}:`, error);
        throw error;
      }
      return data;
    },

    async delete(id) {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);
      if (error) {
        console.error(`Erro ao deletar ${entityName} id ${id}:`, error);
        throw error;
      }
      return true;
    }
  };
}

// Proxy dinâmico para responder a qualquer entidade chamada (ex: base44.entities.Servico)
export const supabaseEntities = new Proxy({}, {
  get(target, prop) {
    if (typeof prop !== 'string') return undefined;
    if (!target[prop]) {
      target[prop] = createEntityRepository(prop);
    }
    return target[prop];
  }
});
