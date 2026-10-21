-- =====================================================================
-- MIGRAÇÃO BASE44 -> SUPABASE (PostgreSQL)
-- App: "Barbearia DeMattos"  (Base44 app id: 694fc9a4353fcf7bf1d594ed)
-- Gerado a partir do JSON Schema das entidades do Base44.
--
-- COMO USAR:
--   1. No seu Supabase (VPS), abra o SQL Editor (ou use psql).
--   2. Rode este arquivo inteiro, de cima para baixo.
--   3. Revise as POLÍTICAS DE RLS no final: são um ponto de PARTIDA seguro,
--      ajuste conforme os fluxos públicos do seu app.
--
-- DECISÕES DE MODELAGEM:
--   * id = text (preserva os IDs originais do Base44 ao importar dados e
--     mantém as referências por string usadas no app, ex.: profissional_id).
--     Para novos registros gera um uuid em texto. Se for começar SEM dados,
--     pode trocar por:  id uuid primary key default gen_random_uuid()
--   * Campos de sistema do Base44 em todas as tabelas:
--     created_date, updated_date, created_by (e-mail de quem criou).
--   * enums do Base44 viram CHECK constraints (preservam os valores válidos).
--   * array<string> -> text[] | array<number> -> integer[] | object -> jsonb.
-- =====================================================================

create extension if not exists "pgcrypto";   -- gen_random_uuid()

-- ---------------------------------------------------------------------
-- Função util: atualiza updated_date automaticamente em cada UPDATE
-- ---------------------------------------------------------------------
create or replace function public.set_updated_date()
returns trigger language plpgsql as $$
begin
  new.updated_date = now();
  return new;
end;
$$;

-- =====================================================================
-- TABELAS
-- =====================================================================

-- CLIENTE ------------------------------------------------------------
create table public.cliente (
  id            text primary key default gen_random_uuid()::text,
  nome          text not null,
  telefone      text not null,
  email         text not null,
  instagram     text,
  facebook      text,
  profissao     text,
  foto_url      text,
  data_nascimento date,
  observacoes   text,
  tem_canal     boolean default false,
  senha_canal   text,
  ai_credits    numeric default 0,
  cadastrado_via_whatsapp boolean default false,
  created_date  timestamptz not null default now(),
  updated_date  timestamptz not null default now(),
  created_by    text
);

-- SERVICO ------------------------------------------------------------
create table public.servico (
  id            text primary key default gen_random_uuid()::text,
  nome          text not null,
  descricao     text,
  preco         numeric(12,2) not null,
  duracao       integer not null,                      -- minutos
  icone         text default 'Scissors' check (icone in ('Scissors','Sparkles','Droplets','Crown')),
  destaque_home boolean default false,
  exibir_no_catalogo boolean default false,
  ativo         boolean default true,
  created_date  timestamptz not null default now(),
  updated_date  timestamptz not null default now(),
  created_by    text
);

-- PRODUTO ------------------------------------------------------------
create table public.produto (
  id            text primary key default gen_random_uuid()::text,
  nome          text not null,
  descricao     text,
  tipo          text default 'fisico' check (tipo in ('fisico','digital')),
  preco         numeric(12,2) not null,
  estoque       integer default 0,
  imagem_url    text,
  arquivo_pdf_url text,
  arquivo_previa_url text,
  creditos_ia   integer default 0,
  destaque_home boolean default false,
  exibir_no_catalogo boolean default false,
  ativo         boolean default true,
  stripe_product_id text,
  stripe_price_id text,
  created_date  timestamptz not null default now(),
  updated_date  timestamptz not null default now(),
  created_by    text
);

-- AGENDAMENTO --------------------------------------------------------
create table public.agendamento (
  id               text primary key default gen_random_uuid()::text,
  cliente_nome     text not null,
  cliente_telefone text not null,
  profissional_id  text not null,
  profissional_nome text,
  servico          text not null,
  data             date not null,
  horario          text not null,
  horario_fim      text,
  duracao_total    integer,
  observacoes      text,
  status           text default 'pendente' check (status in ('pendente','confirmado','realizado','cancelado')),
  agendamento_recorrente_id text,
  eh_recorrente    boolean default false,
  possivel_atraso  boolean default false,
  confirmado_automaticamente boolean default false,
  created_date     timestamptz not null default now(),
  updated_date     timestamptz not null default now(),
  created_by       text
);

-- CONFIGURACAO (chave/valor) ----------------------------------------
create table public.configuracao (
  id            text primary key default gen_random_uuid()::text,
  chave         text not null unique,
  valor         text not null,
  descricao     text,
  created_date  timestamptz not null default now(),
  updated_date  timestamptz not null default now(),
  created_by    text
);

-- IMAGEM_GALERIA -----------------------------------------------------
create table public.imagem_galeria (
  id            text primary key default gen_random_uuid()::text,
  url           text not null,
  alt           text not null,
  "colSpan"     text default 'col-span-1' check ("colSpan" in ('col-span-1','col-span-2')),
  "rowSpan"     text default 'row-span-1' check ("rowSpan" in ('row-span-1','row-span-2')),
  ordem         integer default 0,
  created_date  timestamptz not null default now(),
  updated_date  timestamptz not null default now(),
  created_by    text
);

-- DEPOIMENTO ---------------------------------------------------------
create table public.depoimento (
  id               text primary key default gen_random_uuid()::text,
  cliente_id       text not null,
  cliente_nome     text,
  cliente_profissao text,
  cliente_foto_url text,
  texto            text not null,
  avaliacao        integer not null check (avaliacao between 1 and 5),
  enviado_para_aprovacao boolean default false,
  aprovado         boolean default false,
  created_date     timestamptz not null default now(),
  updated_date     timestamptz not null default now(),
  created_by       text
);

-- CONVERSA_DEMATTOS --------------------------------------------------
create table public.conversa_demattos (
  id            text primary key default gen_random_uuid()::text,
  cliente_id    text not null,
  role          text not null check (role in ('user','assistant')),
  mensagem      text not null,
  fotos_urls    text[],
  previa_url    text,
  created_date  timestamptz not null default now(),
  updated_date  timestamptz not null default now(),
  created_by    text
);

-- COMPRA -------------------------------------------------------------
create table public.compra (
  id               text primary key default gen_random_uuid()::text,
  cliente_id       text,
  cliente_email    text not null,
  produto_id       text not null,
  produto_nome     text not null,
  produto_tipo     text not null check (produto_tipo in ('fisico','digital')),
  produto_arquivo_pdf_url text,
  valor            numeric(12,2) not null,
  status_pagamento text default 'pendente' check (status_pagamento in ('pendente','confirmado','cancelado')),
  stripe_payment_intent_id text,
  stripe_session_id text,
  created_date     timestamptz not null default now(),
  updated_date     timestamptz not null default now(),
  created_by       text
);

-- ITEM_CARRINHO ------------------------------------------------------
create table public.item_carrinho (
  id            text primary key default gen_random_uuid()::text,
  cliente_email text not null,
  item_tipo     text not null check (item_tipo in ('produto','servico')),
  item_id       text not null,
  item_nome     text not null,
  item_preco    numeric(12,2) not null,
  quantidade    integer default 1,
  produto_tipo  text check (produto_tipo in ('fisico','digital')),
  produto_arquivo_pdf_url text,
  created_date  timestamptz not null default now(),
  updated_date  timestamptz not null default now(),
  created_by    text
);

-- PROFISSIONAL -------------------------------------------------------
create table public.profissional (
  id               text primary key default gen_random_uuid()::text,
  nome             text not null,
  email            text not null,
  telefone         text,
  foto_url         text,
  historico_profissional text,
  servicos_ids     text[],
  senha_acesso     text not null,
  tem_acesso_admin boolean default false,
  destaque_home    boolean default false,
  ativo            boolean default true,
  created_date     timestamptz not null default now(),
  updated_date     timestamptz not null default now(),
  created_by       text
);

-- HORARIO_DISPONIVEL -------------------------------------------------
create table public.horario_disponivel (
  id               text primary key default gen_random_uuid()::text,
  profissional_id  text not null,
  profissional_nome text,
  data             date not null,
  horario          text not null,
  disponivel       boolean default true,
  created_date     timestamptz not null default now(),
  updated_date     timestamptz not null default now(),
  created_by       text
);

-- CONFIG_AGENDA_PROFISSIONAL -----------------------------------------
create table public.config_agenda_profissional (
  id               text primary key default gen_random_uuid()::text,
  profissional_id  text not null,
  dias_semana      integer[] default '{1,2,3,4,5,6}',   -- 0=Dom ... 6=Sab
  horario_inicio   text default '09:00',
  horario_fim      text default '18:00',
  horario_almoco_inicio text,
  horario_almoco_fim text,
  intervalo_minutos integer default 30,
  created_date     timestamptz not null default now(),
  updated_date     timestamptz not null default now(),
  created_by       text
);

-- CONFIGURACAO_ASSISTENTE --------------------------------------------
create table public.configuracao_assistente (
  id               text primary key default gen_random_uuid()::text,
  voz_tipo         text default 'pt-BR-Female' check (voz_tipo in ('pt-BR-Female','pt-BR-Male','pt-PT-Female','pt-PT-Male')),
  velocidade_fala  numeric default 1.2 check (velocidade_fala between 0.5 and 2),
  tom_voz          numeric default 1.1 check (tom_voz between 0.5 and 2),
  volume           numeric default 1   check (volume between 0.1 and 1),
  audio_respostas_ativo boolean default true,
  audio_entrada_ativo boolean default true,
  ativo            boolean default true,
  created_date     timestamptz not null default now(),
  updated_date     timestamptz not null default now(),
  created_by       text
);

-- IMAGEM_HERO --------------------------------------------------------
create table public.imagem_hero (
  id            text primary key default gen_random_uuid()::text,
  url           text not null,
  alt           text not null,
  ordem         integer default 0,
  ativo         boolean default true,
  created_date  timestamptz not null default now(),
  updated_date  timestamptz not null default now(),
  created_by    text
);

-- SECAO_SOBRE --------------------------------------------------------
create table public.secao_sobre (
  id               text primary key default gen_random_uuid()::text,
  tag_superior     text default 'Nossa História',
  titulo_parte1    text default 'A Arte de Cuidar do',
  titulo_parte2    text default 'Homem Moderno',
  paragrafo1       text,
  paragrafo2       text,
  paragrafo3       text,
  imagem_url       text,
  destaque1_titulo text default 'Técnicas Premium',
  destaque1_subtitulo text default 'Cortes modernos e clássicos',
  destaque2_titulo text default 'Atendimento VIP',
  destaque2_subtitulo text default 'Experiência personalizada',
  atendimentos_base integer default 5000,
  created_date     timestamptz not null default now(),
  updated_date     timestamptz not null default now(),
  created_by       text
);

-- PACOTE_CREDITO -----------------------------------------------------
create table public.pacote_credito (
  id               text primary key default gen_random_uuid()::text,
  nome             text not null,
  quantidade_tokens integer not null,
  preco_reais      numeric(12,2) not null,
  stripe_price_id  text,
  desconto_percentual numeric default 0,
  destaque         boolean default false,
  ativo            boolean default true,
  created_date     timestamptz not null default now(),
  updated_date     timestamptz not null default now(),
  created_by       text
);

-- TRANSACAO_CREDITO --------------------------------------------------
create table public.transacao_credito (
  id               text primary key default gen_random_uuid()::text,
  usuario_id       text not null,
  usuario_email    text not null,
  tipo             text not null check (tipo in ('compra','bonus_admin','consumo_ia','estorno')),
  quantidade       integer not null,
  valor_pago       numeric(12,2),
  pacote_id        text,
  stripe_payment_intent_id text,
  stripe_session_id text,
  admin_que_concedeu text,
  observacao       text,
  created_date     timestamptz not null default now(),
  updated_date     timestamptz not null default now(),
  created_by       text
);

-- CREDITO_PENDENTE ---------------------------------------------------
create table public.credito_pendente (
  id               text primary key default gen_random_uuid()::text,
  usuario_email    text not null,
  quantidade       integer not null,
  admin_que_concedeu text not null,
  observacao       text,
  aplicado         boolean default false,
  created_date     timestamptz not null default now(),
  updated_date     timestamptz not null default now(),
  created_by       text
);

-- INSTAGRAM_VIDEO ----------------------------------------------------
create table public.instagram_video (
  id            text primary key default gen_random_uuid()::text,
  titulo        text not null,
  url_instagram text,
  thumbnail_url text not null,
  video_url     text,
  descricao     text,
  ordem         integer default 0,
  ativo         boolean default true,
  created_date  timestamptz not null default now(),
  updated_date  timestamptz not null default now(),
  created_by    text
);

-- CONVERSA_WHATSAPP --------------------------------------------------
create table public.conversa_whatsapp (
  id               text primary key default gen_random_uuid()::text,
  telefone_cliente text not null,
  role             text not null check (role in ('user','assistant')),
  mensagem         text not null,
  dados_extraidos  jsonb,
  created_date     timestamptz not null default now(),
  updated_date     timestamptz not null default now(),
  created_by       text
);

-- COMBO --------------------------------------------------------------
create table public.combo (
  id            text primary key default gen_random_uuid()::text,
  nome          text not null,
  descricao     text,
  produtos_ids  text[] not null,
  preco         numeric(12,2) not null,
  imagem_url    text,
  instagram_url text,
  stripe_product_id text,
  stripe_price_id text,
  ativo         boolean default true,
  created_date  timestamptz not null default now(),
  updated_date  timestamptz not null default now(),
  created_by    text
);

-- TENTATIVA_COMPRA ---------------------------------------------------
create table public.tentativa_compra (
  id               text primary key default gen_random_uuid()::text,
  stripe_session_id text not null,
  stripe_payment_intent_id text,
  cliente_email    text not null,
  cliente_id       text,
  origem           text check (origem in ('link_direto','catalogo','creditos')),
  itens            jsonb,
  valor_total      numeric(12,2),
  status           text default 'aberta' check (status in ('aberta','confirmada','cancelada','expirada')),
  recibo_stripe    jsonb,
  recibo_url       text,
  created_date     timestamptz not null default now(),
  updated_date     timestamptz not null default now(),
  created_by       text
);

-- CONFIGURACOES_RASTREAMENTO -----------------------------------------
create table public.configuracoes_rastreamento (
  id                   text primary key default gen_random_uuid()::text,
  facebook_pixel_id    text,
  google_tag_manager_id text,
  created_date         timestamptz not null default now(),
  updated_date         timestamptz not null default now(),
  created_by           text
);

-- =====================================================================
-- USUÁRIOS DO APP
-- No Base44 o "User" é o usuário de autenticação. No Supabase a auth
-- fica em auth.users; os campos extras vão em public.profiles.
-- =====================================================================
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  role        text default 'user' check (role in ('admin','user')),
  ai_credits  numeric default 0,
  profissao   text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

-- Cria automaticamente um profile quando um usuário se registra
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- TRIGGERS updated_date  (uma por tabela)
-- =====================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'cliente','servico','produto','agendamento','configuracao','imagem_galeria',
    'depoimento','conversa_demattos','compra','item_carrinho','profissional',
    'horario_disponivel','config_agenda_profissional','configuracao_assistente',
    'imagem_hero','secao_sobre','pacote_credito','transacao_credito','credito_pendente',
    'instagram_video','conversa_whatsapp','combo','tentativa_compra',
    'configuracoes_rastreamento','profiles'
  ]
  loop
    execute format(
      'create trigger trg_%1$s_updated before update on public.%1$s
         for each row execute function public.set_updated_date();', t);
  end loop;
end $$;

-- =====================================================================
-- ÍNDICES úteis (campos de busca / relacionamento)
-- =====================================================================
create index idx_agendamento_prof on public.agendamento (profissional_id);
create index idx_agendamento_data on public.agendamento (data);
create index idx_horario_prof_data on public.horario_disponivel (profissional_id, data);
create index idx_config_agenda_prof on public.config_agenda_profissional (profissional_id);
create index idx_compra_cliente on public.compra (cliente_email);
create index idx_item_carrinho_cliente on public.item_carrinho (cliente_email);
create index idx_depoimento_cliente on public.depoimento (cliente_id);
create index idx_conversa_dm_cliente on public.conversa_demattos (cliente_id);
create index idx_conversa_wpp_tel on public.conversa_whatsapp (telefone_cliente);
create index idx_transacao_usuario on public.transacao_credito (usuario_email);

-- =====================================================================
-- RLS (Row Level Security) — PONTO DE PARTIDA. REVISE antes de produção.
-- =====================================================================
-- Helper: usuário autenticado é admin?
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- Ativa RLS em todas as tabelas
do $$
declare t text;
begin
  foreach t in array array[
    'cliente','servico','produto','agendamento','configuracao','imagem_galeria',
    'depoimento','conversa_demattos','compra','item_carrinho','profissional',
    'horario_disponivel','config_agenda_profissional','configuracao_assistente',
    'imagem_hero','secao_sobre','pacote_credito','transacao_credito','credito_pendente',
    'instagram_video','conversa_whatsapp','combo','tentativa_compra',
    'configuracoes_rastreamento','profiles'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
    -- Admin tem acesso total a tudo
    execute format(
      'create policy "admin_all_%1$s" on public.%1$s
         for all using (public.is_admin()) with check (public.is_admin());', t);
  end loop;
end $$;

-- Leitura PÚBLICA (anon) do conteúdo exibido no site
-- (catálogo, vitrine e seções da landing page)
do $$
declare t text;
begin
  foreach t in array array[
    'servico','produto','combo','pacote_credito','imagem_galeria','imagem_hero',
    'secao_sobre','instagram_video','profissional','configuracao',
    'configuracoes_rastreamento'
  ]
  loop
    execute format(
      'create policy "public_read_%1$s" on public.%1$s
         for select using (true);', t);
  end loop;
end $$;

-- Depoimentos: público só vê os aprovados
create policy "public_read_depoimento_aprovado" on public.depoimento
  for select using (aprovado = true);

-- profiles: cada usuário lê/edita o próprio registro
create policy "profiles_self_read"  on public.profiles for select using (id = auth.uid());
create policy "profiles_self_update" on public.profiles for update using (id = auth.uid());

-- =====================================================================
-- ATENÇÃO — fluxos que você provavelmente precisa liberar manualmente:
--   * Criar AGENDAMENTO pelo site sem login (insert público em agendamento)
--   * Adicionar itens ao ITEM_CARRINHO sem login
--   * Registrar CLIENTE / TENTATIVA_COMPRA pelo checkout público
--   * Webhooks do Stripe: use a service_role key (bypassa RLS) numa Edge
--     Function, NUNCA policies abertas de insert/update nessas tabelas.
-- Exemplo de insert público (descomente e ajuste se o fluxo exigir):
--   create policy "public_insert_agendamento" on public.agendamento
--     for insert with check (true);
-- =====================================================================
