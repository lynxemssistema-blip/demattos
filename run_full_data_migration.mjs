import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const SUPABASE_URL = 'https://supabase-supabasedemattos.1cnep6.easypanel.host';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q';
const BUCKET = 'public-media';

const BASE_DIR = 'c:\\Users\\lynx\\Documents\\barbearia-de-mattos\\migracao_demattos\\arquivos';
const DADOS_DIR = join(BASE_DIR, 'dados');

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const TABLE_COLUMNS = {
  agendamento: [
    "id", "cliente_nome", "cliente_telefone", "profissional_id", "profissional_nome",
    "servico", "data", "horario", "horario_fim", "duracao_total", "observacoes",
    "status", "agendamento_recorrente_id", "eh_recorrente", "possivel_atraso",
    "confirmado_automaticamente", "created_date", "updated_date", "created_by"
  ],
  cliente: [
    "id", "nome", "telefone", "email", "instagram", "facebook", "profissao",
    "foto_url", "data_nascimento", "observacoes", "tem_canal", "senha_canal",
    "ai_credits", "cadastrado_via_whatsapp", "created_date", "updated_date", "created_by"
  ],
  combo: [
    "id", "nome", "descricao", "produtos_ids", "preco", "imagem_url", "instagram_url",
    "stripe_product_id", "stripe_price_id", "ativo", "created_date", "updated_date", "created_by"
  ],
  compra: [
    "id", "cliente_id", "cliente_email", "produto_id", "produto_nome", "produto_tipo",
    "produto_arquivo_pdf_url", "valor", "status_pagamento", "stripe_payment_intent_id",
    "stripe_session_id", "created_date", "updated_date", "created_by"
  ],
  config_agenda_profissional: [
    "id", "profissional_id", "dias_semana", "horario_inicio", "horario_fim",
    "horario_almoco_inicio", "horario_almoco_fim", "intervalo_minutos",
    "created_date", "updated_date", "created_by"
  ],
  configuracao: [
    "id", "chave", "valor", "descricao", "created_date", "updated_date", "created_by"
  ],
  configuracao_assistente: [
    "id", "voz_tipo", "velocidade_fala", "tom_voz", "volume", "audio_respostas_ativo",
    "audio_entrada_ativo", "ativo", "created_date", "updated_date", "created_by"
  ],
  configuracoes_rastreamento: [
    "id", "facebook_pixel_id", "google_tag_manager_id", "created_date", "updated_date", "created_by"
  ],
  conversa_demattos: [
    "id", "cliente_id", "role", "mensagem", "fotos_urls", "previa_url",
    "created_date", "updated_date", "created_by"
  ],
  conversa_whatsapp: [
    "id", "telefone_cliente", "role", "mensagem", "dados_extraidos",
    "created_date", "updated_date", "created_by"
  ],
  credito_pendente: [
    "id", "usuario_email", "quantidade", "admin_que_concedeu", "observacao",
    "aplicado", "created_date", "updated_date", "created_by"
  ],
  depoimento: [
    "id", "cliente_id", "cliente_nome", "cliente_profissao", "cliente_foto_url",
    "texto", "avaliacao", "enviado_para_aprovacao", "aprovado",
    "created_date", "updated_date", "created_by"
  ],
  horario_disponivel: [
    "id", "profissional_id", "profissional_nome", "data", "horario", "disponivel",
    "created_date", "updated_date", "created_by"
  ],
  imagem_galeria: [
    "id", "url", "alt", "colSpan", "rowSpan", "ordem", "created_date", "updated_date", "created_by"
  ],
  imagem_hero: [
    "id", "url", "alt", "ordem", "ativo", "created_date", "updated_date", "created_by"
  ],
  instagram_video: [
    "id", "titulo", "url_instagram", "thumbnail_url", "video_url", "descricao",
    "ordem", "ativo", "created_date", "updated_date", "created_by"
  ],
  item_carrinho: [
    "id", "cliente_email", "item_tipo", "item_id", "item_nome", "item_preco",
    "quantidade", "produto_tipo", "produto_arquivo_pdf_url",
    "created_date", "updated_date", "created_by"
  ],
  pacote_credito: [
    "id", "nome", "quantidade_tokens", "preco_reais", "stripe_price_id",
    "desconto_percentual", "destaque", "ativo", "created_date", "updated_date", "created_by"
  ],
  produto: [
    "id", "nome", "descricao", "tipo", "preco", "estoque", "imagem_url",
    "arquivo_pdf_url", "arquivo_previa_url", "creditos_ia", "destaque_home",
    "exibir_no_catalogo", "ativo", "stripe_product_id", "stripe_price_id",
    "created_date", "updated_date", "created_by"
  ],
  profissional: [
    "id", "nome", "email", "telefone", "foto_url", "historico_profissional",
    "servicos_ids", "senha_acesso", "tem_acesso_admin", "destaque_home", "ativo",
    "created_date", "updated_date", "created_by"
  ],
  secao_sobre: [
    "id", "tag_superior", "titulo_parte1", "titulo_parte2", "paragrafo1", "paragrafo2",
    "paragrafo3", "imagem_url", "destaque1_titulo", "destaque1_subtitulo",
    "destaque2_titulo", "destaque2_subtitulo", "atendimentos_base",
    "created_date", "updated_date", "created_by"
  ],
  servico: [
    "id", "nome", "descricao", "preco", "duracao", "icone", "destaque_home",
    "exibir_no_catalogo", "ativo", "created_date", "updated_date", "created_by"
  ],
  tentativa_compra: [
    "id", "stripe_session_id", "stripe_payment_intent_id", "cliente_email", "cliente_id",
    "origem", "itens", "valor_total", "status", "recibo_stripe", "recibo_url",
    "created_date", "updated_date", "created_by"
  ],
  transacao_credito: [
    "id", "usuario_id", "usuario_email", "tipo", "quantidade", "valor_pago",
    "pacote_id", "stripe_payment_intent_id", "stripe_session_id", "admin_que_concedeu",
    "observacao", "created_date", "updated_date", "created_by"
  ]
};

const TABELAS = {
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
  ConfiguracoesRastreamento: 'configuracoes_rastreamento'
};

const ORDEM = [
  'Profissional', 'Servico', 'Produto', 'Combo', 'PacoteCredito', 'Cliente', 'Configuracao',
  'ConfiguracaoAssistente', 'ConfigAgendaProfissional', 'ConfiguracoesRastreamento',
  'SecaoSobre', 'ImagemHero', 'ImagemGaleria', 'InstagramVideo', 'Depoimento',
  'HorarioDisponivel', 'Agendamento', 'ItemCarrinho', 'Compra', 'TentativaCompra',
  'TransacaoCredito', 'CreditoPendente', 'ConversaDeMattos', 'ConversaWhatsApp'
];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function obterMapaDeUrls() {
  const mapaArquivos = JSON.parse(readFileSync(join(BASE_DIR, 'mapa_arquivos.json'), 'utf8'));
  const urlMap = {};
  for (const { url, name } of mapaArquivos) {
    const dest = `uploads/${name}`;
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(dest);
    urlMap[url] = data.publicUrl;
  }
  return urlMap;
}

function reescrever(valor, urlMap) {
  if (typeof valor === 'string') return urlMap[valor] || valor;
  if (Array.isArray(valor)) return valor.map(v => reescrever(v, urlMap));
  if (valor && typeof valor === 'object') {
    const o = {};
    for (const [k, v] of Object.entries(valor)) {
      o[k] = reescrever(v, urlMap);
    }
    return o;
  }
  return valor;
}

function sanitizarLinha(row, validColumns) {
  const clean = {};
  for (const col of validColumns) {
    if (row[col] !== undefined) {
      if ((col === 'data_nascimento' || col === 'data') && row[col] === '') {
        clean[col] = null;
      } else {
        clean[col] = row[col];
      }
    }
  }
  return clean;
}

async function migrarDados(urlMap) {
  console.log('--- Inserindo dados nas 24 tabelas do PostgreSQL ---');
  let totalInseridos = 0;
  const totalErros = [];

  for (const entidade of ORDEM) {
    const tabela = TABELAS[entidade];
    const arquivoPath = join(DADOS_DIR, `${entidade}.json`);
    const validCols = TABLE_COLUMNS[tabela];

    if (!validCols) {
      console.warn(`[Aviso] Colunas não mapeadas para tabela ${tabela}`);
      continue;
    }

    if (!existsSync(arquivoPath)) {
      continue;
    }

    let rows = JSON.parse(readFileSync(arquivoPath, 'utf8'));
    if (!Array.isArray(rows) || rows.length === 0) {
      console.log(`[0 registros] ${entidade}`);
      continue;
    }

    // 1. Reescreve URLs para as novas URLs do Supabase Storage
    rows = rows.map(r => reescrever(r, urlMap));

    // 2. Sanitiza linhas removendo campos que não existem no banco
    rows = rows.map(r => sanitizarLinha(r, validCols));

    const LOTE = 200;
    let inseridos = 0;

    for (let i = 0; i < rows.length; i += LOTE) {
      const lote = rows.slice(i, i + LOTE);
      const { error } = await supabase.from(tabela).upsert(lote, { onConflict: 'id' });

      if (error) {
        console.warn(`Lote com erro em ${tabela}:`, error.message, 'Tentando linha a linha...');
        for (const row of lote) {
          const { error: singleError } = await supabase.from(tabela).upsert(row, { onConflict: 'id' });
          if (singleError) {
            totalErros.push({ tabela, id: row.id, error: singleError.message });
          } else {
            inseridos++;
          }
        }
      } else {
        inseridos += lote.length;
      }
    }

    totalInseridos += inseridos;
    console.log(`✔ ${entidade} -> tabela '${tabela}': ${inseridos}/${rows.length} registros inseridos com sucesso!`);
    await sleep(20);
  }

  console.log(`\n========================================`);
  console.log(`TOTAL DE REGISTROS INSERIDOS: ${totalInseridos}`);
  if (totalErros.length > 0) {
    console.warn(`Total de erros: ${totalErros.length}`, totalErros.slice(0, 3));
  } else {
    console.log(`STATUS: 100% de sucesso sem nenhum erro!`);
  }
  console.log(`========================================\n`);
}

async function main() {
  console.log('Iniciando migração de dados com sanitização de colunas...');
  const urlMap = obterMapaDeUrls();
  console.log(`Mapa de URLs pronto (${Object.keys(urlMap).length} URLs mapeadas para o Storage).`);
  await migrarDados(urlMap);
  console.log('Migração finalizada!');
}

main().catch(console.error);
