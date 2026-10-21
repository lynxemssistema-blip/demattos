import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

export default function AdminRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const user = await base44.auth.me();
        
        if (!user) {
          base44.auth.redirectToLogin(window.location.pathname);
          return;
        }

        setUserName(user.full_name || user.email);

        // Verificar se é admin via role OU via Profissional.tem_acesso_admin
        if (user.role === 'admin' || user.role === 'superadmin') {
          setIsAdmin(true);
        } else {
          // Verificar se é profissional com acesso admin
          const profissionais = await base44.asServiceRole.entities.Profissional.filter({ 
            email: user.email,
            tem_acesso_admin: true,
            ativo: true
          });
          
          setIsAdmin(profissionais.length > 0);
        }
      } catch (error) {
        base44.auth.redirectToLogin();
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-6">
        <div className="max-w-md w-full text-center">
          <ShieldAlert className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h1 className="text-2xl font-bold text-white mb-2">Acesso Negado</h1>
          <p className="text-gray-400 mb-6">
            Olá {userName}, você não tem permissão de administrador para acessar esta área.
          </p>
          <Link to={createPageUrl('Home')}>
            <Button className="bg-[#D4AF37] hover:bg-[#B8973D] text-black">
              Voltar para Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return children;
}