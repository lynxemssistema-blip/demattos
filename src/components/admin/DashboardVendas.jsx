import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, DollarSign, ShoppingCart, Package, Loader2 } from 'lucide-react';

export default function DashboardVendas() {
  const { data: stripeData, isLoading, error } = useQuery({
    queryKey: ['stripe-dashboard'],
    queryFn: async () => {
      try {
        const response = await base44.functions.invoke('getStripeDashboardData', {});
        return response.data;
      } catch (err) {
        return null;
      }
    },
    refetchInterval: 60000, // Atualizar a cada minuto
    retry: 1,
    enabled: true,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
      </div>
    );
  }

  if (!stripeData) {
    return (
      <Card className="bg-yellow-500/10 border-yellow-500/30">
        <CardContent className="py-8 text-center">
          <p className="text-yellow-500">Erro ao conectar com Stripe</p>
          <p className="text-gray-400 text-sm mt-2">Verifique se as credenciais estão corretas</p>
        </CardContent>
      </Card>
    );
  }

  const stats = {
    volumeBrutoMes: stripeData.volumeBrutoMes || 0,
    volumeBrutoTotal: stripeData.volumeBrutoTotal || 0,
    quantidadeVendasMes: stripeData.quantidadeVendasMes || 0,
    quantidadeVendasTotal: stripeData.quantidadeVendasTotal || 0,
    valorPendente: stripeData.valorPendente || 0,
    comprasPendentesQtd: stripeData.comprasPendentesQtd || 0,
    ultimos7Dias: stripeData.ultimos7Dias || [],
    balance: stripeData.balance || { available: 0, pending: 0 }
  };

  const maxValorGrafico = stats.ultimos7Dias.length > 0 
    ? Math.max(...stats.ultimos7Dias.map(d => d?.total || 0), 1)
    : 1;

  return (
    <div className="space-y-6">
      {/* Período */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Hoje</h2>
          <p className="text-gray-400 text-sm">Últimos 7 dias</p>
        </div>
      </div>

      {/* Cards principais */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Volume bruto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white mb-1">
              R$ {stats.volumeBrutoMes.toFixed(2)}
            </div>
            <p className="text-xs text-gray-500">R$ {stats.volumeBrutoTotal.toFixed(2)} total</p>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Saldo em BRL</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white mb-1">
              R$ {stats.balance.available.toFixed(2)}
            </div>
            <p className="text-xs text-gray-500">
              <span className="text-yellow-500">R$ {stats.balance.pending.toFixed(2)}</span> pendente
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Pagamentos pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-500 mb-1">
              R$ {stats.valorPendente.toFixed(2)}
            </div>
            <p className="text-xs text-gray-500">{stats.comprasPendentesQtd} compras aguardando</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de vendas */}
      <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">Pagamentos</CardTitle>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-400">
                Volume líquido: <span className="text-white font-semibold">R$ {stats.volumeBrutoMes.toFixed(2)}</span>
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-end gap-3">
            {stats.ultimos7Dias.length === 0 ? (
              <div className="w-full flex items-center justify-center h-full">
                <p className="text-gray-500 text-sm">Nenhuma venda nos últimos 7 dias</p>
              </div>
            ) : (
              stats.ultimos7Dias.map((dia, idx) => {
                const altura = dia?.total && maxValorGrafico > 0 ? (dia.total / maxValorGrafico) * 100 : 0;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center">
                    <div className="w-full bg-[#0a0a0a] rounded-t relative" style={{ height: '200px' }}>
                      {dia?.total > 0 && (
                        <div
                          className="absolute bottom-0 w-full bg-[#D4AF37] rounded-t hover:bg-[#B8973D] transition-all cursor-pointer"
                          style={{ height: `${altura}%` }}
                          title={`R$ ${dia.total.toFixed(2)}`}
                        />
                      )}
                    </div>
                    <span className="text-xs text-gray-500 mt-2">
                      {dia?.dia || 0}/{dia?.mes || 0}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Métricas adicionais */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Total de Vendas</p>
                <p className="text-xl font-bold text-white">{stats.quantidadeVendasTotal}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Vendas este Mês</p>
                <p className="text-xl font-bold text-white">{stats.quantidadeVendasMes}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-500/10 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Ticket Médio</p>
                <p className="text-xl font-bold text-white">
                  R$ {stats.quantidadeVendasTotal > 0 ? (stats.volumeBrutoTotal / stats.quantidadeVendasTotal).toFixed(2) : '0.00'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Receita Total</p>
                <p className="text-xl font-bold text-white">R$ {stats.volumeBrutoTotal.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}