import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://supabase-supabasedemattos.1cnep6.easypanel.host';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogImFub24iLAogICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgImlhdCI6IDE3MDAwMDAwMDAsCiAgImV4cCI6IDE5OTk5OTk5OTkKfQ.c7pIMvXb_Ghb_VbWc_q9d0_mock_signature_for_testing';

// Let's read the anon key or service role key from .env
import fs from 'fs';
const envContent = fs.readFileSync('.env', 'utf-8');
const anonKeyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/);
const anonKey = anonKeyMatch ? anonKeyMatch[1].trim() : ANON_KEY;

const supabase = createClient(SUPABASE_URL, anonKey);

async function testReset() {
  console.log('Testando solicitação de recuperação de senha via GoTrue...');
  const { data, error } = await supabase.auth.resetPasswordForEmail('suporte@lynxems.com.br', {
    redirectTo: 'https://demattos.lynxems.com.br/Login?mode=reset'
  });
  if (error) {
    console.error('Erro ao enviar reset:', error);
  } else {
    console.log('Sucesso! E-mail de recuperação disparado com sucesso:', data);
  }
}

testReset();
