import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://supabase-supabasedemattos.1cnep6.easypanel.host';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q';

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function createLuanAdmin() {
  const email = 'luandemattos102030@gmail.com';
  const password = '203540Lu@';

  console.log('Creating or updating Luan admin account in auth.users...');
  
  // Verifica se o usuário já existe
  const { data: usersList } = await supabaseAdmin.auth.admin.listUsers();
  const existingUser = usersList.users.find(u => u.email.toLowerCase() === email.toLowerCase());

  let userId;
  if (existingUser) {
    console.log('User already exists in auth.users! Updating password and confirming email...');
    const { data: updated, error } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
      password,
      email_confirm: true,
      user_metadata: { full_name: 'Luan de Mattos' }
    });
    if (error) throw error;
    userId = existingUser.id;
  } else {
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'Luan de Mattos' }
    });
    if (error) throw error;
    userId = created.user.id;
  }

  console.log('User ID:', userId);

  // Garante que em public.profiles está role = 'admin'
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .upsert({
      id: userId,
      email: email,
      full_name: 'Luan de Mattos',
      role: 'admin'
    }, { onConflict: 'id' });

  if (profileError) {
    console.error('Error updating profiles:', profileError);
  } else {
    console.log('Profile successfully configured as ADMIN!');
  }
}

createLuanAdmin().catch(console.error);
