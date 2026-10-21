import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Trash2, Plus, Minus, ArrowLeft, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import PrivateRoute from '@/components/auth/PrivateRoute';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { safeStorage } from '@/lib/SafariCompat';

function CarrinhoContent() {
  const [user, setUser] = useState(null);
  const [carrinhoTemp, setCarrinhoTemp] = useState([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    loadUser();
    carregarCarrinhoLocal();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch {
      // Usuário não autenticado - continua com carrinho local
      setUser(null);
    }
  };

  const carregarCarrinhoLocal = () => {
    try {
      const carrinho = JSON.parse(safeStorage.getItem('carrinho_temp') || '[]');
      setCarrinhoTemp(carrinho);
    } catch {
      setCarrinhoTemp([]);
    }
  };

  const { data: carrinhoItems = [], isLoading } = useQuery({
    queryKey: ['carrinho', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const response = await base44.functions.invoke('getCarrinhoCliente', {
        cliente_email: user.email
      });
      return response.data.success ? response.data.items : [];
    },
    enabled: !!user?.email,
  });

  const items = user ? carrinhoItems : carrinhoTemp;

  const deleteMutation = useMutation({
    mutationFn: async (itemId) => {
      if (user) {
        await base44.entities.ItemCarrinho.delete(itemId);
      }
    },
    onMutate: async (itemId) => {
      // Cancelar queries em voo
      await queryClient.cancelQueries({ queryKey: ['carrinho', user?.email] });
      
      // Snapshot do estado anterior
      const previousData = queryClient.getQueryData(['carrinho', user?.email]);
      
      // Atualizar otimista
      if (previousData) {
        queryClient.setQueryData(['carrinho', user?.email], 
          previousData.filter(item => item.id !== itemId)
        );
      }
      
      return { previousData };
    },
    onError: (err, itemId, context) => {
      // Restaurar em caso de erro
      if (context?.previousData) {
        queryClient.setQueryData(['carrinho', user?.email], context.previousData);
      }
      toast.error('Erro ao remover item');
    },
    onSuccess: () => {
      toast.success('Item removido do carrinho');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ itemId, quantidade }) => {
      if (user) {
        await base44.entities.ItemCarrinho.update(itemId, { quantidade });
      }
    },
    onMutate: async ({ itemId, quantidade }) => {
      // Cancelar queries em voo
      await queryClient.cancelQueries({ queryKey: ['carrinho', user?.email] });
      
      // Snapshot do estado anterior
      const previousData = queryClient.getQueryData(['carrinho', user?.email]);
      
      // Atualizar otimista
      if (previousData) {
        queryClient.setQueryData(['carrinho', user?.email],
          previousData.map(item =>
            item.id === itemId ? { ...item, quantidade } : item
          )
        );
      }
      
      return { previousData };
    },
    onError: (err, { itemId, quantidade }, context) => {
      // Restaurar em caso de erro
      if (context?.previousData) {
        queryClient.setQueryData(['carrinho', user?.email], context.previousData);
      }
      toast.error('Erro ao atualizar quantidade');
    }
  });

  const handleRemover = (itemIndex) => {
    if (user) {
      deleteMutation.mutate(items[itemIndex].id);
    } else {
      const novoCarrinho = carrinhoTemp.filter((_, idx) => idx !== itemIndex);
      setCarrinhoTemp(novoCarrinho);
      safeStorage.setItem('carrinho_temp', JSON.stringify(novoCarrinho));
      toast.success('Item removido do carrinho');
    }
  };

  const handleAumentarQuantidade = (itemIndex) => {
    if (user) {
      updateMutation.mutate({ itemId: items[itemIndex].id, quantidade: items[itemIndex].quantidade + 1 });
    } else {
      const novoCarrinho = [...carrinhoTemp];
      novoCarrinho[itemIndex].quantidade += 1;
      setCarrinhoTemp(novoCarrinho);
      safeStorage.setItem('carrinho_temp', JSON.stringify(novoCarrinho));
    }
  };

  const handleDiminuirQuantidade = (itemIndex) => {
    if (user) {
      if (items[itemIndex].quantidade > 1) {
        updateMutation.mutate({ itemId: items[itemIndex].id, quantidade: items[itemIndex].quantidade - 1 });
      }
    } else {
      if (carrinhoTemp[itemIndex].quantidade > 1) {
        const novoCarrinho = [...carrinhoTemp];
        novoCarrinho[itemIndex].quantidade -= 1;
        setCarrinhoTemp(novoCarrinho);
        safeStorage.setItem('carrinho_temp', JSON.stringify(novoCarrinho));
      }
    }
  };

  const handleCheckout = async () => {
    try {
      if (!user) {
        // Redireciona para login/cadastro com carrinho temporário
        window.location.href = '/login';
        return;
      }

      const response = await base44.functions.invoke('createStripeCheckout', {
        cliente_email: user.email,
        items: carrinhoItems
      });

      if (response.data.success && response.data.checkout_url) {
        window.location.href = response.data.checkout_url;
      } else {
        toast.error('Erro ao processar pagamento');
      }
    } catch (error) {
      toast.error('Erro ao processar pagamento');
    }
  };

  const totalItems = items.reduce((acc, item) => acc + item.quantidade, 0);
  const totalPreco = items.reduce((acc, item) => acc + (item.item_preco * item.quantidade), 0);

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24" style={{ paddingBottom: 'calc(100px + env(safe-area-inset-bottom, 16px))' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <Link to={createPageUrl('Home')} className="inline-flex items-center gap-2 text-[#D4AF37] hover:text-[#D4AF37]/80 mb-6">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>
          <h1 className="text-4xl font-bold text-white flex items-center gap-3" style={{ fontFamily: 'Georgia, serif' }}>
            <ShoppingCart className="w-8 h-8 text-[#D4AF37]" />
            Meu Carrinho
          </h1>
        </motion.div>

        {isLoading && user ? (
          <div className="text-center text-gray-400 py-12">
            Carregando carrinho...
          </div>
        ) : items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center py-16"
          >
            <ShoppingCart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg mb-8">Seu carrinho está vazio</p>
            <Link to={createPageUrl('Catalogo')}>
              <Button className="bg-[#D4AF37] hover:bg-[#B8973D] text-black font-semibold px-8">
                Continuar Comprando
              </Button>
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Items */}
            <div className="lg:col-span-2">
              <div className="space-y-4">
                {items.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 hover:border-[#D4AF37]/30 transition-all"
                  >
                    <div className="flex gap-4">
                      {/* Content */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-lg font-semibold text-white">
                              {item.item_nome}
                            </h3>
                            {item.item_tipo === 'servico' && (
                              <p className="text-sm text-gray-400">Serviço</p>
                            )}
                            {item.produto_tipo === 'digital' && (
                              <p className="text-sm text-blue-400">Produto Digital</p>
                            )}
                          </div>
                          <p className="text-[#D4AF37] font-semibold text-lg">
                            R$ {(item.item_preco * item.quantidade).toFixed(2)}
                          </p>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-3 mt-4">
                          <span className="text-gray-400 text-sm">Quantidade:</span>
                          <div className="flex items-center border border-[#2a2a2a] rounded-lg">
                            <button
                              onClick={() => handleDiminuirQuantidade(index)}
                              className="p-1 hover:bg-[#2a2a2a] transition-colors touch-manipulation"
                            >
                              <Minus className="w-4 h-4 text-gray-400" />
                            </button>
                            <span className="px-3 text-white text-sm font-medium">
                              {item.quantidade}
                            </span>
                            <button
                              onClick={() => handleAumentarQuantidade(index)}
                              className="p-1 hover:bg-[#2a2a2a] transition-colors touch-manipulation"
                            >
                              <Plus className="w-4 h-4 text-gray-400" />
                            </button>
                          </div>
                          <span className="text-gray-400 text-sm ml-auto">
                            R$ {item.item_preco.toFixed(2)} por unidade
                          </span>
                        </div>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => handleRemover(index)}
                        className="text-gray-500 hover:text-red-400 transition-colors p-2 touch-manipulation"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Resumo */}
            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 lg:sticky lg:top-24"
              >
                <h3 className="text-lg font-semibold text-white mb-6">Resumo</h3>

                <div className="space-y-4 mb-6 pb-6 border-b border-[#2a2a2a]">
                  <div className="flex justify-between text-gray-400">
                    <span>Total de itens:</span>
                    <span className="text-white font-medium">{totalItems}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Subtotal:</span>
                    <span className="text-white font-medium">R$ {totalPreco.toFixed(2)}</span>
                  </div>
                  {/* Frete */}
                  <div className="flex justify-between text-gray-400">
                    <span>Frete:</span>
                    <span className="text-green-400 font-medium">Grátis</span>
                  </div>
                </div>

                <div className="flex justify-between mb-6">
                  <span className="text-lg font-semibold text-white">Total:</span>
                  <span className="text-2xl font-bold text-[#D4AF37]">
                    R$ {totalPreco.toFixed(2)}
                  </span>
                </div>

                <Button
                  onClick={handleCheckout}
                  className="w-full bg-[#D4AF37] hover:bg-[#B8973D] text-black font-semibold py-3 flex items-center justify-center gap-2 mb-3"
                >
                  <Lock className="w-4 h-4" />
                  {user ? 'Ir para Pagamento' : 'Fazer Login e Pagar'}
                </Button>

                <Link to={createPageUrl('Catalogo')} className="block">
                  <Button
                    variant="outline"
                    className="w-full border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10"
                  >
                    Continuar Comprando
                  </Button>
                </Link>

                <p className="text-xs text-gray-500 mt-4 text-center">
                  Produtos físicos: retirada no local
                  <br />
                  Produtos digitais: download imediato
                </p>
              </motion.div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Carrinho() {
  return (
    <PrivateRoute>
      <CarrinhoContent />
    </PrivateRoute>
  );
}