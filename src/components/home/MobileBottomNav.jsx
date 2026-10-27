import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ShoppingBag, User, Home, Sparkles, Camera, Calendar, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

const baseNavItems = [
  { label: 'Início', icon: Home, action: 'scroll', href: '#' },
  { label: 'Catálogo', icon: ShoppingBag, action: 'page', to: createPageUrl('Catalogo') },
  { label: 'Agendar', icon: Calendar, action: 'scroll', href: '#agendamento' },
  { label: 'Meu Canal', icon: User, action: 'page', to: createPageUrl('CanalCliente') },
];

export default function MobileBottomNav() {
  const { cliente, logout: authContextLogout } = useAuth();
  const [aiCredits, setAiCredits] = useState(0);
  const [hasCredits, setHasCredits] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const isAdminPage = location.pathname.toLowerCase().startsWith('/admin');

  useEffect(() => {
    // Detectar mobile via JS (não CSS) — mais confiável
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Usa créditos do AuthContext se disponível
  useEffect(() => {
    if (cliente?.ai_credits && cliente.ai_credits > 0) {
      setAiCredits(cliente.ai_credits);
      setHasCredits(true);
    } else {
      setAiCredits(0);
      setHasCredits(false);
    }
  }, [cliente]);

  const scrollToElement = (href, attempts = 0) => {
    const el = document.querySelector(href);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else if (attempts < 20) {
      // Retry até 2 segundos (20x a cada 100ms) enquanto a página monta
      setTimeout(() => scrollToElement(href, attempts + 1), 100);
    }
  };

  const handleScroll = (href) => {
    if (href === '#') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const currentPath = window.location.pathname;
    if (currentPath !== '/') {
      navigate('/');
    } else {
      // Re-clica na aba ativa: scroll para o topo
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    // Aguarda a página montar e tenta scroll com retry
    scrollToElement(href);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    window.dispatchEvent(new CustomEvent('openChatWithPhoto', { detail: { file } }));
    e.target.value = '';
  };

  if (!isMobile || isAdminPage) return null;

  const logoutItem = { label: 'Sair', icon: LogOut, action: 'logout' };

  const navItems = hasCredits
    ? [baseNavItems[0], baseNavItems[1], { action: 'ai' }, baseNavItems[2], baseNavItems[3]]
    : cliente
      ? [...baseNavItems, logoutItem]
      : baseNavItems;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#0a0a0a',
        borderTop: '1px solid #2a2a2a',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '0 4px',
        paddingBottom: 'env(safe-area-inset-bottom, 8px)',
        height: 'auto',
        minHeight: '60px',
      }}
    >
      {navItems.map((item, idx) => {
        if (item.action === 'ai') {
          return (
            <div
              key="ai"
              style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: '48px', minHeight: '44px', padding: '8px 12px' }}
            >
              {/* Botão IA centralizado */}
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('openChat'))}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: '#D4AF37', background: 'none', border: 'none', cursor: 'pointer', padding: 0, touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
              >
                <div style={{
                  position: 'relative',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #D4AF37, #B8973D)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(212,175,55,0.4)',
                }}>
                  <Sparkles size={20} color="#000" />
                  {aiCredits > 0 && (
                    <span style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-4px',
                      background: '#000',
                      color: '#D4AF37',
                      fontSize: '8px',
                      fontWeight: 'bold',
                      borderRadius: '50%',
                      width: '16px',
                      height: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid #D4AF37',
                    }}>
                      {aiCredits > 99 ? '99' : aiCredits}
                    </span>
                  )}
                  {/* Botão câmera pequeno no canto superior esquerdo do círculo */}
                  <div
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    style={{
                      position: 'absolute',
                      top: '-4px',
                      left: '-4px',
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      backgroundColor: '#1a1a1a',
                      border: '1px solid rgba(212,175,55,0.5)',
                      color: '#D4AF37',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      touchAction: 'manipulation',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    <Camera size={9} />
                  </div>
                </div>
                <span style={{ fontSize: '10px', fontWeight: '500' }}>IA</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </div>
          );
        }

        const Icon = item.icon;
        const commonStyle = {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
          minWidth: '48px',
          minHeight: '44px',
          padding: '8px 12px',
          color: '#9ca3af',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textDecoration: 'none',
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'manipulation',
        };

        if (item.action === 'logout') {
          return (
            <button key="logout" onClick={() => authContextLogout(true)} style={{ ...commonStyle, color: '#ef4444' }}>
              <Icon size={20} />
              <span style={{ fontSize: '10px', fontWeight: '500' }}>{item.label}</span>
            </button>
          );
        }

        if (item.action === 'scroll') {
          return (
            <button key={item.label} onClick={() => handleScroll(item.href)} style={commonStyle}>
              <Icon size={20} />
              <span style={{ fontSize: '10px', fontWeight: '500' }}>{item.label}</span>
            </button>
          );
        }

        return (
          <Link key={item.label} to={item.to} style={commonStyle}>
            <Icon size={20} />
            <span style={{ fontSize: '10px', fontWeight: '500' }}>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}