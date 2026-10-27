import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Coins, Sparkles, Zap, Crown, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export default function ComprarCreditos({ open, onOpenChange }) {
  const [loading, setLoading] = useState(false);

  const { data: pacotes = [], isLoading } = useQuery({
    queryKey: ['pacotes-credito-publicos'],
    queryFn: async () => {
      const response = await base44.functions.invoke('getPacotesCreditoPublicos', {});
      return response.data.success ? response.data.pacotes : [];
    },
    enabled: open,
  });

  const handleComprar = async (pacote) => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('createStripeCheckout', {
        pacote_id: pacote.id,
      });

      if (response.data.success && response.data.checkout_url) {
        // Redirecionar para o Stripe fora do iframe (top level)
        if (window.top) {
          window.top.location.href = response.data.checkout_url;
        } else {
          window.location.href = response.data.checkout_url;
        }
      } else {
        toast.error('Erro ao criar sessão de pagamento');
      }
    } catch (error) {
      toast.error('Erro ao processar compra. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const getIconForPackage = (index) => {
    const icons = [Coins, Sparkles, Zap, Crown];
    return icons[index % icons.length];
  };

  const pacotesOrdenados = [...pacotes].sort((a, b) => a.preco_reais - b.preco_reais);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl flex items-center gap-2">
            <Coins className="w-5 h-5 sm:w-6 sm:h-6 text-[#D4AF37]" />
            Comprar Créditos IA
          </DialogTitle>
          <p className="text-xs sm:text-sm text-gray-400 mt-2">
            Escolha o pacote ideal para suas consultas com o DeMattos IA
          </p>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 text-center text-gray-400">Carregando pacotes...</div>
        ) : pacotesOrdenados.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            Nenhum pacote disponível no momento
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 py-4">
            {pacotesOrdenados.map((pacote, index) => {
              const Icon = getIconForPackage(index);
              const valorPorToken = (pacote.preco_reais / pacote.quantidade_tokens).toFixed(4);

              return (
                <Card
                  key={pacote.id}
                  className={`bg-[#0a0a0a] border-[#2a2a2a] hover:border-[#D4AF37]/50 transition-all ${
                    pacote.destaque ? 'ring-2 ring-[#D4AF37]' : ''
                  }`}
                >
                  <CardContent className="p-4 sm:p-6">
                    {pacote.destaque && (
                      <Badge className="mb-3 bg-[#D4AF37] text-black">
                        Mais Popular
                      </Badge>
                    )}
                    
                    <div className="flex items-center gap-2 sm:gap-3 mb-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#D4AF37]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-[#D4AF37]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-white font-semibold text-sm sm:text-base truncate">{pacote.nome}</h3>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="text-2xl sm:text-3xl font-bold text-white mb-1">
                        {pacote.quantidade_tokens}
                        <span className="text-sm sm:text-lg text-gray-400 ml-1">créditos</span>
                      </div>
                      <div className="text-xl sm:text-2xl text-[#D4AF37] font-semibold">
                        R$ {pacote.preco_reais.toFixed(2)}
                      </div>
                    </div>

                    {pacote.desconto_percentual > 0 && (
                      <Badge className="mb-3 bg-green-500/10 text-green-400 border-green-500/30">
                        {pacote.desconto_percentual}% de desconto
                      </Badge>
                    )}

                    <Button
                      onClick={() => handleComprar(pacote)}
                      disabled={loading}
                      className="w-full bg-[#D4AF37] hover:bg-[#B8973D] text-black font-semibold text-sm sm:text-base"
                    >
                      <span className="hidden sm:inline">{loading ? 'Processando...' : 'Comprar Agora'}</span>
                      <span className="sm:hidden">{loading ? 'Aguarde...' : 'Comprar'}</span>
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <div className="border-t border-[#2a2a2a] pt-4 mt-4">
          <p className="text-xs text-gray-500 text-center">
            Pagamento seguro via Stripe • Os créditos são adicionados automaticamente após a confirmação do pagamento
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}