import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import AdminRoute from '@/components/auth/AdminRoute';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Search, Receipt, ExternalLink, ShoppingCart, Package, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function AdminTentativasCompraContent() {
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroOrigem, setFiltroOrigem] = useState('todos');
  const [detalheAberto, setDetalheAberto] = useState(null);

  // ✅ REFATORAÇÃO CRÍTICA #2: Eliminação de Polling Agressivo
  // Removido: refetchInterval: 30000 (causa rate limit 429)
  // Agora: Apenas refetchOnWindowFocus (padrão) + botão manual de atualização
  const { data: tentativas = [], isLoading, refetch } = useQuery({
    queryKey: ['tentativas-compra'],
    queryFn: () => base44.entities.TentativaCompra.list('-created_date', 200),
    // ✅ SEM refetchInterval: polling agressivo removido
    // staleTime: 5 minutos para evitar requisições desnecessárias
    staleTime: 5 * 60 * 1000
  });

  const filtradas = tentativas.filter(t => {
    const matchBusca = !busca ||
      t.cliente_email?.toLowerCase().includes(busca.toLowerCase()) ||
      t.stripe_session_id?.includes(busca) ||
      t.itens?.some(i => i.nome?.toLowerCase().includes(busca.toLowerCase()));
    const matchStatus = filtroStatus === 'todos' || t.status === filtroStatus;
    const matchOrigem = filtroOrigem === 'todos' || t.origem === filtroOrigem;
    return matchBusca && matchStatus && matchOrigem;
  });

  const totalConfirmado = tentativas
    .filter(t => t.status === 'confirmada')
    .reduce((sum, t) => sum + (t.valor_total || 0), 0);

  const statsStatus = {
    abertas: tentativas.filter(t => t.status === 'aberta').length,
    confirmadas: tentativas.filter(t => t.status === 'confirmada').length,
    total: tentativas.length
  };

  const statusConfig = {
    aberta: { label: 'Aberta', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Clock },
    confirmada: { label: 'Confirmada', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle },
    cancelada: { label: 'Cancelada', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle },
    expirada: { label: 'Expirada', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: XCircle }
  };

  const origemConfig = {
    link_direto: { label: 'Link Direto', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
    catalogo: { label: 'Catálogo', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    creditos: { label: 'Créditos IA', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="bg-[#111111] border-b border-[#2a2a2a]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Link to={createPageUrl('Admin')}>
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white shrink-0">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Tentativas de Compra</h1>
              <p className="text-gray-400 text-sm">Todas as sessões Stripe — abertas e confirmadas</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
            <CardContent className="p-4">
              <p className="text-gray-400 text-xs mb-1">Total Sessões</p>
              <p className="text-2xl font-bold text-white">{statsStatus.total}</p>
            </CardContent>
          </Card>
          <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
            <CardContent className="p-4">
              <p className="text-gray-400 text-xs mb-1">Em Aberto</p>
              <p className="text-2xl font-bold text-yellow-400">{statsStatus.abertas}</p>
            </CardContent>
          </Card>
          <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
            <CardContent className="p-4">
              <p className="text-gray-400 text-xs mb-1">Confirmadas</p>
              <p className="text-2xl font-bold text-green-400">{statsStatus.confirmadas}</p>
            </CardContent>
          </Card>
          <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
            <CardContent className="p-4">
              <p className="text-gray-400 text-xs mb-1">Receita Confirmada</p>
              <p className="text-2xl font-bold text-[#D4AF37]">R$ {totalConfirmado.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros + Botão Atualizar */}
         <div className="flex flex-col sm:flex-row gap-3">
           <div className="relative flex-1">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
             <Input
               value={busca}
               onChange={e => setBusca(e.target.value)}
               placeholder="Buscar por email, produto ou sessão..."
               className="bg-[#1a1a1a] border-[#2a2a2a] text-white pl-9"
             />
           </div>
           {/* ✅ REFATORAÇÃO: Botão manual para atualizar dados */}
           <Button
             onClick={() => refetch()}
             disabled={isLoading}
             variant="outline"
             className="border-[#2a2a2a] text-gray-400 hover:text-white hover:bg-[#1a1a1a] shrink-0"
             title="Atualizar dados manualmente"
           >
             {isLoading ? 'Atualizando...' : '🔄 Atualizar'}
           </Button>
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="bg-[#1a1a1a] border-[#2a2a2a] text-white w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a]">
              <SelectItem value="todos">Todos status</SelectItem>
              <SelectItem value="aberta">Abertas</SelectItem>
              <SelectItem value="confirmada">Confirmadas</SelectItem>
              <SelectItem value="cancelada">Canceladas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroOrigem} onValueChange={setFiltroOrigem}>
            <SelectTrigger className="bg-[#1a1a1a] border-[#2a2a2a] text-white w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a]">
              <SelectItem value="todos">Toda origem</SelectItem>
              <SelectItem value="link_direto">Link Direto</SelectItem>
              <SelectItem value="catalogo">Catálogo</SelectItem>
              <SelectItem value="creditos">Créditos IA</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Lista */}
        {isLoading ? (
          <div className="text-center py-16 text-gray-400">Carregando...</div>
        ) : filtradas.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>Nenhuma tentativa encontrada</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtradas.map(t => {
              const sc = statusConfig[t.status] || statusConfig.aberta;
              const oc = origemConfig[t.origem] || origemConfig.catalogo;
              const StatusIcon = sc.icon;
              return (
                <Card key={t.id} className="bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#D4AF37]/20 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <Badge className={`${sc.color} border text-xs gap-1`}>
                            <StatusIcon className="w-3 h-3" />
                            {sc.label}
                          </Badge>
                          <Badge className={`${oc.color} border text-xs`}>{oc.label}</Badge>
                          {t.recibo_url && (
                            <Badge className="bg-green-500/10 text-green-400 border-green-500/30 text-xs">
                              <Receipt className="w-3 h-3 mr-1" />
                              Recibo Disponível
                            </Badge>
                          )}
                        </div>
                        <p className="text-white font-medium text-sm truncate">{t.cliente_email}</p>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className="text-[#D4AF37] font-semibold text-sm">
                            R$ {(t.valor_total || 0).toFixed(2)}
                          </span>
                          <span className="text-gray-500 text-xs">
                            {t.itens?.length || 0} item(s):{' '}
                            {t.itens?.map(i => i.nome).join(', ').substring(0, 60)}
                            {(t.itens?.map(i => i.nome).join(', ').length || 0) > 60 ? '...' : ''}
                          </span>
                        </div>
                        <p className="text-gray-600 text-xs mt-1">
                          {t.created_date ? format(new Date(t.created_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : ''}
                          {' · '}
                          <span className="font-mono text-xs">{t.stripe_session_id?.substring(0, 20)}...</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {t.recibo_url && (
                          <a href={t.recibo_url} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="outline" className="border-green-500/30 text-green-400 hover:bg-green-500/10 gap-1.5">
                              <Receipt className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Recibo</span>
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          </a>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDetalheAberto(t)}
                          className="border-[#2a2a2a] text-gray-400 hover:text-white gap-1.5"
                        >
                          <Package className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Detalhes</span>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Detalhe */}
      <Dialog open={!!detalheAberto} onOpenChange={() => setDetalheAberto(null)}>
        <DialogContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#D4AF37] flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Detalhes da Tentativa
            </DialogTitle>
          </DialogHeader>
          {detalheAberto && (
            <div className="space-y-4 mt-2">
              {/* Info principal */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#0a0a0a] rounded-lg p-3">
                  <p className="text-gray-500 text-xs mb-1">Email</p>
                  <p className="text-white text-sm font-medium break-all">{detalheAberto.cliente_email}</p>
                </div>
                <div className="bg-[#0a0a0a] rounded-lg p-3">
                  <p className="text-gray-500 text-xs mb-1">Valor Total</p>
                  <p className="text-[#D4AF37] text-lg font-bold">R$ {(detalheAberto.valor_total || 0).toFixed(2)}</p>
                </div>
                <div className="bg-[#0a0a0a] rounded-lg p-3">
                  <p className="text-gray-500 text-xs mb-1">Status</p>
                  <p className="text-white text-sm capitalize">{detalheAberto.status}</p>
                </div>
                <div className="bg-[#0a0a0a] rounded-lg p-3">
                  <p className="text-gray-500 text-xs mb-1">Origem</p>
                  <p className="text-white text-sm capitalize">{detalheAberto.origem?.replace('_', ' ')}</p>
                </div>
              </div>

              {/* Itens */}
              {detalheAberto.itens?.length > 0 && (
                <div>
                  <p className="text-gray-400 text-sm font-medium mb-2">Itens no Checkout</p>
                  <div className="space-y-2">
                    {detalheAberto.itens.map((item, idx) => (
                      <div key={idx} className="bg-[#0a0a0a] rounded-lg p-3 flex items-center justify-between">
                        <div>
                          <p className="text-white text-sm">{item.nome}</p>
                          <p className="text-gray-500 text-xs capitalize">{item.tipo} · qtd {item.quantidade || 1}</p>
                        </div>
                        <p className="text-[#D4AF37] font-semibold text-sm">R$ {((item.preco || 0) * (item.quantidade || 1)).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* IDs Stripe */}
              <div>
                <p className="text-gray-400 text-sm font-medium mb-2">IDs Stripe</p>
                <div className="bg-[#0a0a0a] rounded-lg p-3 space-y-2">
                  <div>
                    <p className="text-gray-500 text-xs">Session ID</p>
                    <p className="text-white font-mono text-xs break-all">{detalheAberto.stripe_session_id}</p>
                  </div>
                  {detalheAberto.stripe_payment_intent_id && (
                    <div>
                      <p className="text-gray-500 text-xs">Payment Intent</p>
                      <p className="text-white font-mono text-xs break-all">{detalheAberto.stripe_payment_intent_id}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Recibo Stripe */}
              {detalheAberto.recibo_stripe && (
                <div>
                  <p className="text-gray-400 text-sm font-medium mb-2">Recibo Stripe</p>
                  <div className="bg-[#0a0a0a] rounded-lg p-3 space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-gray-500 text-xs">Valor Cobrado</p>
                        <p className="text-white">R$ {detalheAberto.recibo_stripe.amount?.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Status</p>
                        <p className="text-green-400 capitalize">{detalheAberto.recibo_stripe.status}</p>
                      </div>
                    </div>
                    {detalheAberto.recibo_stripe.charges?.map((charge, idx) => (
                      <div key={idx} className="border-t border-[#2a2a2a] pt-3">
                        <p className="text-gray-500 text-xs mb-2">Cobrança #{idx + 1}</p>
                        {charge.billing_details?.name && (
                          <p className="text-white text-sm">{charge.billing_details.name}</p>
                        )}
                        {charge.payment_method_details?.card && (
                          <p className="text-gray-400 text-xs">
                            {charge.payment_method_details.card.brand?.toUpperCase()} •••• {charge.payment_method_details.card.last4}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Botão recibo */}
              {detalheAberto.recibo_url && (
                <a href={detalheAberto.recibo_url} target="_blank" rel="noopener noreferrer">
                  <Button className="w-full bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 gap-2">
                    <Receipt className="w-4 h-4" />
                    Abrir Recibo Oficial Stripe
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </a>
              )}

              <p className="text-gray-600 text-xs text-center">
                Registrado em {detalheAberto.created_date ? format(new Date(detalheAberto.created_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '—'}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminTentativasCompra() {
  return (
    <AdminRoute>
      <AdminTentativasCompraContent />
    </AdminRoute>
  );
}