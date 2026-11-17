import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://supabase-supabasedemattos.1cnep6.easypanel.host';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

// Limpar sessão antiga assinada com JWT_SECRET anterior para nunca causar 401 em iPhones/navegadores de clientes recorrentes
if (typeof window !== 'undefined') {
  try {
    window.localStorage.removeItem('sb-supabase-supabasedemattos-auth-token');
  } catch {
    // Ignorar modo privado Safari
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'sb-demattos-v2-auth',
  },
});

// supabaseAdmin tem permissao total de service_role para gravar configuracoes e logs do sistema
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    storageKey: 'sb-demattos-v2-admin-auth',
  },
});
