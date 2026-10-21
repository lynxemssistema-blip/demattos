import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://supabase-supabasedemattos.1cnep6.easypanel.host';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q';

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function testAdminCreate() {
  const testEmail = `admin_test_${Date.now()}@exemplo.com`;
  const testPass = '123456';

  console.log('Testing admin.createUser with email_confirm: true...');
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: testEmail,
    password: testPass,
    email_confirm: true,
    user_metadata: { full_name: 'Usuario Confirmado' }
  });

  if (error) {
    console.error('Admin createUser Error:', error);
    return;
  }
  console.log('User created successfully by admin! ID:', data.user.id);
  console.log('Email confirmed at:', data.user.email_confirmed_at);

  console.log('\nNow testing signInWithPassword with client...');
  const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';
  const supabaseClient = createClient(SUPABASE_URL, ANON_KEY);

  const { data: loginData, error: loginErr } = await supabaseClient.auth.signInWithPassword({
    email: testEmail,
    password: testPass
  });

  if (loginErr) {
    console.error('SignIn Error:', loginErr);
  } else {
    console.log('Login SUCESSO! Token recebido:', !!loginData.session);
  }
}

testAdminCreate();
