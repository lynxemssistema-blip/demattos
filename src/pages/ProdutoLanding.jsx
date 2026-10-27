import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { ShoppingCart, FileText, Package, Award, ArrowLeft, Loader2, Mail, ChevronDown, ChevronUp, Download, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

function formatDescricao(texto) {
  if (!texto) return [];
  // Divide por dupla quebra de linha ou por frases longas
  const paragrafos = texto
    .split(/\n\n|\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0);
  return paragrafos;
}

export default function ProdutoLanding() {
  const [produto, setProduto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comprando, setComprando] = useState(false);
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [emailVisitante, setEmailVisitante] = useState('');
  const [mostrarCampoEmail, setMostrarCampoEmail] = useState(false);
  const [descricaoExpandida, setDescricaoExpandida] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const produtoId = urlParams.get('id');

  useEffect(() => {
    const init = async () => {
      try {
        const user = await base44.auth.me();
        setUsuarioLogado(user);
      } catch (e) {}

      if (!produtoId) { setLoading(false); return; }

      try {
        const response = await base44.functions.invoke('getProdutoPublico', { id: produtoId });
        setProduto(response.data.success ? response.data.produto : null);
      } catch (e) {
        setProduto(null);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [produtoId]);

  const handleComprar = async () => {
    if (!usuarioLogado) {
      if (!mostrarCampoEmail) { setMostrarCampoEmail(true); return; }
      if (!emailVisitante || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVisitante)) {
        toast.error('Por favor, informe um email válido para receber seu produto');
        return;
      }
    }

    setComprando(true);
    try {
      const response = await base44.functions.invoke('createStripeCheckout', {
        cartItems: [{ id: produto.id, tipo: 'produto', nome: produto.nome, preco: produto.preco, quantidade: 1, produto_tipo: produto.tipo, arquivo_pdf_url: produto.arquivo_pdf_url }],
        email_visitante: !usuarioLogado ? emailVisitante : undefined,
        origem_link_direto: true
      });
      if (response.data.url) {
        window.location.href = response.data.url;
      } else {
        toast.error('Erro ao iniciar pagamento');
      }
    } catch (error) {
      if (error.response?.data?.requiresChannel) {
        toast.error('Você precisa ter um Canal DeMattos para comprar produtos digitais');
        setTimeout(() => { window.location.href = createPageUrl('CanalCliente'); }, 2000);
      } else {
        toast.error('Erro ao processar compra: ' + (error.response?.data?.error || error.message));
      }
    } finally {
      setComprando(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
        {/* Header skeleton */}
        <div className="bg-[#111111] border-b border-[#2a2a2a] shrink-0">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-[#1a1a1a] animate-pulse" />
            <div className="w-32 h-4 rounded bg-[#1a1a1a] animate-pulse" />
          </div>
        </div>

        {/* Image skeleton */}
        <div className="w-full bg-[#111111] animate-pulse" style={{ height: '45vh', maxHeight: 480 }} />

        {/* Content skeleton */}
        <div className="max-w-2xl w-full mx-auto px-5 pt-6 space-y-4">
          <div className="w-3/4 h-8 rounded bg-[#1a1a1a] animate-pulse" />
          <div className="w-1/3 h-4 rounded bg-[#1a1a1a] animate-pulse" />
          <div className="space-y-2 pt-2">
            <div className="w-full h-4 rounded bg-[#1a1a1a] animate-pulse" />
            <div className="w-full h-4 rounded bg-[#1a1a1a] animate-pulse" />
            <div className="w-2/3 h-4 rounded bg-[#1a1a1a] animate-pulse" />
          </div>
          <div className="pt-4 border-t border-[#2a2a2a]">
            <div className="w-1/3 h-10 rounded bg-[#1a1a1a] animate-pulse mb-4" />
            <div className="w-full h-14 rounded-xl bg-[#1a1a1a] animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!produto) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-4">
        <Package className="w-16 h-16 text-gray-600" />
        <p className="text-white text-xl">Produto não encontrado</p>
        <Link to={createPageUrl('Home')}>
          <Button variant="outline" className="border-[#2a2a2a] text-gray-400">
            <ArrowLeft className="w-4 h-4 mr-2" />Voltar ao início
          </Button>
        </Link>
      </div>
    );
  }

  const paragrafos = formatDescricao(produto.descricao);
  const PREVIEW_PARAGRAFOS = 2;
  const temMais = paragrafos.length > PREVIEW_PARAGRAFOS;
  const paragrafosVisiveis = descricaoExpandida ? paragrafos : paragrafos.slice(0, PREVIEW_PARAGRAFOS);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">

      {/* Header */}
      <div className="bg-[#111111] border-b border-[#2a2a2a] shrink-0">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to={createPageUrl('Home')}>
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <span className="text-[#D4AF37] font-semibold text-sm" style={{ fontFamily: 'Georgia, serif' }}>
            Barbearia DeMattos
          </span>
        </div>
      </div>

      {/* Imagem Hero — ocupa até 45vh */}
      <div className="w-full shrink-0" style={{ height: '45vh', maxHeight: 480 }}>
        {produto.imagem_url ? (
          <div className="relative w-full h-full overflow-hidden">
            <img
              src={produto.imagem_url}
              alt={produto.nome}
              className="w-full h-full object-cover"
            />
            {/* Gradient inferior para transição suave */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/20 to-transparent" />
            {/* Badges sobre imagem */}
            <div className="absolute top-4 left-4 flex flex-col gap-2">
              {produto.tipo === 'digital' && (
                <span className="bg-[#D4AF37] text-black text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5" /> DOWNLOAD DIGITAL
                </span>
              )}
              {produto.tipo === 'fisico' && (
                <span className="bg-white text-black text-xs font-bold px-3 py-1.5 rounded-full">PRODUTO FÍSICO</span>
              )}
              {produto.creditos_ia > 0 && (
                <span className="bg-purple-600 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5" /> +{produto.creditos_ia} CRÉDITOS IA
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] flex items-center justify-center">
            {produto.tipo === 'digital'
              ? <FileText className="w-24 h-24 text-[#D4AF37]/20" />
              : <Package className="w-24 h-24 text-[#D4AF37]/20" />}
          </div>
        )}
      </div>

      {/* Conteúdo — scroll natural abaixo da imagem */}
      <div className="flex-1 max-w-2xl w-full mx-auto px-5 pb-10 pt-6">

        {/* Título */}
        <h1
          className="text-2xl sm:text-3xl font-bold text-white mb-3 leading-tight"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          {produto.nome}
        </h1>

        {/* Stars decorativas */}
        <div className="flex items-center gap-1 mb-5">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="w-4 h-4 fill-[#D4AF37] text-[#D4AF37]" />
          ))}
          <span className="text-gray-500 text-xs ml-2">Produto premium DeMattos</span>
        </div>

        {/* Descrição formatada como artigo */}
        {paragrafos.length > 0 && (
          <div className="mb-6">
            <div className="space-y-4">
              {paragrafosVisiveis.map((p, i) => {
                // Primeiro parágrafo: destaque maior (lead)
                if (i === 0) {
                  return (
                    <p key={i} className="text-base sm:text-lg text-gray-200 leading-relaxed font-medium border-l-2 border-[#D4AF37] pl-4">
                      {p}
                    </p>
                  );
                }
                return (
                  <p key={i} className="text-sm sm:text-base text-gray-400 leading-relaxed">
                    {p}
                  </p>
                );
              })}
            </div>

            {/* Ler mais / menos */}
            {temMais && (
              <button
                onClick={() => setDescricaoExpandida(!descricaoExpandida)}
                className="mt-4 flex items-center gap-1.5 text-[#D4AF37] text-sm font-medium hover:underline focus:outline-none"
              >
                {descricaoExpandida ? (
                  <><ChevronUp className="w-4 h-4" /> Ler menos</>
                ) : (
                  <><ChevronDown className="w-4 h-4" /> Ler mais</>
                )}
              </button>
            )}
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-[#2a2a2a] mb-6" />

        {/* Prévia gratuita */}
        {produto.arquivo_previa_url && (
          <a
            href={produto.arquivo_previa_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-[#D4AF37] hover:underline mb-5"
          >
            <FileText className="w-4 h-4" />
            Ver prévia gratuita antes de comprar
          </a>
        )}

        {/* Estoque esgotado */}
        {produto.tipo === 'fisico' && produto.estoque === 0 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
            <span className="text-red-400 text-sm font-medium">Produto fora de estoque</span>
          </div>
        )}

        {/* Preço */}
        <div className="flex items-baseline gap-2 mb-5">
          <span className="text-4xl font-bold text-[#D4AF37]">
            R$ {produto.preco.toFixed(2)}
          </span>
          {produto.tipo === 'digital' && (
            <span className="text-gray-500 text-sm">· entrega imediata por email</span>
          )}
        </div>

        {/* Email para visitante */}
        {!usuarioLogado && mostrarCampoEmail && (
          <div className="bg-[#111111] border border-[#D4AF37]/30 rounded-xl p-4 space-y-3 mb-4">
            <div className="flex items-center gap-2 text-[#D4AF37] text-sm font-medium">
              <Mail className="w-4 h-4" />
              Informe seu email para receber o PDF
            </div>
            <Input
              type="email"
              placeholder="seu@email.com"
              value={emailVisitante}
              onChange={e => setEmailVisitante(e.target.value)}
              className="bg-[#1a1a1a] border-[#3a3a3a] text-white placeholder:text-gray-600"
              onKeyDown={e => e.key === 'Enter' && handleComprar()}
            />
            <p className="text-gray-500 text-xs">
              📧 O link para download será enviado para este email após o pagamento
            </p>
          </div>
        )}

        {/* CTA */}
        <Button
          onClick={handleComprar}
          disabled={comprando || (produto.tipo === 'fisico' && produto.estoque === 0)}
          className="w-full bg-[#D4AF37] hover:bg-[#B8973D] text-black font-bold text-base py-6 rounded-xl shadow-lg shadow-[#D4AF37]/10 disabled:opacity-50"
        >
          {comprando ? (
            <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Processando...</>
          ) : !usuarioLogado && !mostrarCampoEmail ? (
            <><ShoppingCart className="w-5 h-5 mr-2" />Comprar Agora</>
          ) : (
            <><ShoppingCart className="w-5 h-5 mr-2" />{!usuarioLogado ? 'Continuar para Pagamento' : 'Comprar Agora'}</>
          )}
        </Button>

        {!usuarioLogado && !mostrarCampoEmail && (
          <p className="text-gray-600 text-xs text-center mt-3">
            Será solicitado seu email na próxima etapa
          </p>
        )}
      </div>
    </div>
  );
}