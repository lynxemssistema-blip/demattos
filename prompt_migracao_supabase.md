# Prompt de migração — Base44 → Supabase (self-hosted na VPS)

> Cole este prompt na sua IA de desenvolvimento (ou use como guia). Ele contém
> toda a estrutura do banco do app **Barbearia DeMattos** (Base44 id
> `694fc9a4353fcf7bf1d594ed`), pronta para recriar num **Supabase/PostgreSQL**.

---

## Contexto

Estou migrando um aplicativo que hoje roda no **Base44** para um **Supabase
self-hosted** na minha VPS. Preciso recriar o banco de dados no PostgreSQL do
Supabase, com segurança (RLS) e com os campos de sistema equivalentes aos do
Base44. O app é de uma barbearia: catálogo de serviços/produtos, agendamentos,
profissionais, carrinho/compras com Stripe, sistema de créditos de IA,
conteúdo da landing page e históricos de conversa (assistente interno e WhatsApp).

### Convenções do Base44 que devo preservar
- Cada registro tem `id` (string, estilo ObjectId de 24 caracteres hex).
- Campos de sistema em toda entidade: `created_date`, `updated_date`,
  `created_by` (e-mail de quem criou).
- Relacionamentos são **referências soltas por string** (ex.: `profissional_id`,
  `cliente_id`, `produtos_ids[]`), não chaves estrangeiras rígidas. Muitos
  campos são **desnormalizados** (ex.: `cliente_nome` guardado junto do
  agendamento). Mantenha assim para não quebrar a importação de dados.
- O "User" do Base44 é o usuário de autenticação → no Supabase vira
  `auth.users` + tabela `public.profiles` com os campos extras.

### Decisões de tipo (JSON Schema do Base44 → PostgreSQL)
| Base44 | PostgreSQL |
|---|---|
| `string` | `text` |
| `string` + `format: date` | `date` |
| `number` (preço/dinheiro) | `numeric(12,2)` |
| `number` (contagem/minutos/ordem) | `integer` |
| `boolean` | `boolean` (com `default`) |
| `array<string>` | `text[]` |
| `array<number>` | `integer[]` |
| `array<object>` / `object` | `jsonb` |
| `enum` | `text` + `CHECK (campo in (...))` |

### Sobre o `id`
Usei `id text primary key default gen_random_uuid()::text`. Isso preserva os
IDs originais do Base44 ao importar os dados e mantém válidas todas as
referências por string. Se eu for começar **sem** dados, posso trocar por
`id uuid primary key default gen_random_uuid()`.

---

## Tarefa para a IA
1. Rode o DDL abaixo no Supabase (SQL Editor ou `psql`).
2. Revise e ajuste as **políticas de RLS** conforme os fluxos públicos do app
   (criar agendamento sem login, carrinho público, webhook do Stripe via
   service_role em Edge Function).
3. Reescreva a camada de dados do app para usar `@supabase/supabase-js`
   (`.from('<tabela>').select()/insert()/update()/delete()`), substituindo o
   SDK de entidades do Base44. Use o mapa de nomes abaixo.
4. Configure a autenticação no `public.profiles` (trigger já incluso cria o
   profile no signup); defina o primeiro usuário `admin` manualmente.

## Mapa de nomes (entidade Base44 → tabela Supabase)
```
Cliente                    -> cliente
Servico                    -> servico
Produto                    -> produto
Agendamento                -> agendamento
Configuracao               -> configuracao
ImagemGaleria              -> imagem_galeria
Depoimento                 -> depoimento
ConversaDeMattos           -> conversa_demattos
Compra                     -> compra
ItemCarrinho               -> item_carrinho
Profissional               -> profissional
HorarioDisponivel          -> horario_disponivel
ConfigAgendaProfissional   -> config_agenda_profissional
ConfiguracaoAssistente     -> configuracao_assistente
ImagemHero                 -> imagem_hero
SecaoSobre                 -> secao_sobre
PacoteCredito              -> pacote_credito
TransacaoCredito           -> transacao_credito
CreditoPendente            -> credito_pendente
InstagramVideo             -> instagram_video
ConversaWhatsApp           -> conversa_whatsapp
Combo                      -> combo
TentativaCompra            -> tentativa_compra
ConfiguracoesRastreamento  -> configuracoes_rastreamento
User (+dados extras)       -> auth.users + public.profiles
```

## Resumo das entidades (campos principais)
- **cliente**: nome*, telefone*, email*, instagram, facebook, profissao, foto_url, data_nascimento, observacoes, tem_canal, senha_canal, ai_credits, cadastrado_via_whatsapp
- **servico**: nome*, descricao, preco*, duracao* (min), icone(enum), destaque_home, exibir_no_catalogo, ativo
- **produto**: nome*, descricao, tipo(enum fisico/digital)*, preco*, estoque, imagem_url, arquivo_pdf_url, arquivo_previa_url, creditos_ia, destaque_home, exibir_no_catalogo, ativo, stripe_product_id, stripe_price_id
- **agendamento**: cliente_nome*, cliente_telefone*, profissional_id*, profissional_nome, servico*, data*, horario*, horario_fim, duracao_total, observacoes, status(enum), agendamento_recorrente_id, eh_recorrente, possivel_atraso, confirmado_automaticamente
- **configuracao**: chave* (unique), valor*, descricao
- **imagem_galeria**: url*, alt*, colSpan(enum), rowSpan(enum), ordem
- **depoimento**: cliente_id*, cliente_nome, cliente_profissao, cliente_foto_url, texto*, avaliacao* (1–5), enviado_para_aprovacao, aprovado
- **conversa_demattos**: cliente_id*, role(enum user/assistant)*, mensagem*, fotos_urls[], previa_url
- **compra**: cliente_id, cliente_email*, produto_id*, produto_nome*, produto_tipo(enum)*, produto_arquivo_pdf_url, valor*, status_pagamento(enum), stripe_payment_intent_id, stripe_session_id
- **item_carrinho**: cliente_email*, item_tipo(enum produto/servico)*, item_id*, item_nome*, item_preco*, quantidade, produto_tipo(enum), produto_arquivo_pdf_url
- **profissional**: nome*, email*, telefone, foto_url, historico_profissional, servicos_ids[], senha_acesso*, tem_acesso_admin, destaque_home, ativo
- **horario_disponivel**: profissional_id*, profissional_nome, data*, horario*, disponivel
- **config_agenda_profissional**: profissional_id*, dias_semana[] (0=Dom…6=Sab), horario_inicio, horario_fim, horario_almoco_inicio, horario_almoco_fim, intervalo_minutos
- **configuracao_assistente**: voz_tipo(enum)*, velocidade_fala (0.5–2), tom_voz (0.5–2), volume (0.1–1), audio_respostas_ativo, audio_entrada_ativo, ativo
- **imagem_hero**: url*, alt*, ordem, ativo
- **secao_sobre**: tag_superior, titulo_parte1, titulo_parte2, paragrafo1-3, imagem_url, destaque1_titulo, destaque1_subtitulo, destaque2_titulo, destaque2_subtitulo, atendimentos_base
- **pacote_credito**: nome*, quantidade_tokens*, preco_reais*, stripe_price_id, desconto_percentual, destaque, ativo
- **transacao_credito**: usuario_id*, usuario_email*, tipo(enum)*, quantidade*, valor_pago, pacote_id, stripe_payment_intent_id, stripe_session_id, admin_que_concedeu, observacao
- **credito_pendente**: usuario_email*, quantidade*, admin_que_concedeu*, observacao, aplicado
- **instagram_video**: titulo*, url_instagram, thumbnail_url*, video_url, descricao, ordem, ativo
- **conversa_whatsapp**: telefone_cliente*, role(enum)*, mensagem*, dados_extraidos(jsonb)
- **combo**: nome*, descricao, produtos_ids[]*, preco*, imagem_url, instagram_url, stripe_product_id, stripe_price_id, ativo
- **tentativa_compra**: stripe_session_id*, stripe_payment_intent_id, cliente_email*, cliente_id, origem(enum), itens(jsonb), valor_total, status(enum), recibo_stripe(jsonb), recibo_url
- **configuracoes_rastreamento**: facebook_pixel_id, google_tag_manager_id
- **profiles** (ex-User): id→auth.users, email, full_name, role(enum admin/user), ai_credits, profissao

(*) = obrigatório (NOT NULL).

---

## DDL completo
> O SQL pronto para rodar está no arquivo **`schema_supabase_barbearia_demattos.sql`**,
> entregue junto com este prompt. Ele cria: extensão pgcrypto, as 24 tabelas +
> `profiles`, triggers de `updated_date`, trigger de criação de profile no
> signup, índices e as políticas de RLS iniciais.

### Observações importantes de migração
1. **Edge Functions / Stripe**: webhooks e concessão de créditos devem usar a
   chave **`service_role`** (que ignora o RLS) dentro de uma Edge Function —
   nunca abrir políticas de insert/update públicas nessas tabelas.
2. **Senhas em texto** (`cliente.senha_canal`, `profissional.senha_acesso`): o
   Base44 guardava como texto simples. Na migração, troque para hash
   (bcrypt/argon2) ou migre esses acessos para o Supabase Auth.
3. **Fluxos públicos sem login** (criar agendamento, carrinho, checkout):
   precisam de políticas de `insert` específicas — veja o bloco comentado no
   fim do SQL.
4. **Importação dos dados**: exporte cada entidade do Base44 (API ou
   "Backup e restauração") em JSON e importe mantendo o `id` original; como as
   tabelas usam `id text`, as referências continuam válidas sem remapeamento.
