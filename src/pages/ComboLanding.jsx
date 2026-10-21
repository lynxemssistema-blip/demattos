import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { ShoppingCart, Package, ArrowLeft, Loader2, Mail, Tag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function ComboLanding() {
  const [combo, setCombo] = useState(null);
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [comprando, setComprando] = useState(false);
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [emailVisitante, setEmailVisitante] = useState('');
  const [mostrarCampoEmail, setMostrarCampoEmail] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const comboId = urlParams.get('id');

  useEffect(() => {
    const init = async () => {
      try {
        const user = await base44.auth.me();
        setUsuarioLogado(user);
      } catch (e) { /* não logado */ }

      if (!comboId) { setLoading(false); return; }

      try {
        const [combosRes, produtosRes] = await Promise.all([
          base44.entities.Combo.filter({ ativo: true }),
          base44.entities.Produto.filter({ ativo: true, tipo: 'digital' })
        ]);
        const found = combosRes.find(c => c.id === comboId);
        setCombo(found || null);
        setProdutos(produtosRes);
      } catch (e) {
        setCombo(null);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [comboId]);

  const handleComprar = async () => {
    if (!usuarioLogado) {
      if (!mostrarCampoEmail) { setMostrarCampoEmail(true); return; }
      if (!emailVisitante || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVisitante)) {
        toast.error('Por favor, informe um email válido para receber seus produtos');
        return;
      }
    }

    setComprando(true);
    try {
      const response = await base44.functions.invoke('createStripeCheckout', {
        cartItems: [{
          id: combo.id,
          tipo: 'combo',
          nome: combo.nome,
          preco: combo.preco,
          quantidade: 1
        }],
        email_visitante: !usuarioLogado ? emailVisitante : undefined,
        origem_link_direto: true
      });

      if (response.data.url) {
        window.location.href = response.data.url;
      } else {
        toast.error('Erro ao iniciar pagamento');
      }
    } catch (error) {
      toast.error('Erro ao processar compra: ' + (error.response?.data?.error || error.message));
    } finally {
      setComprando(false);
    }
  };

  const produtosDoCombo = (combo?.produtos_ids || [])
    .map(id => produtos.find(p => p.id === id))
    .filter(Boolean);

  const somaOriginal = produtosDoCombo.reduce((sum, p) => sum + (p.preco || 0), 0);
  const desconto = somaOriginal > 0 && combo ? Math.round((1 - combo.preco / somaOriginal) * 100) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
      </div>
    );
  }

  if (!combo) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-4">
        <Package className="w-16 h-16 text-gray-600" />
        <p className="text-white text-xl">Combo não encontrado</p>
        <Link to={createPageUrl('Home')}>
          <Button variant="outline" className="border-[#2a2a2a] text-gray-400">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao início
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="bg-[#111111] border-b border-[#2a2a2a]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <Link to={createPageUrl('Home')}>
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <span className="text-[#D4AF37] font-semibold" style={{ fontFamily: 'Georgia, serif' }}>
            Barbearia DeMattos
          </span>
        </div>
      </div>

      {/* Combo */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden">
          <div className="md:flex">
            {/* Imagem */}
            <div className="md:w-1/2">
              {combo.imagem_url ? (
                <img
                  src={combo.imagem_url}
                  alt={combo.nome}
                  className="w-full h-72 md:h-full object-contain bg-[#0a0a0a]"
                />
              ) : (
                <div className="w-full h-72 md:h-full min-h-[300px] bg-[#0a0a0a] flex items-center justify-center">
                  <Package className="w-24 h-24 text-[#D4AF37]/30" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="md:w-1/2 p-5 sm:p-8 flex flex-col justify-between">
              <div>
                <div className="flex gap-2 mb-4 flex-wrap">
                  <Badge className="bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/30">Combo</Badge>
                  {desconto > 0 && (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                      <Tag className="w-3 h-3 mr-1" />
                      {desconto}% OFF
                    </Badge>
                  )}
                </div>

                <h1 className="text-2xl md:text-3xl font-bold text-white mb-4" style={{ fontFamily: 'Georgia, serif' }}>
                  {combo.nome}
                </h1>

                {combo.descricao && (
                  <p className="text-gray-400 text-base leading-relaxed mb-6">
                    {combo.descricao}
                  </p>
                )}

                {/* Produtos incluídos */}
                {produtosDoCombo.length > 0 && (
                  <div className="mb-6">
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Incluído neste combo:</p>
                    <div className="flex flex-wrap gap-2">
                      {produtosDoCombo.map(p => (
                        <Badge key={p.id} className="bg-blue-500/10 text-blue-300 border-blue-500/20 text-xs">
                          📄 {p.nome}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-end gap-3">
                  <div className="text-4xl font-bold text-[#D4AF37]">
                    R$ {combo.preco.toFixed(2)}
                  </div>
                  {somaOriginal > combo.preco && (
                    <div className="text-gray-500 line-through text-lg mb-1">
                      R$ {somaOriginal.toFixed(2)}
                    </div>
                  )}
                </div>

                {/* Campo de email para visitantes */}
                {!usuarioLogado && mostrarCampoEmail && (
                  <div className="bg-[#0a0a0a] border border-[#D4AF37]/30 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2 text-[#D4AF37] text-sm font-medium">
                      <Mail className="w-4 h-4" />
                      Informe seu email para receber os PDFs
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
                      📧 Os links para download serão enviados para este email após o pagamento
                    </p>
                  </div>
                )}

                <Button
                  onClick={handleComprar}
                  disabled={comprando}
                  className="w-full bg-[#D4AF37] hover:bg-[#B8973D] text-black font-bold text-lg py-6"
                >
                  {comprando ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Processando...</>
                  ) : !usuarioLogado && !mostrarCampoEmail ? (
                    <><ShoppingCart className="w-5 h-5 mr-2" />Comprar Combo Agora</>
                  ) : (
                    <><ShoppingCart className="w-5 h-5 mr-2" />{!usuarioLogado ? 'Continuar para Pagamento' : 'Comprar Combo Agora'}</>
                  )}
                </Button>

                {!usuarioLogado && !mostrarCampoEmail && (
                  <p className="text-gray-500 text-sm text-center">
                    Informe seu email para receber os PDFs após o pagamento
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}