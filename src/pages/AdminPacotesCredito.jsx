import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import AdminRoute from '@/components/auth/AdminRoute';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Coins, Edit, Trash2, Star, RefreshCw, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

function AdminPacotesCreditoContent() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPacote, setEditingPacote] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    quantidade_tokens: '',
    preco_reais: '',
    stripe_price_id: '',
    desconto_percentual: 0,
    destaque: false,
    ativo: true,
  });

  const queryClient = useQueryClient();

  const { data: pacotes = [], isLoading } = useQuery({
    queryKey: ['pacotes-credito'],
    queryFn: async () => {
      const response = await base44.functions.invoke('getAdminPacotesCredito', {});
      return response.data.success ? response.data.pacotes : [];
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PacoteCredito.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pacotes-credito'] });
      setDialogOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PacoteCredito.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pacotes-credito'] });
      setDialogOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PacoteCredito.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pacotes-credito'] });
    },
  });

  const syncPackageMutation = useMutation({
    mutationFn: ({ pacoteId, action }) => 
      base44.functions.invoke('syncCreditPackageWithStripe', { pacoteId, action }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pacotes-credito'] });
    },
  });

  const syncAllPackagesMutation = useMutation({
    mutationFn: () => base44.functions.invoke('syncAllCreditPackagesWithStripe', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pacotes-credito'] });
      alert('Todos os pacotes foram sincronizados com o Stripe!');
    },
  });

  const resetForm = () => {
    setFormData({
      nome: '',
      quantidade_tokens: '',
      preco_reais: '',
      stripe_price_id: '',
      desconto_percentual: 0,
      destaque: false,
      ativo: true,
    });
    setEditingPacote(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      quantidade_tokens: parseFloat(formData.quantidade_tokens),
      preco_reais: parseFloat(formData.preco_reais),
      desconto_percentual: parseFloat(formData.desconto_percentual) || 0,
    };

    if (editingPacote) {
      // Atualizar pacote
      await updateMutation.mutateAsync({ id: editingPacote.id, data });
      // Sincronizar com Stripe
      try {
        await syncPackageMutation.mutateAsync({ 
          pacoteId: editingPacote.id, 
          action: 'update' 
        });
      } catch (error) {
        console.error('Erro ao sincronizar com Stripe:', error);
      }
    } else {
      // Criar pacote
      const result = await createMutation.mutateAsync(data);
      // Sincronizar com Stripe
      try {
        await syncPackageMutation.mutateAsync({ 
          pacoteId: result.id, 
          action: 'create' 
        });
      } catch (error) {
        console.error('Erro ao sincronizar com Stripe:', error);
      }
    }
  };

  const handleDelete = async (pacoteId) => {
    if (!confirm('Deseja realmente excluir este pacote?')) return;
    
    try {
      // Arquivar no Stripe primeiro
      await syncPackageMutation.mutateAsync({ pacoteId, action: 'delete' });
    } catch (error) {
      console.error('Erro ao arquivar no Stripe:', error);
    }
    // Deletar do banco
    await deleteMutation.mutateAsync(pacoteId);
  };

  const handleToggleActive = async (pacote) => {
    const novoStatus = !pacote.ativo;
    await updateMutation.mutateAsync({ 
      id: pacote.id, 
      data: { ativo: novoStatus } 
    });
    
    try {
      await syncPackageMutation.mutateAsync({ 
        pacoteId: pacote.id, 
        action: novoStatus ? 'activate' : 'deactivate' 
      });
    } catch (error) {
      console.error('Erro ao sincronizar status com Stripe:', error);
    }
  };

  const handleEdit = (pacote) => {
    setEditingPacote(pacote);
    setFormData({
      nome: pacote.nome,
      quantidade_tokens: pacote.quantidade_tokens.toString(),
      preco_reais: pacote.preco_reais.toString(),
      stripe_price_id: pacote.stripe_price_id || '',
      desconto_percentual: pacote.desconto_percentual || 0,
      destaque: pacote.destaque || false,
      ativo: pacote.ativo !== false,
    });
    setDialogOpen(true);
  };

  const calcularPrecoUnitario = (preco, quantidade) => {
    return (preco / quantidade).toFixed(4);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="bg-[#111111] border-b border-[#2a2a2a]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Admin')}>
                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white">Pacotes de Créditos IA</h1>
                <p className="text-gray-400 text-sm">Configure os pacotes de créditos para venda</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => syncAllPackagesMutation.mutate()}
                disabled={syncAllPackagesMutation.isPending}
                variant="outline"
                className="border-[#D4AF37]/30 text-[#D4AF37]"
              >
                {syncAllPackagesMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Sincronizar Todos com Stripe
                  </>
                )}
              </Button>
              <Dialog open={dialogOpen} onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) resetForm();
              }}>
                <DialogTrigger asChild>
                  <Button className="bg-[#D4AF37] hover:bg-[#B8973D] text-black">
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Pacote
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
                <DialogHeader>
                  <DialogTitle>
                    {editingPacote ? 'Editar Pacote' : 'Novo Pacote de Créditos'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Nome do Pacote *</label>
                    <Input
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      placeholder="Ex: Pacote Básico"
                      required
                      className="bg-[#0a0a0a] border-[#2a2a2a]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Quantidade de Créditos *</label>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        value={formData.quantidade_tokens}
                        onChange={(e) => setFormData({ ...formData, quantidade_tokens: e.target.value })}
                        placeholder="100"
                        required
                        className="bg-[#0a0a0a] border-[#2a2a2a]"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Preço (R$) *</label>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={formData.preco_reais}
                        onChange={(e) => setFormData({ ...formData, preco_reais: e.target.value })}
                        placeholder="10.00"
                        required
                        className="bg-[#0a0a0a] border-[#2a2a2a]"
                      />
                    </div>
                  </div>
                  {formData.quantidade_tokens && formData.preco_reais && (
                    <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded p-3">
                      <p className="text-sm text-gray-300">
                        Preço por crédito: <span className="text-[#D4AF37] font-semibold">
                          R$ {calcularPrecoUnitario(parseFloat(formData.preco_reais), parseFloat(formData.quantidade_tokens))}
                        </span>
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium mb-2 block">Desconto (%)</label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={formData.desconto_percentual}
                      onChange={(e) => setFormData({ ...formData, desconto_percentual: e.target.value })}
                      placeholder="0"
                      className="bg-[#0a0a0a] border-[#2a2a2a]"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.destaque}
                        onChange={(e) => setFormData({ ...formData, destaque: e.target.checked })}
                        className="w-4 h-4 rounded border-[#2a2a2a] bg-[#0a0a0a] text-[#D4AF37]"
                      />
                      <span className="text-sm text-gray-300">Pacote em destaque</span>
                    </label>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.ativo}
                        onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                        className="w-4 h-4 rounded border-[#2a2a2a] bg-[#0a0a0a] text-[#D4AF37]"
                      />
                      <span className="text-sm text-gray-300">Pacote ativo</span>
                    </label>
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                      className="border-[#2a2a2a]"
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" className="bg-[#D4AF37] hover:bg-[#B8973D] text-black">
                      {editingPacote ? 'Atualizar' : 'Criar Pacote'}
                    </Button>
                  </div>
                </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {isLoading ? (
          <div className="text-white text-center py-12">Carregando...</div>
        ) : pacotes.length === 0 ? (
          <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
            <CardContent className="py-12 text-center text-gray-400">
              Nenhum pacote de créditos cadastrado
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pacotes.map((pacote) => (
              <Card 
                key={pacote.id} 
                className={`bg-[#1a1a1a] border-[#2a2a2a] ${pacote.destaque ? 'ring-2 ring-[#D4AF37]' : ''}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Coins className="w-5 h-5 text-[#D4AF37]" />
                      <CardTitle className="text-white text-lg">{pacote.nome}</CardTitle>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(pacote)}
                        className="text-gray-400 hover:text-white h-8 w-8"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(pacote.id)}
                        className="text-red-500 hover:text-red-600 h-8 w-8"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-lg p-4 text-center">
                      <div className="text-4xl font-bold text-[#D4AF37] mb-1">
                        {pacote.quantidade_tokens}
                      </div>
                      <div className="text-gray-400 text-sm">créditos</div>
                    </div>

                    <div className="text-center">
                      <div className="text-3xl font-bold text-white mb-1">
                        R$ {pacote.preco_reais.toFixed(2)}
                      </div>
                    </div>

                    {pacote.desconto_percentual > 0 && (
                      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2 text-center">
                        <span className="text-green-400 text-sm font-semibold">
                          {pacote.desconto_percentual}% de desconto
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-[#2a2a2a]">
                      <div className="flex gap-2">
                        {pacote.destaque && (
                          <span className="flex items-center gap-1 text-xs text-[#D4AF37]">
                            <Star className="w-3 h-3 fill-[#D4AF37]" />
                            Destaque
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleToggleActive(pacote)}
                        className={`text-xs px-2 py-1 rounded cursor-pointer transition-colors ${
                          pacote.ativo 
                            ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' 
                            : 'bg-gray-500/10 text-gray-400 hover:bg-gray-500/20'
                        }`}
                      >
                        {pacote.ativo ? 'Ativo' : 'Inativo'}
                      </button>
                    </div>

                    <div className="pt-2 border-t border-[#2a2a2a] space-y-1">
                      {pacote.stripe_product_id && (
                        <div className="text-xs text-gray-500 truncate">
                          Produto: {pacote.stripe_product_id}
                        </div>
                      )}
                      {pacote.stripe_price_id && (
                        <div className="text-xs text-gray-500 truncate">
                          Preço: {pacote.stripe_price_id}
                        </div>
                      )}
                      {!pacote.stripe_product_id && !pacote.stripe_price_id && (
                        <div className="text-xs text-yellow-500">
                          ⚠️ Não sincronizado com Stripe
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminPacotesCredito() {
  return (
    <AdminRoute>
      <AdminPacotesCreditoContent />
    </AdminRoute>
  );
}