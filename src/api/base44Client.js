import { supabase } from '@/lib/supabaseClient';
import { supabaseEntities } from './supabaseEntities';
import { invokeSupabaseFunction } from './supabaseFunctions';

// Cliente universal conectado 100% ao Supabase (Zero dependência Base44)
export const base44 = {
  entities: supabaseEntities,
  asServiceRole: {
    entities: supabaseEntities,
    functions: {
      invoke: (name, params) => invokeSupabaseFunction(name, params)
    }
  },
  functions: {
    invoke: (functionName, params) => invokeSupabaseFunction(functionName, params)
  },
  auth: {
    async isAuthenticated() {
      const { data: { session } } = await supabase.auth.getSession();
      return !!session;
    },
    async me() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      const userEmail = (user.email || '').toLowerCase().trim();
      let role = profile?.role || user.user_metadata?.role || 'user';

      // Se não for admin pelo profile, verificar se é profissional com acesso admin ou email privilegiado
      if (role !== 'admin' && role !== 'superadmin') {
        const isAdminEmail = ['luandemattos102030@gmail.com', 'edsonmanoel2012@gmail.com'].includes(userEmail);
        if (isAdminEmail) {
          role = 'admin';
        } else {
          try {
            const { data: prof } = await supabase
              .from('profissional')
              .select('tem_acesso_admin')
              .ilike('email', userEmail)
              .eq('tem_acesso_admin', true)
              .maybeSingle();
            if (prof?.tem_acesso_admin) {
              role = 'admin';
            }
          } catch (e) {
            // Ignora falhas de query
          }
        }
      }

      const isAdmin = role === 'admin' || role === 'superadmin';

      return {
        id: user.id,
        email: user.email,
        full_name: profile?.full_name || user.user_metadata?.full_name || user.email,
        role,
        isAdmin,
        ai_credits: profile?.ai_credits || 0,
        profissao: profile?.profissao || null
      };
    },
    async logout(redirectUrl) {
      await supabase.auth.signOut();
      if (redirectUrl) {
        window.location.href = redirectUrl;
      }
    },
    redirectToLogin(redirectUrl) {
      const target = redirectUrl ? `/Login?redirect=${encodeURIComponent(redirectUrl)}` : '/Login';
      window.location.href = target;
    }
  },
  integrations: {
    Core: {
      async UploadFile({ file }) {
        const fileExt = file.name ? file.name.split('.').pop() : 'bin';
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
        const { data, error } = await supabase.storage
          .from('public-media')
          .upload(fileName, file, { cacheControl: '3600', upsert: true });

        if (error) {
          console.error('Erro no upload de arquivo:', error);
          throw error;
        }

        const { data: publicUrlData } = supabase.storage
          .from('public-media')
          .getPublicUrl(fileName);

        return { file_url: publicUrlData.publicUrl };
      }
    }
  },
  appLogs: {
    async logUserInApp() {
      // Telemetria interna desativada (sem Base44)
    }
  },
  supabase
};

// Aliases para exportação padrão
export const api = base44;
export const db = supabaseEntities;
