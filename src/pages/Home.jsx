import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Settings, ChevronDown, ChevronUp } from 'lucide-react';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useAuth } from '@/lib/AuthContext';
import { useHomeData } from '@/hooks/useHomeData';
import Header from '@/components/home/Header';
import HeroSection from '@/components/home/HeroSection';
import AboutSection from '@/components/home/AboutSection';
import ServicesSection from '@/components/home/ServicesSection';
import ProfessionalsSection from '@/components/home/ProfessionalsSection';
import ProductsSection from '@/components/home/ProductsSection';
import GallerySection from '@/components/home/GallerySection';
import TestimonialsSection from '@/components/home/TestimonialsSection';
import InstagramVideosSection from '@/components/home/InstagramVideosSection';
import ContactSection from '@/components/home/ContactSection';
import FAQSection from '@/components/home/FAQSection';
import Footer from '@/components/home/Footer';
import ChatAssistant from '@/components/ChatAssistant';
import PullToRefresh from '@/components/PullToRefresh';
import { useQueryClient } from '@tanstack/react-query';

export default function Home() {
  const { user } = useAuth();
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const queryClient = useQueryClient();

  // UMA ÚNICA chamada backend busca todos os dados da Home
  const {
    hero, sobre, totalAtendimentos, atendimentosPorProfissional,
    servicos, profissionais, produtos, galeria,
    depoimentos, configuracoes, instagram
  } = useHomeData();

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['home-data'] });
    await queryClient.refetchQueries({ queryKey: ['home-data'] });
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  const adminPages = useMemo(() => [
    { name: 'Admin', url: createPageUrl('Admin'), label: 'Painel Admin' },
    { name: 'Agendamentos', url: createPageUrl('AdminAgendamentos'), label: 'Agendamentos' },
    { name: 'Clientes', url: createPageUrl('AdminClientes'), label: 'Clientes' },
    { name: 'Serviços', url: createPageUrl('AdminServicos'), label: 'Serviços' },
    { name: 'Produtos', url: createPageUrl('AdminProdutos'), label: 'Produtos' },
    { name: 'Profissionais', url: createPageUrl('AdminProfissionais'), label: 'Profissionais' },
    { name: 'Galeria', url: createPageUrl('AdminGaleria'), label: 'Galeria' },
    { name: 'Depoimentos', url: createPageUrl('AdminDepoimentos'), label: 'Depoimentos' },
    { name: 'Configurações', url: createPageUrl('AdminConfiguracoes'), label: 'Configurações' },
    { name: 'Assistente IA', url: createPageUrl('AdminAssistente'), label: 'Assistente IA' },
    { name: 'Carrossel', url: createPageUrl('AdminCarrossel'), label: 'Carrossel Hero' },
    { name: 'Pacotes Crédito', url: createPageUrl('AdminPacotesCredito'), label: 'Pacotes Crédito' },
    { name: 'Catálogo', url: createPageUrl('Catalogo'), label: 'Catálogo' },
    { name: 'Agenda Prof', url: createPageUrl('AgendaProfissional'), label: 'Agenda Profissional' },
    { name: 'Canal Cliente', url: createPageUrl('CanalCliente'), label: 'Canal Cliente' },
    { name: 'Tentativas de Compra', url: createPageUrl('AdminTentativasCompra'), label: 'Tentativas de Compra' },
  ], []);

  return (
    <ErrorBoundary>
      <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-screen bg-[#0a0a0a]">
        {user && !isAdmin && (
          <div className="fixed top-20 right-4 z-30 pointer-events-auto hidden lg:block">
            <div className="bg-[#1a1a1a] border border-[#D4AF37] rounded-lg shadow-2xl overflow-hidden pointer-events-auto">
              <div className="px-4 py-3 bg-[#D4AF37]/10 border-b border-[#D4AF37]/30">
                <p className="text-white text-sm">
                  Olá, <span className="font-bold text-[#D4AF37]">{user.full_name?.split(' ')[0] || 'Usuário'}</span>
                </p>
              </div>
              <div className="p-3 space-y-2">
                <Link to={createPageUrl('CanalCliente')}>
                  <Button className="w-full bg-[#D4AF37] hover:bg-[#B8973D] text-black font-semibold text-sm touch-manipulation">Meu Canal</Button>
                </Link>
                <Link to={createPageUrl('CanalCliente')}>
                  <Button variant="outline" className="w-full border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10 text-sm touch-manipulation">Fazer Agendamento</Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {isAdmin && (
          <div className="fixed top-20 right-4 z-30 pointer-events-auto hidden md:block">
            <div className="bg-[#1a1a1a] border border-[#D4AF37] rounded-lg shadow-2xl overflow-hidden pointer-events-auto">
              <button onClick={() => setShowAdminPanel(!showAdminPanel)} className="flex items-center gap-2 px-4 py-3 bg-[#D4AF37] text-black font-semibold hover:bg-[#B8973D] transition-colors w-full touch-manipulation">
                <Settings className="w-5 h-5" /> Acesso Rápido Admin
                {showAdminPanel ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
              </button>
              {showAdminPanel && (
                <div className="p-3 max-h-[70vh] overflow-y-auto">
                  <div className="grid grid-cols-2 gap-2">
                    {adminPages.map((page) => (
                      <Link key={page.name} to={page.url}>
                        <Button variant="ghost" className="w-full justify-start text-white hover:bg-[#D4AF37]/20 hover:text-[#D4AF37] text-xs touch-manipulation">{page.label}</Button>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <Header />
        <ErrorBoundary><HeroSection hero={hero} /></ErrorBoundary>
        <ErrorBoundary><AboutSection sobre={sobre} totalAtendimentos={totalAtendimentos} /></ErrorBoundary>
        <ErrorBoundary><ServicesSection servicos={servicos} /></ErrorBoundary>
        <ErrorBoundary><ProfessionalsSection profissionais={profissionais} servicos={servicos} atendimentosPorProfissional={atendimentosPorProfissional} /></ErrorBoundary>
        <ErrorBoundary><ProductsSection produtos={produtos} /></ErrorBoundary>
        <ErrorBoundary><GallerySection galeria={galeria} /></ErrorBoundary>
        <ErrorBoundary><InstagramVideosSection instagram={instagram} /></ErrorBoundary>
        <ErrorBoundary><TestimonialsSection depoimentos={depoimentos} /></ErrorBoundary>
        <ErrorBoundary><ContactSection configuracoes={configuracoes} /></ErrorBoundary>
        <ErrorBoundary><FAQSection /></ErrorBoundary>
        <Footer />
        <ChatAssistant />
        <div className="lg:hidden" style={{ height: 'calc(64px + env(safe-area-inset-bottom, 0px))' }} />
      </div>
      </PullToRefresh>
    </ErrorBoundary>
  );
}