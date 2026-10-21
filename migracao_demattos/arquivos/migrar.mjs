#!/usr/bin/env node
/**
 * Migração Base44 -> Supabase (Barbearia DeMattos)
 * -------------------------------------------------
 * O que faz:
 *   1. Garante um bucket público de Storage.
 *   2. Faz upload de todos os arquivos de ./arquivos para <bucket>/uploads/.
 *   3. Insere todos os registros de ./dados/<Entidade>.json nas tabelas,
 *      reescrevendo as URLs antigas (Base44 / Supabase antigo) para as novas
 *      URLs públicas do seu Storage.
 *
 * Pré-requisitos:
 *   - Node 18+ (tem fetch nativo).
 *   - Ter rodado antes o 01_schema.sql no seu Supabase.
 *   - npm install  (instala @supabase/supabase-js)
 *
 * Como rodar (Linux/macOS):
 *   export SUPABASE_URL="https://SEU-SUPABASE.seudominio.com"
 *   export SUPABASE_SERVICE_ROLE_KEY="eyJ...service_role..."
 *   export BUCKET="demattos"          # opcional (padrão: demattos)
 *   node migrar.mjs
 *
 * Windows (PowerShell):
 *   $env:SUPABASE_URL="https://SEU-SUPABASE..."
 *   $env:SUPABASE_SERVICE_ROLE_KEY="eyJ..."
 *   node migrar.mjs
 *
 * É SEGURO rodar de novo (idempotente): usa upsert por id e upload com upsert.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET       = process.env.BUCKET || 'demattos';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('ERRO: defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nas variáveis de ambiente.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Entidade Base44 -> tabela Supabase
const TABELAS = {
  Cliente: 'cliente', Servico: 'servico', Produto: 'produto', Agendamento: 'agendamento',
  Configuracao: 'configuracao', ImagemGaleria: 'imagem_galeria', Depoimento: 'depoimento',
  ConversaDeMattos: 'conversa_demattos', Compra: 'compra', ItemCarrinho: 'item_carrinho',
  Profissional: 'profissional', HorarioDisponivel: 'horario_disponivel',
  ConfigAgendaProfissional: 'config_agenda_profissional', ConfiguracaoAssistente: 'configuracao_assistente',
  ImagemHero: 'imagem_hero', SecaoSobre: 'secao_sobre', PacoteCredito: 'pacote_credito',
  TransacaoCredito: 'transacao_credito', CreditoPendente: 'credito_pendente',
  InstagramVideo: 'instagram_video', ConversaWhatsApp: 'conversa_whatsapp', Combo: 'combo',
  TentativaCompra: 'tentativa_compra', ConfiguracoesRastreamento: 'configuracoes_rastreamento',
};

// Ordem de inserção (entidades "pai" antes das que as referenciam)
const ORDEM = [
  'Profissional','Servico','Produto','Combo','PacoteCredito','Cliente','Configuracao',
  'ConfiguracaoAssistente','ConfigAgendaProfissional','ConfiguracoesRastreamento',
  'SecaoSobre','ImagemHero','ImagemGaleria','InstagramVideo','Depoimento',
  'HorarioDisponivel','Agendamento','ItemCarrinho','Compra','TentativaCompra',
  'TransacaoCredito','CreditoPendente','ConversaDeMattos','ConversaWhatsApp',
];

const CT = {
  '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.gif':'image/gif',
  '.webp':'image/webp', '.svg':'image/svg+xml', '.pdf':'application/pdf',
  '.mp4':'video/mp4', '.webm':'video/webm',
};
const contentType = (f) => CT[f.slice(f.lastIndexOf('.')).toLowerCase()] || 'application/octet-stream';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function garantirBucket() {
  const { data } = await supabase.storage.getBucket(BUCKET);
  if (!data) {
    const { error } = await supabase.storage.createBucket(BUCKET, { public: true });
    if (error && !/already exists/i.test(error.message)) throw error;
    console.log(`Bucket "${BUCKET}" criado (público).`);
  } else {
    console.log(`Bucket "${BUCKET}" já existe.`);
  }
}

// Sobe os arquivos e devolve mapa  urlAntiga -> urlNovaPublica
async function subirArquivos() {
  const mapaArquivos = JSON.parse(readFileSync(join(__dirname, 'mapa_arquivos.json'), 'utf8'));
  const dir = join(__dirname, 'arquivos');
  const urlMap = {};
  let ok = 0, faltando = 0;
  for (const { url, name } of mapaArquivos) {
    const caminho = join(dir, name);
    if (!existsSync(caminho)) { console.warn('  ! arquivo nao encontrado localmente:', name); faltando++; continue; }
    const bytes = readFileSync(caminho);
    const dest = `uploads/${name}`;
    const { error } = await supabase.storage.from(BUCKET).upload(dest, bytes, {
      contentType: contentType(name), upsert: true,
    });
    if (error) { console.warn('  ! falha upload', name, error.message); faltando++; continue; }
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(dest);
    urlMap[url] = data.publicUrl;
    ok++;
    if (ok % 10 === 0) console.log(`  ...${ok} arquivos enviados`);
  }
  console.log(`Arquivos: ${ok} enviados, ${faltando} com problema.`);
  return urlMap;
}

// Reescreve recursivamente qualquer string que seja uma URL antiga
function reescrever(valor, urlMap) {
  if (typeof valor === 'string') return urlMap[valor] || valor;
  if (Array.isArray(valor)) return valor.map(v => reescrever(v, urlMap));
  if (valor && typeof valor === 'object') {
    const o = {};
    for (const [k, v] of Object.entries(valor)) o[k] = reescrever(v, urlMap);
    return o;
  }
  return valor;
}

async function inserirEntidade(entidade, urlMap, erros) {
  const tabela = TABELAS[entidade];
  const arq = join(__dirname, 'dados', `${entidade}.json`);
  if (!existsSync(arq)) { console.log(`  (sem arquivo ${entidade}.json)`); return; }
  let rows = JSON.parse(readFileSync(arq, 'utf8'));
  if (!Array.isArray(rows) || rows.length === 0) { console.log(`  ${entidade}: 0 registros`); return; }
  rows = rows.map(r => reescrever(r, urlMap));

  const LOTE = 500;
  let inseridos = 0;
  for (let i = 0; i < rows.length; i += LOTE) {
    const lote = rows.slice(i, i + LOTE);
    const { error } = await supabase.from(tabela).upsert(lote, { onConflict: 'id' });
    if (error) {
      // cai para linha-a-linha para isolar o problema e não perder o resto
      for (const row of lote) {
        const { error: e2 } = await supabase.from(tabela).upsert(row, { onConflict: 'id' });
        if (e2) erros.push({ tabela, id: row.id, erro: e2.message });
        else inseridos++;
      }
    } else {
      inseridos += lote.length;
    }
  }
  console.log(`  ${entidade} -> ${tabela}: ${inseridos}/${rows.length} ok`);
}

(async () => {
  console.log('== Migração Base44 -> Supabase ==');
  console.log('Destino:', SUPABASE_URL, '| bucket:', BUCKET, '\n');

  console.log('1) Storage...');
  await garantirBucket();
  const urlMap = await subirArquivos();

  console.log('\n2) Inserindo dados...');
  const erros = [];
  for (const ent of ORDEM) {
    await inserirEntidade(ent, urlMap, erros);
    await sleep(50);
  }

  if (erros.length) {
    const { writeFileSync } = await import('node:fs');
    writeFileSync(join(__dirname, 'erros_import.json'), JSON.stringify(erros, null, 2));
    console.log(`\n⚠ ${erros.length} registros falharam. Veja erros_import.json`);
  } else {
    console.log('\n✔ Todos os registros inseridos sem erros.');
  }
  console.log('\nConcluído.');
})().catch(e => { console.error('FALHA GERAL:', e); process.exit(1); });
