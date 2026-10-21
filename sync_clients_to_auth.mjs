import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://supabase-supabasedemattos.1cnep6.easypanel.host';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function syncAllClients() {
  console.log('Iniciando sincronização dos clientes existentes para auth.users...');

  // 1. Obter todos os clientes da tabela cliente
  const { data: clientes, error: errC } = await supabase
    .from('cliente')
    .select('id, nome, email, telefone')
    .not('email', 'is', null);

  if (errC) {
    console.error('Erro ao buscar clientes:', errC);
    return;
  }

  // 2. Obter usuários já existentes em auth.users
  const { data: usersData, error: errU } = await supabase.auth.admin.listUsers();
  if (errU) {
    console.error('Erro ao listar usuários auth:', errU);
    return;
  }

  const existingEmails = new Set(usersData.users.map(u => u.email?.toLowerCase()));
  console.log(`Usuários já no auth: ${existingEmails.size}`);

  let createdCount = 0;
  let skippedCount = 0;

  for (const c of clientes) {
    const email = c.email?.trim().toLowerCase();
    if (!email || !email.includes('@') || email.includes('teste')) {
      continue;
    }

    if (existingEmails.has(email)) {
      skippedCount++;
      continue;
    }

    // Criar o usuário no Auth com e-mail confirmado para que ele possa redefinir senha a qualquer momento
    const tempPass = 'Mudar' + Math.random().toString(36).substring(2, 8) + '!';
    const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
      email: email,
      password: tempPass,
      email_confirm: true,
      user_metadata: {
        name: c.nome,
        phone: c.telefone || ''
      }
    });

    if (createErr) {
      console.warn(`Aviso ao criar ${email}:`, createErr.message);
    } else {
      createdCount++;
      existingEmails.add(email);
      console.log(`[${createdCount}] Cliente cadastrado no Auth com sucesso: ${email} (${c.nome})`);
    }
  }

  console.log(`\n✅ SINCRONIZAÇÃO CONCLUÍDA!`);
  console.log(`- Novos usuários cadastrados no Auth: ${createdCount}`);
  console.log(`- Já existentes / mantidos: ${skippedCount}`);
  console.log(`Agora todos os clientes da base conseguem recuperar e trocar de senha facilmente!`);
}

syncAllClients().catch(console.error);
