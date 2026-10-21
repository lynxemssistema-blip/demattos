import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://supabase-supabasedemattos.1cnep6.easypanel.host';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function testAuth() {
  const testEmail = `test_${Date.now()}@exemplo.com`;
  const testPass = '123456';

  console.log('Testing signUp with:', testEmail);
  const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
    email: testEmail,
    password: testPass,
    options: {
      data: { full_name: 'Usuario Teste' }
    }
  });

  if (signUpErr) {
    console.error('SignUp Error:', signUpErr);
    return;
  }
  console.log('SignUp Success! User:', signUpData.user?.id);
  console.log('Session returned?', !!signUpData.session);
  console.log('Email confirmed at:', signUpData.user?.email_confirmed_at);

  console.log('\nTesting signInWithPassword immediately...');
  const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPass
  });

  if (signInErr) {
    console.error('SignIn Error:', signInErr);
  } else {
    console.log('SignIn Success! Session token:', !!signInData.session);
  }
}

testAuth();
