import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  ArrowLeft, 
  ShoppingCart, 
  Package, 
  Scissors, 
  Search, 
  Filter,
  Plus,
  Minus,
  Trash2,
  FileText,
  Download,
  Award,
  Star,
  Zap,
  Eye
} from 'lucide-react';

export default function Catalogo() {
  const { user: usuarioLogado } = useAuth();
  const [busca, setBusca] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('todos');
  const [carrinho, setCarrinho] = useState([]);
  const [carrinhoOpen, setCarrinhoOpen] = useState(false);
  const [finalizandoCompra, setFinalizandoCompra] = useState(false);

  const { data: servicos = [] } = useQuery({
    queryKey: ['servicos-agendamento'],
    queryFn: async () => {
      try {
        const response = await base44.functions.invoke('getServicosPublicos', {});
        return response.data?.success ? response.data.servicos : [];
      } catch {
        return [];
      }
    },
    retry: 1,
    retryDelay: 1000,
    staleTime: 10 * 60 * 1000,
  });

  const { data: produtos = [] } = useQuery({
    queryKey: ['produtos-publicos'],
    queryFn: async () => {
      try {
        const response = await base44.functions.invoke('getProdutosPublicos', {});
        return response.data?.success ? response.data.produtos : [];
      } catch {
        return [];
      }
    },
    retry: 1,
    retryDelay: 1000,
    staleTime: 10 * 60 * 1000,
  });

  const { data: comprasUsuario = [] } = useQuery({
    queryKey: ['compras-usuario', usuarioLogado?.email],
    queryFn: async () => {
      if (!usuarioLogado?.email) return [];
      const response = await base44.functions.invoke('getMinhasCompras', { 
        email: usuarioLogado.email 
      });
      return response.data.success ? response.data.compras : [];
    },
    enabled: !!usuarioLogado,
    retry: 1,
    retryDelay: 1000,
  });

  const { data: carrinhoData, isLoading: carregandoCarrinho } = useQuery({
    queryKey: ['carrinho-catalogo', usuarioLogado?.email],
    queryFn: async () => {
      if (!usuarioLogado?.email) {
        const carrinhoLocal = localStorage.getItem('carrinho');
        return carrinhoLocal ? JSON.parse(carrinhoLocal) : [];
      }
      const response = await base44.functions.invoke('getCarrinhoCliente', {
        cliente_email: usuarioLogado.email
      });
      const itensCarrinho = response.data.success ? response.data.items : [];
      return itensCarrinho.map(item => ({
        id: item.item_id,
        tipo: item.item_tipo,
        nome: item.item_nome,
        preco: item.item_preco,
        quantidade: item.quantidade,
        produto_tipo: item.produto_tipo,
        arquivo_pdf_url: item.produto_arquivo_pdf_url
      }));
    },
    retry: 1,
    retryDelay: 1000,
    staleTime: 2 * 60 * 1000,
  });

  // Sincronizar carrinho do React Query com state local
  useEffect(() => {
    if (carrinhoData) {
      setCarrinho(carrinhoData);
    }
  }, [carrinhoData]);

  const sincronizarCarrinho = async (novoCarrinho) => {
    setCarrinho(novoCarrinho);
    
    if (usuarioLogado) {
      try {
        await base44.functions.invoke('sincronizarCarrinho', {
          cliente_email: usuarioLogado.email,
          carrinho: novoCarrinho
        });
      } catch (error) {
        toast.error('Erro ao salvar carrinho');
      }
    } else {
      // Salvar no localStorage para usuários não logados
      localStorage.setItem('carrinho', JSON.stringify(novoCarrinho));
    }
  };

  const itensFiltrados = useMemo(() => {
    const servicosMap = servicos.map(s => ({ ...s, tipo: 'servico' }));
    const produtosMap = produtos
      .filter(p => p._item_kind !== 'combo')
      .map(p => ({ ...p, produto_tipo: p.tipo, tipo: 'produto' }));
    const combosMap = produtos
      .filter(p => p._item_kind === 'combo')
      .map(p => ({ ...p, produto_tipo: 'digital', tipo: 'combo' }));

    let items = [...servicosMap, ...produtosMap, ...combosMap];

    if (tipoFiltro === 'servicos') {
      items = servicosMap;
    } else if (tipoFiltro === 'produtos') {
      items = [...produtosMap, ...combosMap];
    } else if (tipoFiltro === 'combos') {
      items = combosMap;
    }

    if (busca) {
      items = items.filter(item =>
        item.nome.toLowerCase().includes(busca.toLowerCase()) ||
        (item.descricao && item.descricao.toLowerCase().includes(busca.toLowerCase()))
      );
    }

    return items;
  }, [servicos, produtos, tipoFiltro, busca]);

  const adicionarAoCarrinho = (item) => {
    if ((item.tipo === 'produto' || item.tipo === 'combo') && usuarioLogado) {
      const jaComprou = comprasUsuario.some(compra =>
        compra.produto_id === item.id &&
        compra.status_pagamento === 'confirmado'
      );
      if (jaComprou) {
        toast.warning(`Você já comprou "${item.nome}". Tem certeza que deseja comprar novamente?`, { duration: 5000 });
      }
    }

    const jaExiste = carrinho.find(c => c.id === item.id && c.tipo === item.tipo);
    let novoCarrinho;
    if (jaExiste) {
      novoCarrinho = carrinho.map(c =>
        c.id === item.id && c.tipo === item.tipo ? { ...c, quantidade: c.quantidade + 1 } : c
      );
    } else {
      novoCarrinho = [...carrinho, { ...item, quantidade: 1 }];
    }

    sincronizarCarrinho(novoCarrinho);
    toast.success('Item adicionado ao carrinho');
  };

  const removerDoCarrinho = (itemId, tipo) => {
    const novoCarrinho = carrinho.filter(c => !(c.id === itemId && c.tipo === tipo));
    sincronizarCarrinho(novoCarrinho);
    toast.success('Item removido do carrinho');
  };

  const alterarQuantidade = (itemId, tipo, delta) => {
    const novoCarrinho = carrinho.map(c => {
      if (c.id === itemId && c.tipo === tipo) {
        const novaQtd = c.quantidade + delta;
        return novaQtd > 0 ? { ...c, quantidade: novaQtd } : c;
      }
      return c;
    }).filter(c => c.quantidade > 0);
    
    sincronizarCarrinho(novoCarrinho);
  };

  const totalCarrinho = carrinho.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);

  const handleFinalizarCompra = async () => {
    if (!usuarioLogado) {
      toast.error('Faça login para finalizar a compra');
      base44.auth.redirectToLogin(window.location.pathname);
      return;
    }

    // Verificar se há produtos digitais ou combos
    const temProdutoDigital = carrinho.some(item => (item.tipo === 'produto' && item.produto_tipo === 'digital') || item.tipo === 'combo');
    
    if (temProdutoDigital) {
      // Verificar se tem canal
      try {
        const response = await base44.functions.invoke('verificarClientePorTelefone', {
          telefone: usuarioLogado.email
        });
        const cliente = response.data.success ? response.data.cliente : null;
        if (!cliente || !cliente.tem_canal) {
          toast.error('Você precisa ter um Canal DeMattos para comprar produtos digitais');
          setTimeout(() => {
            window.location.href = createPageUrl('CanalCliente');
          }, 2000);
          return;
        }
      } catch (error) {
        toast.error('Erro ao verificar canal');
        return;
      }
    }

    setFinalizandoCompra(true);
    try {
      const response = await base44.functions.invoke('createStripeCheckout', {
        cartItems: carrinho
      });

      if (response.data.url) {
        window.location.href = response.data.url;
      } else {
        toast.error('Erro ao criar sessão de checkout');
      }
    } catch (error) {
      if (error.response?.data?.requiresChannel) {
        toast.error('Você precisa ter um Canal DeMattos para comprar produtos digitais');
        setTimeout(() => {
          window.location.href = createPageUrl('CanalCliente');
        }, 2000);
      } else {
        toast.error('Erro ao finalizar compra: ' + (error.response?.data?.error || error.message));
      }
    } finally {
      setFinalizandoCompra(false);
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="bg-[#111111] border-b border-[#2a2a2a] sticky top-0 z-40" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Link to={createPageUrl('Home')}>
                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white shrink-0">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-white">Catálogo</h1>
                <p className="text-gray-400 text-xs sm:text-sm">Produtos e Serviços</p>
              </div>
            </div>

            <Sheet open={carrinhoOpen} onOpenChange={setCarrinhoOpen}>
              <SheetTrigger asChild>
                <Button className="bg-[#D4AF37] hover:bg-[#B8973D] text-black relative shrink-0">
                  <ShoppingCart className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Carrinho</span>
                  {carrinho.length > 0 && (
                    <Badge className="absolute -top-2 -right-2 bg-red-500 h-5 w-5 flex items-center justify-center p-0">
                      {carrinho.length}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white w-full sm:max-w-lg" aria-describedby="carrinho-description">
                <SheetHeader>
                  <SheetTitle className="text-white">Carrinho de Compras</SheetTitle>
                  <p id="carrinho-description" className="sr-only">Visualize e gerencie os itens do seu carrinho</p>
                </SheetHeader>
                
                <div className="flex flex-col h-full py-6">
                  {carregandoCarrinho ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                      <ShoppingCart className="w-16 h-16 mb-4 opacity-20 animate-pulse" />
                      <p>Carregando carrinho...</p>
                    </div>
                  ) : carrinho.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                      <ShoppingCart className="w-16 h-16 mb-4 opacity-20" />
                      <p>Carrinho vazio</p>
                      {!usuarioLogado && (
                        <p className="text-xs mt-2 text-center">
                          Faça login para salvar seu carrinho
                        </p>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                        {carrinho.map((item) => (
                          <div key={`${item.tipo}-${item.id}`} className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h3 className="text-white font-semibold">{item.nome}</h3>
                                <p className="text-gray-400 text-xs">
                                  {item.tipo === 'servico' ? 'Serviço' : 'Produto'}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removerDoCarrinho(item.id, item.tipo)}
                                className="text-red-500 hover:text-red-600 h-8 w-8"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => alterarQuantidade(item.id, item.tipo, -1)}
                                  className="h-8 w-8 border-[#2a2a2a]"
                                >
                                  <Minus className="w-3 h-3" />
                                </Button>
                                <span className="text-white w-8 text-center">{item.quantidade}</span>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => alterarQuantidade(item.id, item.tipo, 1)}
                                  className="h-8 w-8 border-[#2a2a2a]"
                                >
                                  <Plus className="w-3 h-3" />
                                </Button>
                              </div>
                              <div className="text-[#D4AF37] font-semibold">
                                R$ {(item.preco * item.quantidade).toFixed(2)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="border-t border-[#2a2a2a] pt-4 space-y-4">
                        <div className="flex items-center justify-between text-lg">
                          <span className="text-white font-semibold">Total:</span>
                          <span className="text-[#D4AF37] font-bold">R$ {totalCarrinho.toFixed(2)}</span>
                        </div>
                        <Button 
                          onClick={handleFinalizarCompra}
                          disabled={finalizandoCompra}
                          className="w-full bg-[#D4AF37] hover:bg-[#B8973D] text-black font-semibold disabled:opacity-50"
                        >
                          {finalizandoCompra ? 'Processando...' : 'Finalizar Compra'}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar produtos ou serviços..."
              className="bg-[#1a1a1a] border-[#2a2a2a] text-white pl-10"
            />
          </div>
          <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
            <SelectTrigger className="bg-[#1a1a1a] border-[#2a2a2a] text-white w-full sm:w-48">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a]">
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="servicos">Serviços</SelectItem>
              <SelectItem value="produtos">Produtos</SelectItem>
              <SelectItem value="combos">Combos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Items Grid */}
        {itensFiltrados.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Package className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p>Nenhum item encontrado</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {itensFiltrados.map((item) => {
              const jaComprou = item.tipo === 'produto' && usuarioLogado && comprasUsuario.some(c => c.produto_id === item.id && c.status_pagamento === 'confirmado');
              const isCombo = item.tipo === 'combo';
              const isDigital = item.produto_tipo === 'digital' || isCombo;
              const isServico = item.tipo === 'servico';

              return (
                <div
                  key={`${item.tipo}-${item.id}`}
                  className="group relative bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden hover:border-[#D4AF37]/50 hover:shadow-[0_0_30px_rgba(212,175,55,0.08)] transition-all duration-400 flex flex-col"
                >
                  {/* Image / Visual Hero */}
                  {item.imagem_url ? (
                    <div className="relative w-full h-56 overflow-hidden bg-[#0a0a0a]">
                      <img
                        src={item.imagem_url}
                        alt={item.nome}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      {/* gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] via-transparent to-transparent" />
                      {/* Floating badges top-left */}
                      <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                        {isCombo && (
                          <span className="bg-[#D4AF37] text-black text-xs font-bold px-2.5 py-1 rounded-full">📦 COMBO</span>
                        )}
                        {!isCombo && isDigital && (
                          <span className="bg-blue-500 text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                            <Download className="w-3 h-3" /> DIGITAL
                          </span>
                        )}
                        {isServico && (
                          <span className="bg-purple-500 text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                            <Scissors className="w-3 h-3" /> SERVIÇO
                          </span>
                        )}
                        {!isCombo && !isDigital && !isServico && (
                          <span className="bg-[#D4AF37] text-black text-xs font-bold px-2.5 py-1 rounded-full">FÍSICO</span>
                        )}
                      </div>
                      {/* Credits badge top-right */}
                      {item.creditos_ia > 0 && (
                        <div className="absolute top-3 right-3">
                          <span className="bg-purple-600 text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                            <Award className="w-3 h-3" /> +{item.creditos_ia} IA
                          </span>
                        </div>
                      )}
                      {/* Already purchased ribbon */}
                      {jaComprou && (
                        <div className="absolute bottom-3 left-3 right-3">
                          <span className="w-full bg-green-500/90 text-white text-xs font-semibold px-3 py-1.5 rounded-full flex items-center justify-center gap-1">
                            ✓ Você já possui este produto
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="relative w-full h-40 bg-gradient-to-br from-[#D4AF37]/10 to-[#0a0a0a] flex items-center justify-center">
                      {isServico ? (
                        <Scissors className="w-16 h-16 text-[#D4AF37] opacity-60" />
                      ) : isDigital ? (
                        <FileText className="w-16 h-16 text-[#D4AF37] opacity-60" />
                      ) : (
                        <Package className="w-16 h-16 text-[#D4AF37] opacity-60" />
                      )}
                      <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                        {isCombo && <span className="bg-[#D4AF37] text-black text-xs font-bold px-2.5 py-1 rounded-full">📦 COMBO</span>}
                        {!isCombo && isDigital && <span className="bg-blue-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">DIGITAL</span>}
                        {isServico && <span className="bg-purple-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">SERVIÇO</span>}
                        {!isCombo && !isDigital && !isServico && <span className="bg-[#D4AF37] text-black text-xs font-bold px-2.5 py-1 rounded-full">FÍSICO</span>}
                      </div>
                      {item.creditos_ia > 0 && (
                        <div className="absolute top-3 right-3">
                          <span className="bg-purple-600 text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                            <Award className="w-3 h-3" /> +{item.creditos_ia} IA
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex flex-col flex-1 p-5">
                    <h3 className="text-lg font-bold text-white mb-2 leading-tight">{item.nome}</h3>

                    {item.descricao && (
                      <p className="text-gray-400 text-sm leading-relaxed mb-4">{item.descricao}</p>
                    )}

                    {/* Service duration hint */}
                    {isServico && item.duracao && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
                        <Zap className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span>Duração: {item.duracao} min</span>
                      </div>
                    )}

                    {/* Preview link for digital */}
                    {isDigital && item.arquivo_previa_url && (
                      <a
                        href={item.arquivo_previa_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-[#D4AF37] hover:underline mb-3"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Ver prévia gratuita
                      </a>
                    )}

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Price + CTA */}
                    <div className="pt-4 border-t border-[#2a2a2a] mt-2">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-2xl font-bold text-[#D4AF37]">
                            R$ {item.preco.toFixed(2)}
                          </div>
                          {isDigital && (
                            <div className="text-xs text-gray-500 mt-0.5">Download imediato</div>
                          )}
                        </div>
                        <Button
                          onClick={() => adicionarAoCarrinho(item)}
                          className="bg-[#D4AF37] hover:bg-[#B8973D] text-black font-bold px-5 shrink-0 shadow-md"
                        >
                          {isDigital || isCombo ? (
                            <><Download className="w-4 h-4 mr-1.5" /> Adquirir</>
                          ) : (
                            <><ShoppingCart className="w-4 h-4 mr-1.5" /> Comprar</>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Bottom glow line on hover */}
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>
              );
            })}
          </div>
        )}
        </div>
      </div>
    </ErrorBoundary>
  );
}