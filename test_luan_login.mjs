import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://supabase-supabasedemattos.1cnep6.easypanel.host';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function testLuanLogin() {
  const email = 'luandemattos102030@gmail.com';
  const password = '203540Lu@';

  console.log('Testing login for Luan...');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    console.error('Login error:', error);
  } else {
    console.log('LOGIN SUCCESS! User ID:', data.user.id, 'Email:', data.user.email);
    console.log('Session access token present:', !!data.session.access_token);

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
    console.log('Profile from Supabase:', profile);
  }
}

testLuanLogin();
