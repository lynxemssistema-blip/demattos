import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  HelpCircle, Calendar, Users, Package, Settings, Video, Plug, ChevronDown, ChevronRight, Zap,
  ShoppingCart, Image, Star, Bot, CreditCard, Layers, BarChart2
} from 'lucide-react';

const secoes = [
  {
    categoria: 'Vendas & Financeiro',
    cor: 'text-yellow-400',
    bg: 'bg-yellow-500/10 border-yellow-500/20',
    items: [
      {
        icon: BarChart2,
        cor: 'text-yellow-400',
        titulo: 'Dashboard de Vendas',
        local: 'Painel Admin (topo)',
        descricao: 'Visualize gráficos de receita, número de compras confirmadas, produtos mais vendidos e evolução mensal. Os dados são atualizados em tempo real.',
        dicas: ['Clique nos gráficos para ver detalhes por período', 'Acompanhe o ranking de produtos mais vendidos', 'Compare receita mensal nos gráficos de barras'],
      },
      {
        icon: Package,
        cor: 'text-orange-400',
        titulo: 'Produtos',
        local: 'Menu → Produtos',
        descricao: 'Gerencie o catálogo completo de produtos físicos e digitais. Para produtos digitais, faça upload do PDF e defina uma prévia gratuita. Configure créditos IA por compra.',
        dicas: ['Ative "Destaque Home" para o produto aparecer na página inicial', 'Clique em "Sincronizar com Stripe" após alterar preços', 'Use o botão de IA para gerar descrições automáticas', 'Copie o link de venda para divulgar diretamente no Instagram'],
      },
      {
        icon: Layers,
        cor: 'text-yellow-600',
        titulo: 'Combos de Produtos',
        local: 'Menu → Combos de Produtos',
        descricao: 'Crie pacotes com múltiplos PDFs a um preço promocional. O sistema calcula automaticamente o desconto em relação à soma dos produtos. O cliente recebe todos os PDFs por email após a compra.',
        dicas: ['Selecione 2 ou mais produtos digitais para o combo', 'O preço do combo deve ser menor que a soma individual', 'Copie o link do combo para divulgar no Instagram', 'Use IA para gerar uma descrição atrativa do pacote'],
      },
      {
        icon: CreditCard,
        cor: 'text-amber-400',
        titulo: 'Pacotes de Créditos IA',
        local: 'Menu → Pacotes de Créditos',
        descricao: 'Configure os pacotes de créditos disponíveis para os clientes comprarem. Cada crédito permite ao cliente usar recursos de IA no Canal DeMattos.',
        dicas: ['Ative "Destaque" no pacote mais popular para destacá-lo', 'Sincronize com Stripe após criar ou alterar preços', 'Defina o percentual de desconto para atrair compras em quantidade'],
      },
      {
        icon: ShoppingCart,
        cor: 'text-green-400',
        titulo: 'Serviços',
        local: 'Menu → Serviços',
        descricao: 'Cadastre todos os serviços oferecidos pela barbearia. Configure nome, preço, duração estimada e ícone visual. Ative "Destaque Home" para exibir na página inicial.',
        dicas: ['A duração é usada para calcular blocos de agenda automaticamente', 'Ícones disponíveis: Scissors, Sparkles, Droplets, Crown', 'Desative serviços sem excluí-los para mantê-los histórico'],
      },
    ],
  },
  {
    categoria: 'Agenda & Clientes',
    cor: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
    items: [
      {
        icon: Calendar,
        cor: 'text-blue-400',
        titulo: 'Agendamentos',
        local: 'Menu → Agendamentos',
        descricao: 'Visualize e gerencie todos os agendamentos em três modos: Lista, Tabela e Calendário. Confirme, cancele ou remarque horários. Acesse o histórico completo por cliente.',
        dicas: ['Use o modo Calendário para uma visão semanal dos horários', 'Filtre por profissional, status ou data para achar rápido', 'Clique em um agendamento para ver detalhes e tomar ações', 'Agendamentos confirmados automaticamente aparecem com ícone especial'],
      },
      {
        icon: Users,
        cor: 'text-green-400',
        titulo: 'Clientes',
        local: 'Menu → Clientes',
        descricao: 'Cadastre e consulte informações completas dos clientes. Veja histórico de agendamentos, produtos comprados, créditos IA disponíveis e gerencie canais DeMattos.',
        dicas: ['Pesquise por nome, telefone ou email', 'Conceda créditos IA manualmente na ficha do cliente', 'O ícone de canal indica clientes com acesso ao Canal DeMattos', 'Clientes cadastrados via WhatsApp são marcados automaticamente'],
      },
      {
        icon: Users,
        cor: 'text-teal-400',
        titulo: 'Profissionais',
        local: 'Menu → Profissionais',
        descricao: 'Cadastre a equipe, defina quais serviços cada profissional executa e configure sua agenda de trabalho. Cada profissional tem uma senha de acesso à sua agenda pessoal.',
        dicas: ['Configure horários de trabalho e intervalo de almoço por profissional', 'Selecione os serviços que cada profissional realiza', 'A senha de acesso permite ao profissional ver sua própria agenda', 'Ative "Destaque Home" para o profissional aparecer na página inicial'],
      },
    ],
  },
  {
    categoria: 'Conteúdo & Visual',
    cor: 'text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/20',
    items: [
      {
        icon: Image,
        cor: 'text-pink-400',
        titulo: 'Galeria & Sobre',
        local: 'Menu → Galeria',
        descricao: 'Gerencie as fotos da galeria exibida no site. Defina o tamanho de cada imagem na grade (1 ou 2 colunas/linhas) e edite os textos da seção "Sobre" da página inicial.',
        dicas: ['Use imagens em col-span-2 para fotos em destaque horizontal', 'Edite título, parágrafos e estatísticas da seção Sobre', 'Arraste para reordenar as imagens na galeria'],
      },
      {
        icon: Package,
        cor: 'text-indigo-400',
        titulo: 'Carrossel Hero',
        local: 'Menu → Carrossel Hero',
        descricao: 'Gerencie as imagens do banner principal (hero) da página inicial. Adicione novas imagens, defina a ordem de exibição e ative/desative cada uma individualmente.',
        dicas: ['Recomendado usar imagens no formato 16:9 ou panorâmico', 'Desative imagens temporariamente sem excluí-las', 'A ordem de exibição pode ser ajustada pelo campo "Ordem"'],
      },
      {
        icon: Video,
        cor: 'text-fuchsia-400',
        titulo: 'Vídeos do Instagram',
        local: 'Menu → Vídeos do Instagram',
        descricao: 'Adicione links de posts e reels do Instagram para exibir na seção de vídeos do site. Cole a URL completa do post.',
        dicas: ['Cole a URL completa do post (ex: https://www.instagram.com/p/...)', 'Os vídeos são exibidos como miniaturas clicáveis no site', 'Ative ou desative vídeos individualmente'],
      },
      {
        icon: Star,
        cor: 'text-yellow-400',
        titulo: 'Depoimentos',
        local: 'Menu → Depoimentos',
        descricao: 'Gerencie os depoimentos enviados pelos clientes. Aprove os que devem aparecer no site e rejeite os inadequados. Clientes enviam via Canal DeMattos.',
        dicas: ['Apenas depoimentos aprovados aparecem no site', 'Clientes precisam enviar para aprovação antes que você veja', 'Use a avaliação por estrelas como critério de aprovação'],
      },
    ],
  },
  {
    categoria: 'IA & Automações',
    cor: 'text-cyan-400',
    bg: 'bg-cyan-500/10 border-cyan-500/20',
    items: [
      {
        icon: Bot,
        cor: 'text-cyan-400',
        titulo: 'Assistente IA',
        local: 'Menu → Assistente IA',
        descricao: 'Configure o assistente virtual de voz da barbearia. Ajuste o tipo de voz (feminina/masculina), velocidade de fala, tom, volume e ative ou desative o áudio nas respostas.',
        dicas: ['Velocidade recomendada: entre 1.0 e 1.3 para soar natural', 'Teste a voz clicando no botão de prévia', 'Desative o áudio se preferir somente texto nas respostas'],
      },
      {
        icon: Plug,
        cor: 'text-violet-400',
        titulo: 'Webhook N8N',
        local: 'Menu → Webhook N8N',
        descricao: 'Configure a integração com o n8n para automações de WhatsApp. Cole a URL do seu webhook do n8n e teste a conexão antes de ativar em produção.',
        dicas: ['Teste sempre a conexão antes de ativar em produção', 'O n8n pode receber eventos de novos agendamentos automaticamente', 'Configure o webhook no n8n para responder em formato JSON'],
      },
    ],
  },
  {
    categoria: 'Configurações Gerais',
    cor: 'text-gray-400',
    bg: 'bg-gray-500/10 border-gray-500/20',
    items: [
      {
        icon: Settings,
        cor: 'text-gray-400',
        titulo: 'Configurações',
        local: 'Menu → Configurações',
        descricao: 'Edite as informações básicas exibidas no site: endereço completo, telefone de contato (WhatsApp), horário de funcionamento e quaisquer outros dados institucionais.',
        dicas: ['O telefone é usado no botão de WhatsApp do site', 'O endereço aparece na seção de contato da página inicial', 'Alterações são refletidas no site imediatamente após salvar'],
      },
    ],
  },
];

export default function AdminHelpModal() {
  const [open, setOpen] = useState(false);
  const [expandido, setExpandido] = useState(null);

  const toggle = (key) => setExpandido(expandido === key ? null : key);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 text-sm touch-manipulation min-h-[44px] gap-2"
      >
        <HelpCircle className="w-4 h-4" />
        <span className="hidden sm:inline">Ajuda</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[#111111] border-[#2a2a2a] text-white max-w-2xl max-h-[85vh] overflow-y-auto p-0">
          <DialogHeader className="p-6 pb-4 border-b border-[#2a2a2a] sticky top-0 bg-[#111111] z-10">
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-3" style={{ fontFamily: 'Georgia, serif' }}>
              <div className="w-9 h-9 bg-[#D4AF37]/20 rounded-lg flex items-center justify-center">
                <HelpCircle className="w-5 h-5 text-[#D4AF37]" />
              </div>
              Guia do Painel Administrativo
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-400 mt-1">
              Clique em qualquer seção para ver o guia detalhado de uso.
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 space-y-6">
            {secoes.map((secao) => (
              <div key={secao.categoria}>
                <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 ${secao.cor}`}>
                  {secao.categoria}
                </h3>
                <div className="space-y-2">
                  {secao.items.map((item) => {
                    const key = item.titulo;
                    const isOpen = expandido === key;
                    return (
                      <div
                        key={key}
                        className={`border rounded-xl overflow-hidden transition-all duration-200 ${secao.bg}`}
                      >
                        <button
                          className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-colors"
                          onClick={() => toggle(key)}
                        >
                          <div className="flex items-center gap-3">
                            <item.icon className={`w-5 h-5 ${item.cor} flex-shrink-0`} />
                            <div>
                              <p className="text-white font-medium text-sm">{item.titulo}</p>
                              <p className="text-gray-500 text-xs">{item.local}</p>
                            </div>
                          </div>
                          {isOpen
                            ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                        </button>

                        {isOpen && (
                          <div className="px-4 pb-4 space-y-3 border-t border-white/5">
                            <p className="text-gray-300 text-sm leading-relaxed pt-3">
                              {item.descricao}
                            </p>
                            <div className="space-y-1.5">
                              <p className="text-xs font-semibold text-[#D4AF37] flex items-center gap-1">
                                <Zap className="w-3 h-3" /> Dicas rápidas:
                              </p>
                              {item.dicas.map((dica, i) => (
                                <div key={i} className="flex items-start gap-2">
                                  <span className="text-[#D4AF37] text-xs mt-0.5 flex-shrink-0">•</span>
                                  <p className="text-gray-400 text-xs leading-relaxed">{dica}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}