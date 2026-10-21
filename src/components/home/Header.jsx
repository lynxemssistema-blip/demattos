import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ShoppingCart, User, LogIn, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';

const navItems = [
  { label: 'Início', href: '#' },
  { label: 'Sobre', href: '#sobre' },
  { label: 'Serviços', href: '#servicos' },
  { label: 'Profissionais', href: '#profissionais' },
  { label: 'Produtos', href: '#produtos' },
  { label: 'Catálogo', href: '/Catalogo', isPage: true },
  { label: 'Galeria', href: '#galeria' },
  { label: 'Depoimentos', href: '#depoimentos' },
  { label: 'FAQ', href: '#faq' },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, cliente, logout: authContextLogout } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    authContextLogout(true);
  };

  const { data: carrinhoItems = [] } = useQuery({
    queryKey: ['carrinho-header', cliente?.email],
    queryFn: async () => {
      if (!cliente?.email) return [];
      const response = await base44.functions.invoke('getCarrinhoCliente', { 
        cliente_email: cliente.email 
      });
      return response.data.success ? response.data.items : [];
    },
    enabled: !!cliente?.email,
    retry: 1,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000,
  });

  const scrollToSection = (href) => {
    setMobileOpen(false);
    if (href === '#') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-[#0a0a0a]/95 backdrop-blur-md border-b border-[#1a1a1a]' : 'bg-transparent'
        }`}
        style={{ 
          paddingTop: 'max(1rem, env(safe-area-inset-top))',
          WebkitBackdropFilter: 'blur(12px)',
          WebkitTouchCallout: 'none'
        }}
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('#');
              }}
              className="flex items-center gap-2"
            >
              <div className="text-xl font-bold text-white" style={{ fontFamily: 'Georgia, serif' }}>
                <span className="text-[#D4AF37]">DM</span>
              </div>
              <div className="hidden sm:block">
                <div className="text-white font-bold text-lg tracking-wide" style={{ fontFamily: 'Georgia, serif' }}>
                  DE MATTOS
                </div>
                <div className="text-[#D4AF37] text-[10px] tracking-[0.2em] -mt-1">
                  BARBEARIA
                </div>
              </div>
            </a>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-8">
              {navItems.map((item) => (
                item.isPage ? (
                  <Link
                    key={item.label}
                    to={createPageUrl('Catalogo')}
                    className="text-gray-300 hover:text-[#D4AF37] transition-colors text-sm tracking-wide"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToSection(item.href);
                    }}
                    className="text-gray-300 hover:text-[#D4AF37] transition-colors text-sm tracking-wide"
                  >
                    {item.label}
                  </a>
                )
              ))}
            </nav>

            {/* CTA */}
            <div className="hidden lg:flex items-center gap-3">
              {/* User Info */}
              {cliente && (
                <div className="flex items-center gap-2 text-gray-300 text-sm">
                  <User className="w-4 h-4 text-[#D4AF37]" />
                  <span>{cliente.nome?.split(' ')[0]}</span>
                </div>
              )}
              
              {/* Carrinho */}
              {cliente && (
                <Link to={createPageUrl('Carrinho')}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative text-gray-300 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    {carrinhoItems.length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-[#D4AF37] text-black text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                        {carrinhoItems.length}
                      </span>
                    )}
                  </Button>
                </Link>
              )}
              
              {user ? (
                <>
                  <Link to={createPageUrl('CanalCliente')}>
                    <Button
                      variant="outline"
                      className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10 font-semibold px-6 tracking-wide"
                    >
                      <User className="w-4 h-4 mr-2" />
                      MEU CANAL
                    </Button>
                  </Link>
                  <Button
                    onClick={handleLogout}
                    className="bg-[#D4AF37] hover:bg-[#B8973D] text-black font-semibold px-6 tracking-wide"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    SAIR
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => base44.auth.redirectToLogin()}
                  className="bg-[#D4AF37] hover:bg-[#B8973D] text-black font-semibold px-6 tracking-wide"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  ENTRAR
                </Button>
              )}
            </div>

            {/* Mobile CTAs */}
            <div className="flex lg:hidden items-center gap-2">
              {user && (
                <div className="flex items-center gap-2">
                  {cliente?.foto_url ? (
                    <img src={cliente.foto_url} alt={cliente.nome} className="w-7 h-7 rounded-full object-cover border border-[#D4AF37]" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37] flex items-center justify-center">
                      <User className="w-4 h-4 text-[#D4AF37]" />
                    </div>
                  )}
                  <span className="text-gray-300 text-xs font-medium max-w-20 truncate">
                    {cliente?.nome?.split(' ')[0] || user.full_name?.split(' ')[0]}
                  </span>
                </div>
              )}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="text-white p-2"
              >
                {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 lg:hidden"
          >
            <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
            <div 
              className="absolute right-0 top-0 bottom-0 w-72 bg-[#0a0a0a] border-l border-[#1a1a1a] px-6 overflow-y-auto"
              style={{ 
                paddingTop: 'max(6rem, calc(1.5rem + env(safe-area-inset-top)))',
                paddingBottom: 'calc(100px + max(1rem, env(safe-area-inset-bottom)))',
                overscrollBehavior: 'contain',
                WebkitOverscrollBehavior: 'contain'
              }}
            >
              <nav className="flex flex-col gap-4">
                {/* User Info Mobile */}
                {cliente && (
                  <div className="flex items-center gap-2 text-gray-300 text-sm pb-4 border-b border-[#1a1a1a]">
                    <User className="w-4 h-4 text-[#D4AF37]" />
                    <span>{cliente.nome}</span>
                  </div>
                )}
                
                {/* Carrinho Mobile */}
                {cliente && (
                  <Link
                    to={createPageUrl('Carrinho')}
                    className="flex items-center justify-between text-gray-300 hover:text-[#D4AF37] transition-colors text-lg py-2 border-b border-[#1a1a1a]"
                    onClick={() => setMobileOpen(false)}
                  >
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5" />
                      <span>Carrinho</span>
                    </div>
                    {carrinhoItems.length > 0 && (
                      <span className="bg-[#D4AF37] text-black text-xs px-2 py-1 rounded-full font-bold">
                        {carrinhoItems.length}
                      </span>
                    )}
                  </Link>
                )}
                
                {navItems.map((item) => (
                  item.isPage ? (
                    <Link
                      key={item.label}
                      to={createPageUrl('Catalogo')}
                      className="text-gray-300 hover:text-[#D4AF37] transition-colors text-lg py-2 border-b border-[#1a1a1a]"
                      onClick={() => setMobileOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <a
                      key={item.label}
                      href={item.href}
                      onClick={(e) => {
                        e.preventDefault();
                        scrollToSection(item.href);
                      }}
                      className="text-gray-300 hover:text-[#D4AF37] transition-colors text-lg py-2 border-b border-[#1a1a1a]"
                    >
                      {item.label}
                    </a>
                  )
                ))}
                {user ? (
                  <>
                    <Link to={createPageUrl('CanalCliente')}>
                      <Button
                        className="bg-[#D4AF37] hover:bg-[#B8973D] text-black font-semibold mt-4 w-full"
                        onClick={() => setMobileOpen(false)}
                      >
                        <User className="w-4 h-4 mr-2" />
                        MEU CANAL
                      </Button>
                    </Link>
                    <Button
                      onClick={handleLogout}
                      variant="outline"
                      className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10 font-semibold mt-2 w-full"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      SAIR
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => base44.auth.redirectToLogin()}
                    className="bg-[#D4AF37] hover:bg-[#B8973D] text-black font-semibold mt-4 w-full"
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    ENTRAR
                  </Button>
                )}
              </nav>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}