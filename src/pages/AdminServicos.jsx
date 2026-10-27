import React, { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import AdminRoute from '@/components/auth/AdminRoute';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Scissors, Clock, DollarSign, Edit, Trash2, Sparkles, Droplets, Crown, CheckCircle, XCircle, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import AIDescriptionAssistant from '@/components/admin/AIDescriptionAssistant';

function AdminServicosContent() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingServico, setEditingServico] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    preco: '',
    duracao: '',
    icone: 'Scissors',
    destaque_home: false,
    exibir_no_catalogo: false,
    ativo: true,
  });

  const queryClient = useQueryClient();

  const { data: servicos = [], isLoading } = useQuery({
    queryKey: ['servicos'],
    queryFn: async () => {
      const response = await base44.functions.invoke('getAdminServicos', {});
      return response.data.success ? response.data.servicos : [];
    },
  });

  const { data: agendamentos = [] } = useQuery({
    queryKey: ['agendamentos'],
    queryFn: async () => {
      try {
        return await base44.entities.Agendamento.list();
      } catch (error) {
        console.error('Erro ao carregar agendamentos:', error);
        return [];
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Servico.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicos'] });
      setDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      console.error('Erro ao criar serviço:', error);
      toast.error('Erro ao criar serviço. Tente novamente.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Servico.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicos'] });
      setDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      console.error('Erro ao atualizar serviço:', error);
      toast.error('Erro ao atualizar serviço. Tente novamente.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Servico.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicos'] });
    },
    onError: (error) => {
      console.error('Erro ao deletar serviço:', error);
      toast.error('Erro ao deletar serviço. Tente novamente.');
    },
  });

  const resetForm = () => {
    setFormData({
      nome: '',
      descricao: '',
      preco: '',
      duracao: '',
      icone: 'Scissors',
      destaque_home: false,
      exibir_no_catalogo: false,
      ativo: true,
    });
    setEditingServico(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      preco: parseFloat(formData.preco),
      duracao: parseInt(formData.duracao),
    };
    
    if (editingServico) {
      updateMutation.mutate({ id: editingServico.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (servico) => {
    setEditingServico(servico);
    setFormData({
      nome: servico.nome,
      descricao: servico.descricao || '',
      preco: servico.preco.toString(),
      duracao: servico.duracao.toString(),
      icone: servico.icone || 'Scissors',
      destaque_home: servico.destaque_home || false,
      exibir_no_catalogo: servico.exibir_no_catalogo || false,
      ativo: servico.ativo,
    });
    setDialogOpen(true);
  };

  const getServicoStats = useCallback((servico) => {
    try {
      const servicoAgendamentos = agendamentos.filter(ag => ag.servico === servico.nome);
      const total = servicoAgendamentos.length;
      const concluidos = servicoAgendamentos.filter(ag => ag.status === 'realizado').length;
      const cancelados = servicoAgendamentos.filter(ag => ag.status === 'cancelado').length;
      
      let rank = 'Novo';
      if (total >= 50) rank = 'Top';
      else if (total >= 30) rank = 'Popular';
      else if (total >= 15) rank = 'Regular';
      else if (total >= 5) rank = 'Iniciante';
      
      const rankColor = {
        'Top': 'bg-purple-500/10 text-purple-400 border-purple-500/30',
        'Popular': 'bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/30',
        'Regular': 'bg-blue-500/10 text-blue-400 border-blue-500/30',
        'Iniciante': 'bg-green-500/10 text-green-400 border-green-500/30',
        'Novo': 'bg-gray-400/10 text-gray-400 border-gray-400/30',
      };
      
      return { total, concluidos, cancelados, rank, rankColor: rankColor[rank] };
    } catch (error) {
      console.error('Erro ao calcular stats:', error);
      return { 
        total: 0, 
        concluidos: 0, 
        cancelados: 0, 
        rank: 'Novo', 
        rankColor: 'bg-gray-400/10 text-gray-400 border-gray-400/30' 
      };
    }
  }, [agendamentos]);

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="bg-[#111111] border-b border-[#2a2a2a]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <Link to={createPageUrl('Admin')}>
                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                  <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">Serviços</h1>
                <p className="text-xs sm:text-sm text-gray-400">Gerencie os serviços oferecidos</p>
              </div>
            </div>
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="bg-[#D4AF37] hover:bg-[#B8973D] text-black text-sm sm:text-base">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Serviço
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingServico ? 'Editar Serviço' : 'Novo Serviço'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Nome do Serviço *</label>
                    <Input
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      required
                      className="bg-[#0a0a0a] border-[#2a2a2a]"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium">Descrição</label>
                      <AIDescriptionAssistant
                        serviceName={formData.nome}
                        onUseDescription={(desc) => setFormData({ ...formData, descricao: desc })}
                      />
                    </div>
                    <Textarea
                      value={formData.descricao}
                      onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                      rows={3}
                      className="bg-[#0a0a0a] border-[#2a2a2a] resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Ícone</label>
                    <Select
                      value={formData.icone}
                      onValueChange={(value) => setFormData({ ...formData, icone: value })}
                    >
                      <SelectTrigger className="bg-[#0a0a0a] border-[#2a2a2a]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a]">
                        <SelectItem value="Scissors">Scissors (Tesoura)</SelectItem>
                        <SelectItem value="Sparkles">Sparkles (Estrelas)</SelectItem>
                        <SelectItem value="Droplets">Droplets (Gotas)</SelectItem>
                        <SelectItem value="Crown">Crown (Coroa)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Preço (R$) *</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.preco}
                        onChange={(e) => setFormData({ ...formData, preco: e.target.value })}
                        required
                        className="bg-[#0a0a0a] border-[#2a2a2a]"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Duração (min) *</label>
                      <Input
                        type="number"
                        value={formData.duracao}
                        onChange={(e) => setFormData({ ...formData, duracao: e.target.value })}
                        required
                        className="bg-[#0a0a0a] border-[#2a2a2a]"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Destaque na Home</label>
                    <Switch
                      checked={formData.destaque_home}
                      onCheckedChange={(checked) => setFormData({ ...formData, destaque_home: checked })}
                    />
                  </div>
                  <p className="text-xs text-gray-500 -mt-2">Máximo 6 serviços em destaque na página inicial</p>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Exibir no Catálogo</label>
                    <Switch
                      checked={formData.exibir_no_catalogo}
                      onCheckedChange={(checked) => setFormData({ ...formData, exibir_no_catalogo: checked })}
                    />
                  </div>
                  <p className="text-xs text-gray-500 -mt-2">Quando ativo, aparece na página de catálogo público</p>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Serviço Ativo</label>
                    <Switch
                      checked={formData.ativo}
                      onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setDialogOpen(false)}
                      className="text-gray-400 hover:text-white hover:bg-[#1a1a1a]"
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" className="bg-[#D4AF37] hover:bg-[#B8973D] text-black font-semibold">
                      {editingServico ? 'Atualizar' : 'Cadastrar'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {isLoading ? (
          <div className="text-white text-center py-12">Carregando...</div>
        ) : servicos.length === 0 ? (
          <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
            <CardContent className="py-12 text-center text-gray-400">
              Nenhum serviço cadastrado
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {servicos.map((servico) => {
              const stats = getServicoStats(servico);
              
              return (
              <Card key={servico.id} className="bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#D4AF37]/30 transition-colors">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex gap-3 sm:gap-4 mb-4">
                    {/* Ícone do Serviço */}
                    <div className="flex-shrink-0">
                      <div className="w-16 h-20 sm:w-20 sm:h-28 bg-[#D4AF37]/10 rounded-lg flex items-center justify-center border-2 border-[#D4AF37]/30">
                        {servico.icone === 'Sparkles' && <Sparkles className="w-8 h-8 sm:w-12 sm:h-12 text-[#D4AF37]" />}
                        {servico.icone === 'Droplets' && <Droplets className="w-8 h-8 sm:w-12 sm:h-12 text-[#D4AF37]" />}
                        {servico.icone === 'Crown' && <Crown className="w-8 h-8 sm:w-12 sm:h-12 text-[#D4AF37]" />}
                        {(!servico.icone || servico.icone === 'Scissors') && <Scissors className="w-8 h-8 sm:w-12 sm:h-12 text-[#D4AF37]" />}
                      </div>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0 pr-2">
                          <h3 className="text-white font-semibold text-sm sm:text-base break-words">{servico.nome}</h3>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge className={`${stats.rankColor} border text-xs`}>
                              <TrendingUp className="w-3 h-3 mr-1" />
                              {stats.rank}
                            </Badge>
                            {!servico.ativo && (
                              <span className="text-xs text-red-400">• Inativo</span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(servico)}
                            className="text-gray-400 hover:text-white h-8 w-8"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (window.confirm('Deseja realmente excluir este serviço?')) {
                                deleteMutation.mutate(servico.id);
                              }
                            }}
                            className="text-red-500 hover:text-red-600 h-8 w-8"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Estatísticas de Agendamentos */}
                      <div className="grid grid-cols-3 gap-2 mt-3">
                        <div className="bg-[#0a0a0a] p-2 rounded text-center">
                          <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
                            <Clock className="w-3 h-3" />
                          </div>
                          <div className="text-white font-semibold text-sm">{stats.total}</div>
                          <div className="text-gray-500 text-xs">Total</div>
                        </div>
                        <div className="bg-[#0a0a0a] p-2 rounded text-center">
                          <div className="flex items-center justify-center gap-1 text-green-400 mb-1">
                            <CheckCircle className="w-3 h-3" />
                          </div>
                          <div className="text-white font-semibold text-sm">{stats.concluidos}</div>
                          <div className="text-gray-500 text-xs">Concluídos</div>
                        </div>
                        <div className="bg-[#0a0a0a] p-2 rounded text-center">
                          <div className="flex items-center justify-center gap-1 text-red-400 mb-1">
                            <XCircle className="w-3 h-3" />
                          </div>
                          <div className="text-white font-semibold text-sm">{stats.cancelados}</div>
                          <div className="text-gray-500 text-xs">Cancelados</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {servico.descricao && (
                    <p className="text-gray-400 text-xs sm:text-sm mb-4 line-clamp-2 break-words">{servico.descricao}</p>
                  )}

                  <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-[#2a2a2a]">
                    <div className="flex items-center gap-1 sm:gap-2 text-[#D4AF37]">
                      <DollarSign className="w-4 h-4" />
                      <span className="font-semibold text-sm sm:text-base">R$ {servico.preco.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 text-gray-400 text-xs sm:text-sm">
                      <Clock className="w-4 h-4" />
                      <span>{servico.duracao} min</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminServicos() {
  return (
    <AdminRoute>
      <AdminServicosContent />
    </AdminRoute>
  );
}