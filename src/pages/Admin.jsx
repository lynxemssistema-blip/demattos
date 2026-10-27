import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import AdminRoute from '@/components/auth/AdminRoute';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  Users, 
  Scissors, 
  Package, 
  Settings, 
  TrendingUp,
  HelpCircle,
  Video,
  Receipt,
  Smartphone
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import DashboardVendas from '../components/admin/DashboardVendas';
import AdminHelpModal from '../components/admin/AdminHelpModal';

function AdminContent() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    agendamentos: 0,
    clientes: 0,
    servicos: 0,
    produtos: 0,
    profissionais: 0,
    galeria: 0,
    depoimentos: 0,
  });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 10000)
    );
    try {
      const currentUser = await Promise.race([base44.auth.me(), timeout]);
      setUser(currentUser);
      await loadStats();
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await base44.functions.invoke('getAdminStats', {});
      // ✅ PROTEÇÃO: Optional chaining seguro para evitar crash se response for undefined
      if (response?.data?.success && response?.data?.stats) {
        setStats({
          agendamentos: response.data.stats.agendamentos ?? 0,
          clientes: response.data.stats.clientes ?? 0,
          servicos: response.data.stats.servicos ?? 0,
          produtos: response.data.stats.produtos ?? 0,
          profissionais: response.data.stats.profissionais ?? 0,
          galeria: response.data.stats.galeria ?? 0,
          depoimentos: response.data.stats.depoimentos ?? 0,
        });
      } else {
        // ✅ Fallback seguro se resposta for inválida
        setStats({
          agendamentos: 0,
          clientes: 0,
          servicos: 0,
          produtos: 0,
          profissionais: 0,
          galeria: 0,
          depoimentos: 0,
        });
      }
    } catch (error) {
      // ✅ Captura erros silenciosamente e retorna estados zerados
      setStats({
        agendamentos: 0,
        clientes: 0,
        servicos: 0,
        produtos: 0,
        profissionais: 0,
        galeria: 0,
        depoimentos: 0,
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#D4AF37]"></div>
          <p className="text-white mt-4">Carregando...</p>
        </div>
      </div>
    );
  }

  const menuItems = [
    {
      title: 'Agendamentos',
      description: 'Gerencie os agendamentos',
      icon: Calendar,
      count: stats.agendamentos,
      link: createPageUrl('AdminAgendamentos'),
      color: 'bg-blue-500',
      help: 'Visualize, confirme ou cancele agendamentos dos clientes. Filtre por status e pesquise por nome ou telefone.',
    },
    {
      title: 'Clientes',
      description: 'Lista de clientes cadastrados',
      icon: Users,
      count: stats.clientes,
      link: createPageUrl('AdminClientes'),
      color: 'bg-green-500',
      help: 'Cadastre e gerencie informações completas dos clientes, incluindo contatos, redes sociais e observações.',
    },
    {
      title: 'Evolution WhatsApp',
      description: 'QR Code, Modelos de Mensagem e Lembretes',
      icon: Smartphone,
      count: null,
      badge: 'Instância DeMattos',
      link: createPageUrl('AdminWhatsApp'),
      color: 'bg-[#25D366]',
      help: 'Gerenciador da Evolution API: conecte o WhatsApp da barbearia lendo o QR Code pelo celular. Configure os modelos de confirmação, cancelamento, lembretes agendados e selecione Modo de Teste (Luan) ou Modo Oficial.',
    },
    {
      title: 'Serviços',
      description: 'Gerenciar serviços oferecidos',
      icon: Scissors,
      count: stats.servicos,
      link: createPageUrl('AdminServicos'),
      color: 'bg-purple-500',
      help: 'Adicione, edite ou remova serviços. Configure preço, duração, ícone e defina quais aparecem na página inicial.',
    },
    {
      title: 'Produtos',
      description: 'Gerenciar produtos',
      icon: Package,
      count: stats.produtos,
      link: createPageUrl('AdminProdutos'),
      color: 'bg-orange-500',
      help: 'Gerencie produtos físicos e digitais. Configure preços, estoque, imagens e links de prévia para produtos premium.',
    },
    {
      title: 'Profissionais',
      description: 'Gerenciar equipe da barbearia',
      icon: Users,
      count: stats.profissionais,
      link: createPageUrl('AdminProfissionais'),
      color: 'bg-teal-500',
      help: 'Cadastre profissionais, defina serviços que executam, configure horários de trabalho e gerencie suas agendas.',
    },
    {
      title: 'Galeria',
      description: 'Gerenciar imagens da galeria',
      icon: Package,
      count: stats.galeria,
      link: createPageUrl('AdminGaleria'),
      color: 'bg-pink-500',
      help: 'Gerencie imagens da galeria e edite todo o conteúdo da seção "Sobre" da página inicial.',
    },
    {
      title: 'Depoimentos',
      description: 'Aprovar e gerenciar depoimentos',
      icon: TrendingUp,
      count: stats.depoimentos,
      link: createPageUrl('AdminDepoimentos'),
      color: 'bg-yellow-500',
      help: 'Aprove depoimentos enviados por clientes. Use IA para análise de sentimento e geração de respostas.',
    },
    {
      title: 'Configurações',
      description: 'Endereço, telefone e horários',
      icon: Settings,
      count: null,
      link: createPageUrl('AdminConfiguracoes'),
      color: 'bg-gray-500',
      help: 'Configure informações básicas da barbearia: endereço, telefone de contato e horário de funcionamento.',
    },
    {
      title: 'Assistente IA',
      description: 'Configurar voz e comportamento',
      icon: Settings,
      count: null,
      link: createPageUrl('AdminAssistente'),
      color: 'bg-cyan-500',
      help: 'Personalize a voz do assistente virtual: tipo de voz, velocidade, tom, volume e ative/desative recursos de áudio.',
    },
    {
      title: 'Carrossel Hero',
      description: 'Gerenciar imagens da página inicial',
      icon: Package,
      count: null,
      link: createPageUrl('AdminCarrossel'),
      color: 'bg-indigo-500',
      help: 'Gerencie as imagens do carrossel da página inicial. Adicione, reordene e ative/desative imagens.',
    },
    {
      title: 'Pacotes de Créditos',
      description: 'Configurar pacotes de créditos IA',
      icon: Package,
      count: null,
      link: createPageUrl('AdminPacotesCredito'),
      color: 'bg-amber-500',
      help: 'Configure os pacotes de créditos IA disponíveis para compra. Defina quantidade, preço e descontos.',
    },
    {
      title: 'Combos de Produtos',
      description: 'Criar combos com múltiplos PDFs',
      icon: Package,
      count: null,
      link: createPageUrl('AdminCombos'),
      color: 'bg-yellow-600',
      help: 'Crie combos de produtos digitais a um preço especial. O cliente recebe todos os PDFs incluídos no combo por email.',
    },
    {
      title: 'Vídeos do Instagram',
      description: 'Gerenciar vídeos do Instagram',
      icon: Video,
      count: null,
      link: createPageUrl('AdminInstagramVideos'),
      color: 'bg-fuchsia-500',
      help: 'Adicione links de vídeos do Instagram para exibir no site. Cole o link completo do post.',
    },
    {
      title: 'Tentativas de Compra',
      description: 'Sessões Stripe e recibos',
      icon: Receipt,
      count: null,
      link: createPageUrl('AdminTentativasCompra'),
      color: 'bg-emerald-500',
      help: 'Veja todas as sessões de checkout abertas e confirmadas, incluindo recibos oficiais da Stripe.',
    },
    {
      title: 'Rastreamento & Analytics',
      description: 'Facebook Pixel e Google Tag Manager',
      icon: Settings,
      count: null,
      link: '/AdminRastreamento',
      color: 'bg-blue-600',
      help: 'Configure o ID do Facebook Pixel e do Google Tag Manager. Os scripts serão injetados automaticamente em todas as páginas.',
    },
    ];

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="bg-[#111111] border-b border-[#2a2a2a]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white mb-1" style={{ fontFamily: 'Georgia, serif' }}>
                Painel Administrativo
              </h1>
              <p className="text-xs sm:text-sm text-gray-400">Barbearia DeMattos</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <AdminHelpModal />
              <Link to={createPageUrl('Home')}>
                <Button className="bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 text-sm sm:text-base touch-manipulation min-h-[44px]">
                  Ver Site
                </Button>
              </Link>
              <Button
                onClick={() => base44.auth.logout()}
                className="bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 text-sm sm:text-base touch-manipulation min-h-[44px]"
              >
                Sair
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Welcome */}
        <div className="mb-8 sm:mb-12">
          <h2 className="text-lg sm:text-xl text-white mb-2">
            Bem-vindo, <span className="text-[#D4AF37]">{user?.full_name}</span>
          </h2>
          <p className="text-sm sm:text-base text-gray-400">
            Gerencie sua barbearia de forma simples e eficiente
          </p>
        </div>

        {/* Dashboard de Vendas */}
        <div className="mb-12">
          <DashboardVendas />
        </div>

        {/* Menu Grid */}
        <TooltipProvider>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {menuItems.map((item) => (
              <Link key={item.title} to={item.link}>
                <Card className="bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#D4AF37]/30 transition-all duration-300 h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 ${item.color} rounded-lg flex items-center justify-center bg-opacity-20`}>
                        <item.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${item.color.replace('bg-', 'text-')}`} />
                      </div>
                      <div className="flex items-center gap-2">
                        {item.count !== null && (
                          <div className="text-xl sm:text-2xl font-bold text-white">
                            {item.count}
                          </div>
                        )}
                        {item.badge && (
                          <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-[#25D366]/15 text-[#25D366] border border-[#25D366]/30 whitespace-nowrap">
                            {item.badge}
                          </span>
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className="text-gray-500 hover:text-[#D4AF37] transition-colors cursor-help"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                              onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); }}
                            >
                              <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="bg-[#1a1a1a] border-[#D4AF37]/30 text-white max-w-xs">
                            <p className="text-sm">{item.help}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                    <CardTitle className="text-base sm:text-lg text-white mt-3 sm:mt-4">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs sm:text-sm text-gray-400">{item.description}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </TooltipProvider>
      </div>
    </div>
  );
}

export default function Admin() {
  return (
    <AdminRoute>
      <AdminContent />
    </AdminRoute>
  );
}