# Migração — Barbearia DeMattos (Base44 → Supabase)

Pacote completo para recriar o banco e os dados do app no seu **Supabase** (VPS).

## Conteúdo da pasta
```
migracao_demattos/
├── 01_schema.sql          # estrutura: 24 tabelas + profiles, RLS, triggers, índices
├── migrar.mjs             # script: sobe imagens + insere todos os dados
├── package.json           # dependência (@supabase/supabase-js)
├── mapa_arquivos.json     # mapa URL-antiga → nome do arquivo (usado pelo script)
├── dados/                 # 24 JSONs (1 por entidade) + _COMPLETO.json  — 6.283 registros
└── arquivos/              # 44 imagens e PDFs baixados do Base44 (~236 MB)
```

## Passo a passo

### 1. Criar a estrutura
No Supabase (SQL Editor) ou via `psql`, rode **`01_schema.sql`** inteiro.

### 2. Instalar dependência do script
Na pasta, rode:
```bash
npm install
```

### 3. Definir as credenciais do seu Supabase
Pegue em **Project Settings → API**:
- `SUPABASE_URL` = URL do projeto (ex.: `https://supabase.seudominio.com`)
- `SUPABASE_SERVICE_ROLE_KEY` = a chave **service_role** (NÃO a anon). Ela ignora o RLS, por isso só deve ser usada aqui, localmente — nunca no front-end.

Linux/macOS:
```bash
export SUPABASE_URL="https://supabase.seudominio.com"
export SUPABASE_SERVICE_ROLE_KEY="eyJ...service_role..."
export BUCKET="demattos"   # opcional
```
Windows (PowerShell):
```powershell
$env:SUPABASE_URL="https://supabase.seudominio.com"
$env:SUPABASE_SERVICE_ROLE_KEY="eyJ...service_role..."
```

### 4. Rodar a migração
```bash
node migrar.mjs
```
O script:
1. cria o bucket público `demattos` (se não existir);
2. sobe os 44 arquivos para `demattos/uploads/`;
3. insere todos os registros, **trocando as URLs antigas pelas novas** do seu Storage.

É seguro rodar de novo (usa `upsert` por `id`). Se algum registro falhar, ele continua e grava os detalhes em `erros_import.json`.

## Observações importantes
- **Usuários/login**: as 24 entidades NÃO incluem as contas de autenticação (no Base44 o "User" fica na camada de auth). Os clientes finais estão na tabela `cliente`. Se havia usuários admin logáveis, recrie-os no Supabase Auth e marque `profiles.role = 'admin'`.
- **Senhas em texto** (`cliente.senha_canal`, `profissional.senha_acesso`): vieram como texto puro do Base44. Troque por hash ou migre para o Supabase Auth.
- **RLS**: o `01_schema.sql` já ativa RLS com políticas iniciais (admin total, leitura pública do catálogo, depoimentos aprovados). Revise os fluxos públicos (criar agendamento sem login, carrinho, checkout) antes de ir para produção.
- **Imagens externas**: 1 imagem do Unsplash e 4 links do Instagram ficam como estão (não são arquivos do seu storage).
- **Conta Base44 em atraso**: baixei os arquivos agora porque a conta está com pagamento pendente e os links podem sair do ar. Guarde a pasta `arquivos/` como backup.

## Contagem de dados migrados
| Entidade | Registros |
|---|---|
| HorarioDisponivel | 5008 |
| Agendamento | 1071 |
| Cliente | 73 |
| ConversaDeMattos | 56 |
| Servico | 19 |
| TransacaoCredito | 17 |
| Configuracao | 9 |
| ImagemGaleria | 5 |
| Produto / ImagemHero / InstagramVideo | 4 cada |
| PacoteCredito / ItemCarrinho | 3 cada |
| Combo / Profissional / SecaoSobre / Depoimento / Configuracao* / TentativaCompra | 1 cada |
| Compra / CreditoPendente / ConversaWhatsApp / ConfiguracoesRastreamento | 0 |

Total: **6.283 registros** + **44 arquivos**.
