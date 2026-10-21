# 💈 Barbearia DeMattos — Plataforma Web & Painel Administrativo

Plataforma oficial da **Barbearia DeMattos** integrada a backend autohospedado **Supabase (VPS Easypanel)** com gestão de clientes, agendamentos em tempo real, catálogo de serviços e produtos digitais com e-books para download, inteligência artificial para consultoria visagista e canal exclusivo para clientes e profissionais.

---

## 🌟 Funcionalidades Principais

- **Agendamento Inteligente:** Seleção de serviços, profissionais, horários disponíveis e confirmação instantânea.
- **Canal do Cliente (`/CanalCliente`):** Histórico de cortes, controle de créditos de IA, download de e-books e produtos comprados.
- **Painel Administrativo Completo (`/Admin`):**
  - Métricas e estatísticas em tempo real (agendamentos, faturamento, clientes ativos).
  - Gestão de Serviços, Produtos Digitais, Profissionais e Combos.
  - Carrossel, Galeria de Fotos e Depoimentos.
  - Controle de links e rastreamento de marketing.
- **Agenda do Profissional (`/AgendaProfissional`):** Visualização rápida de horários marcados do dia.
- **Autenticação Segura via Supabase Auth (GoTrue):**
  - E-mails transacionais luxuosos enviados via SMTP Hostinger (`suporte@lynxems.com.br`).
  - Fluxo seguro de redefinição de senha com tela dedicada e tokens validados.
  - Níveis de acesso: Clientes, Profissionais e SuperAdmin.
- **Design de Alto Padrão (Dark/Gold):**
  - Interface responsiva com suporte a safe-areas para iOS / Safari e Android.
  - Micro-animações com Framer Motion e Tailwind CSS.

---

## 🛠️ Stack Tecnológica

- **Frontend:** React 18, Vite, React Router DOM, Tailwind CSS, Lucide Icons, Framer Motion, Radix UI.
- **Backend & Banco de Dados:** PostgreSQL (Supabase self-hosted), PostgREST, GoTrue Auth, Supabase Storage.
- **Infraestrutura:** Easypanel VPS + Hostinger Cloud / Web Hosting.

---

## 🚀 Como Executar Localmente

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/lynxemssistema-blip/demattos.git
   cd demattos
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente:**
   Copie `.env.example` para `.env` e preencha as credenciais:
   ```bash
   cp .env.example .env
   ```

4. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

5. **Para gerar o build de produção:**
   ```bash
   npm run build
   ```

---

## 📄 Licença e Propriedade

Desenvolvido exclusivamente para a **Barbearia DeMattos**. Todos os direitos reservados.
