# Instrução para o agente — Reconstruir "Barbearia DeMattos" sobre Supabase

Você vai migrar o app **Barbearia DeMattos** (originalmente feito no **Base44**) para um
**Supabase self-hosted** (na VPS do cliente) e ajustar o código para que o app
**funcione exatamente como antes**. Todos os dados e arquivos já foram exportados.
Não reinvente o produto: preserve telas, fluxos e regras de negócio atuais.

---

## 1. Insumos que você recebe (pasta `migracao_demattos/`)
```
01_schema.sql          Estrutura PostgreSQL: 24 tabelas + profiles, RLS, triggers, índices.
migrar.mjs             Sobe as imagens ao Storage e insere TODOS os dados (URLs reescritas).
package.json           Dependência do script (@supabase/supabase-js).
mapa_arquivos.json     URL antiga (Base44/Supabase antigo) -> nome do arquivo local.
dados/                 24 JSON (1 por entidade) + _COMPLETO.json = 6.283 registros.
arquivos/              44 imagens e PDFs (~236 MB) já baixados do Base44.
README_MIGRACAO.md     Passo a passo da importação de dados.
```
O código-fonte do app (React/Vite + SDK do Base44) está com o cliente — exporte do
editor Base44 (menu **Código**) ou do repositório GitHub conectado ao app.

---

## 2. Ordem de execução
1. **Criar a estrutura**: rodar `01_schema.sql` no Supabase (SQL Editor ou `psql`).
2. **Importar dados + arquivos**: seguir o `README_MIGRACAO.md` (`npm install`, setar
   `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`, `node migrar.mjs`).
3. **Reescrever a camada de dados do app** (seções 4–7 abaixo).
4. **Recriar as integrações** (seção 6).
5. **Validar com o checklist** (seção 8).

---

## 3. Princípios de modelagem (não quebre isto)
- `id` é **text** e os IDs originais do Base44 foram preservados. As relações são
  **referências soltas por string** (`profissional_id`, `cliente_id`, `produtos_ids[]`),
  sem foreign keys rígidas. Mantenha assim — muito campo é **desnormalizado**
  (ex.: `cliente_nome` guardado dentro do agendamento). Não "normalize" nada.
- Campos de sistema em todas as tabelas: `created_date`, `updated_date`, `created_by`,
  `created_by_id`, `is_sample`. Trigger já atualiza `updated_date` no UPDATE.
- Nomes de tabela em **snake_case minúsculo**; entidades do Base44 em PascalCase.
  Use o mapa da seção 5.

---

## 4. Substituir o SDK do Base44 pelo supabase-js
Troque `@base44/sdk` por `@supabase/supabase-js`. Crie um client único
(`src/lib/supabase.js`) com a **anon key** (nunca a service_role no front).

Equivalências de CRUD (Base44 → Supabase):
| Base44 | Supabase |
|---|---|
| `base44.entities.Cliente.list()` | `supabase.from('cliente').select('*')` |
| `base44.entities.Cliente.filter({campo:v})` | `supabase.from('cliente').select('*').eq('campo', v)` |
| `base44.entities.Cliente.get(id)` | `supabase.from('cliente').select('*').eq('id', id).single()` |
| `base44.entities.Cliente.create(obj)` | `supabase.from('cliente').insert(obj).select().single()` |
| `base44.entities.Cliente.update(id, obj)` | `supabase.from('cliente').update(obj).eq('id', id)` |
| `base44.entities.Cliente.delete(id)` | `supabase.from('cliente').delete().eq('id', id)` |
| ordenação `-created_date` | `.order('created_date', { ascending: false })` |
| paginação | `.range(inicio, fim)` |

Dica: crie um pequeno wrapper `db('cliente')` que replica a API antiga
(`.list/.filter/.get/.create/.update/.delete`) para minimizar alterações nas telas.

---

## 5. Mapa de entidades → tabelas
```
Cliente->cliente  Servico->servico  Produto->produto  Agendamento->agendamento
Configuracao->configuracao  ImagemGaleria->imagem_galeria  Depoimento->depoimento
ConversaDeMattos->conversa_demattos  Compra->compra  ItemCarrinho->item_carrinho
Profissional->profissional  HorarioDisponivel->horario_disponivel
ConfigAgendaProfissional->config_agenda_profissional
ConfiguracaoAssistente->configuracao_assistente  ImagemHero->imagem_hero
SecaoSobre->secao_sobre  PacoteCredito->pacote_credito  TransacaoCredito->transacao_credito
CreditoPendente->credito_pendente  InstagramVideo->instagram_video
ConversaWhatsApp->conversa_whatsapp  Combo->combo  TentativaCompra->tentativa_compra
ConfiguracoesRastreamento->configuracoes_rastreamento
User (+extras)->auth.users + public.profiles
```

---

## 6. Recriar as integrações do Base44
O Base44 oferecia "integrações" prontas que não existem no Supabase self-hosted.
Reimplemente cada uma como **Supabase Edge Function** (Deno) ou serviço na VPS:

- **Autenticação de usuários do app** → Supabase Auth. O trigger `handle_new_user`
  já cria um `profiles` no signup. Defina o primeiro `profiles.role = 'admin'` à mão.
- **Login customizado da barbearia**: o app usa `Profissional.senha_acesso` e
  `Cliente.senha_canal` (texto puro no Base44). Decida: (a) migrar esses acessos para
  Supabase Auth, ou (b) manter o login próprio, mas com senha **hasheada** (bcrypt/argon2)
  — nunca texto puro. Ajuste as telas de acesso do profissional e do "canal" do cliente.
- **Upload de arquivos** (era a integração `UploadFile` do Base44) → Supabase Storage:
  `supabase.storage.from('demattos').upload('uploads/'+nome, arquivo)` e usar
  `getPublicUrl`. O bucket `demattos` é criado pelo `migrar.mjs`.
- **E-mail** (edge function `enviarEmailSMTP`) → recriar como Edge Function usando o
  SMTP do cliente (confirmação de agendamento, entrega de PDF comprado, etc.).
- **Google Drive** (functions `proxy-drive-thumbnail`, `exchange-google-token`) →
  recriar como Edge Functions se o fluxo de Drive for mantido; senão, remover.
- **Pagamentos Stripe**: o app guarda `stripe_product_id`/`stripe_price_id` e cria
  `Compra`/`TentativaCompra`/`TransacaoCredito`. Recrie o checkout e o **webhook** do
  Stripe como Edge Function usando a **service_role** (ignora RLS) para confirmar
  pagamento, baixar estoque, liberar PDF e creditar `ai_credits`.
- **IA / assistente** (`ConversaDeMattos`, `ConfiguracaoAssistente`, `ai_credits`):
  onde o Base44 usava `InvokeLLM`, aponte para o provedor do cliente (ele tem o
  **Lynx AI** self-hosted) ou outra API; mantenha o débito de `ai_credits` por uso.
- **WhatsApp** (`ConversaWhatsApp`, `cadastrado_via_whatsapp`): a automação externa
  (Evolution API em `evo.lynxems.com.br` + n8n) continua fora do app; só garanta que
  as tabelas e os webhooks que gravam `conversa_whatsapp`/`agendamento` sigam existindo.
- **Rastreamento** (`configuracoes_rastreamento`): injetar Facebook Pixel e Google Tag
  Manager no `index.html`/layout a partir dos valores da tabela.

---

## 7. Storage e URLs
- Todas as URLs antigas de imagem/PDF nos dados já serão **reescritas** pelo `migrar.mjs`
  para `https://SEU-SUPABASE/storage/v1/object/public/demattos/uploads/<arquivo>`.
- No app, qualquer tela de upload novo deve gravar no mesmo bucket/prefixo.
- Ficam como estão: 1 imagem do Unsplash e 4 links de post do Instagram
  (`InstagramVideo.url_instagram`).

---

## 8. RLS — o que precisa estar liberado
O `01_schema.sql` ativa RLS com: admin total, leitura pública do catálogo/landing
(`servico, produto, combo, pacote_credito, imagem_*, secao_sobre, instagram_video,
profissional, configuracao, configuracoes_rastreamento`) e depoimentos só aprovados.
Para o app funcionar como antes, revise/abra conforme o fluxo:
- **Criar agendamento pelo site sem login** → policy de `insert` em `agendamento`
  (e provavelmente leitura de `horario_disponivel`/`config_agenda_profissional`).
- **Carrinho/checkout público** → `insert`/`select` por `cliente_email` em
  `item_carrinho`, `cliente`, `tentativa_compra`.
- **Webhooks (Stripe/WhatsApp)** → sempre via **service_role** em Edge Function,
  nunca com policy aberta de insert/update.
- **Área do profissional / canal do cliente** → políticas por identidade após definir
  o modelo de login (seção 6).

---

## 9. Checklist "funciona como antes"
- [ ] Landing: hero, seção sobre, galeria, serviços em destaque, depoimentos aprovados,
      vídeos do Instagram, rastreamento (Pixel/GTM) carregando.
- [ ] Catálogo: serviços e produtos (físico/digital) e combos listando com imagens.
- [ ] Agendamento: escolher profissional → serviço → data/horário (respeitando
      `config_agenda_profissional` e `horario_disponivel`), criar `agendamento`,
      status e recorrência funcionando.
- [ ] Admin: CRUD de serviços, produtos, combos, profissionais, horários, config,
      depoimentos (aprovar), imagens hero/galeria, vídeos.
- [ ] Compra: carrinho → checkout Stripe → webhook confirma `compra`, baixa estoque,
      libera PDF do produto digital e credita `ai_credits`.
- [ ] Créditos: `pacote_credito`, `transacao_credito`, `credito_pendente` e consumo por IA.
- [ ] Assistente (ConversaDeMattos) e WhatsApp gravando conversas.
- [ ] Upload de novas imagens indo para o Storage.
- [ ] Login do profissional e do canal do cliente (com senha hasheada/Auth).

---

## 10. Armadilhas conhecidas
- Não troque `id` para uuid — quebraria todas as referências por string já importadas.
- `created_by` guarda **e-mail** (padrão Base44), não um uuid.
- Campos de array (`servicos_ids`, `produtos_ids`, `dias_semana`, `fotos_urls`) e jsonb
  (`dados_extraidos`, `itens`, `recibo_stripe`) devem ser enviados como array/objeto no
  supabase-js (ele serializa certo para `text[]`/`integer[]`/`jsonb`).
- Reimporte com `migrar.mjs` quantas vezes precisar — é idempotente (upsert por `id`).
- Guarde a pasta `arquivos/` como backup: a conta Base44 está com pagamento em atraso e
  os links originais podem sair do ar.
