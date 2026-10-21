import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import AdminRoute from '@/components/auth/AdminRoute';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Plus, User, Phone, Mail, Calendar, Search, Edit, Trash2, CheckCircle, XCircle, Clock, Award, Coins, MessageCircle, ShieldCheck, ShieldOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';

function AdminClientesContent() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState(null);
  const [creditDialogOpen, setCreditDialogOpen] = useState(false);
  const [selectedUserForCredit, setSelectedUserForCredit] = useState(null);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditObservation, setCreditObservation] = useState('');
  const [conversasDialogOpen, setConversasDialogOpen] = useState(false);
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [selectedClienteAdmin, setSelectedClienteAdmin] = useState(null);
  const [adminUsers, setAdminUsers] = useState([]);
  const [selectedClienteConversas, setSelectedClienteConversas] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    email: '',
    instagram: '',
    facebook: '',
    data_nascimento: '',
    observacoes: '',
    senha_canal: '',
  });

  const queryClient = useQueryClient();

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ['clientes'],
    queryFn: async () => {
      const response = await base44.functions.invoke('getAdminClientes', {});
      return response.data.success ? response.data.clientes : [];
    },
  });

  // Buscar usuários com role=admin para saber quais clientes já são admin
  useEffect(() => {
    base44.entities.User.filter({ role: 'admin' }).then(users => {
      setAdminUsers((users || []).map(u => u.email));
    }).catch(() => {});
  }, []);

  const { data: agendamentos = [] } = useQuery({
    queryKey: ['agendamentos'],
    queryFn: () => base44.entities.Agendamento.list(),
  });

  const { data: conversasWhatsApp = [] } = useQuery({
    queryKey: ['conversas-whatsapp', selectedClienteConversas?.telefone],
    queryFn: async () => {
      if (!selectedClienteConversas) return [];
      const conversas = await base44.entities.ConversaWhatsApp.filter(
        { telefone_cliente: selectedClienteConversas.telefone },
        '-created_date',
        50
      );
      return conversas.reverse();
    },
    enabled: !!selectedClienteConversas,
  });



  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Cliente.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      setDialogOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Cliente.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      setDialogOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Cliente.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
    },
  });

  const promoverAdminMutation = useMutation({
    mutationFn: async ({ email, promover }) => {
      const response = await base44.functions.invoke('promoverClienteAdmin', { cliente_email: email, promover });
      if (response.data.error) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: (data, variables) => {
      toast.success(data.message);
      setAdminDialogOpen(false);
      setSelectedClienteAdmin(null);
      // Atualizar lista de admins localmente
      if (variables.promover) {
        setAdminUsers(prev => [...prev, variables.email]);
      } else {
        setAdminUsers(prev => prev.filter(e => e !== variables.email));
      }
    },
    onError: (error) => toast.error(error.message),
  });

  const grantCreditsMutation = useMutation({
    mutationFn: async ({ usuario_email, quantidade, observacao }) => {
      const response = await base44.functions.invoke('grantAICredits', {
        usuario_id: 'pending',
        usuario_email,
        quantidade,
        observacao,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      setCreditDialogOpen(false);
      setCreditAmount('');
      setCreditObservation('');
      setSelectedUserForCredit(null);
      toast.success('Créditos concedidos com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao conceder créditos. Tente novamente.');
    },
  });

  const resetForm = () => {
    setFormData({
      nome: '',
      telefone: '',
      email: '',
      instagram: '',
      facebook: '',
      data_nascimento: '',
      observacoes: '',
      senha_canal: '',
    });
    setEditingCliente(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingCliente) {
      updateMutation.mutate({ id: editingCliente.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (cliente) => {
    setEditingCliente(cliente);
    setFormData({
      nome: cliente.nome,
      telefone: cliente.telefone,
      email: cliente.email || '',
      instagram: cliente.instagram || '',
      facebook: cliente.facebook || '',
      data_nascimento: cliente.data_nascimento || '',
      observacoes: cliente.observacoes || '',
      senha_canal: cliente.senha_canal || '',
    });
    setDialogOpen(true);
  };

  const handleGrantCredits = (e) => {
    e.preventDefault();
    const quantidade = parseInt(creditAmount);
    if (!quantidade || quantidade <= 0) {
      toast.error('Por favor, insira uma quantidade válida de créditos.');
      return;
    }
    grantCreditsMutation.mutate({
      usuario_email: selectedUserForCredit.email,
      quantidade,
      observacao: creditObservation,
    });
  };



  const getClienteStats = useCallback((cliente) => {
    const clienteAgendamentos = agendamentos.filter(ag => ag.cliente_telefone === cliente.telefone);
    const total = clienteAgendamentos.length;
    const concluidos = clienteAgendamentos.filter(ag => ag.status === 'realizado').length;
    const cancelados = clienteAgendamentos.filter(ag => ag.status === 'cancelado').length;
    
    let rank = 'Novo';
    if (concluidos >= 20) rank = 'Platinum';
    else if (concluidos >= 10) rank = 'Gold';
    else if (concluidos >= 5) rank = 'Silver';
    else if (concluidos >= 1) rank = 'Bronze';
    
    const rankColor = {
      'Platinum': 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      'Gold': 'bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/30',
      'Silver': 'bg-gray-400/10 text-gray-400 border-gray-400/30',
      'Bronze': 'bg-orange-500/10 text-orange-400 border-orange-500/30',
      'Novo': 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    };
    
    return { total, concluidos, cancelados, rank, rankColor: rankColor[rank] };
  }, [agendamentos]);

  const filteredClientes = clientes.filter(cliente =>
    cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.telefone.includes(searchTerm)
  );

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
                <h1 className="text-xl sm:text-2xl font-bold text-white">Clientes</h1>
                <p className="text-xs sm:text-sm text-gray-400">Gerencie seus clientes cadastrados</p>
              </div>
            </div>
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="bg-[#D4AF37] hover:bg-[#B8973D] text-black">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Cliente
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
                <DialogHeader>
                  <DialogTitle>
                    {editingCliente ? 'Editar Cliente' : 'Novo Cliente'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Nome Completo *</label>
                    <Input
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      required
                      className="bg-[#0a0a0a] border-[#2a2a2a]"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Telefone *</label>
                    <Input
                      value={formData.telefone}
                      onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                      required
                      className="bg-[#0a0a0a] border-[#2a2a2a]"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">E-mail</label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="bg-[#0a0a0a] border-[#2a2a2a]"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Instagram</label>
                    <Input
                      value={formData.instagram}
                      onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                      placeholder="@instagram"
                      className="bg-[#0a0a0a] border-[#2a2a2a]"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Facebook</label>
                    <Input
                      value={formData.facebook}
                      onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                      placeholder="Perfil do Facebook"
                      className="bg-[#0a0a0a] border-[#2a2a2a]"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Data de Nascimento</label>
                    <Input
                      type="date"
                      value={formData.data_nascimento}
                      onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                      className="bg-[#0a0a0a] border-[#2a2a2a]"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Observações</label>
                    <Textarea
                      value={formData.observacoes}
                      onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                      rows={3}
                      className="bg-[#0a0a0a] border-[#2a2a2a] resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Senha de Acesso (Canal DeMattos)</label>
                    <Input
                      type="text"
                      value={formData.senha_canal}
                      onChange={(e) => setFormData({ ...formData, senha_canal: e.target.value })}
                      placeholder="Senha para acesso ao Canal"
                      className="bg-[#0a0a0a] border-[#2a2a2a]"
                    />
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
                      {editingCliente ? 'Atualizar' : 'Cadastrar'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar cliente..."
            className="pl-10 bg-[#1a1a1a] border-[#2a2a2a] text-white text-sm sm:text-base"
          />
        </div>

        {/* List */}
        {isLoading ? (
          <div className="text-white text-center py-12">Carregando...</div>
        ) : filteredClientes.length === 0 ? (
          <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
            <CardContent className="py-12 text-center text-gray-400">
              Nenhum cliente encontrado
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClientes.map((cliente) => {
              const stats = getClienteStats(cliente);
              
              return (
              <Card key={cliente.id} className="bg-[#1a1a1a] border-[#2a2a2a]">
                <CardContent className="p-6">
                  <div className="flex gap-4 mb-4">
                    {/* Foto do Cliente */}
                    <div className="flex-shrink-0">
                      {cliente.foto_url ? (
                        <img 
                          src={cliente.foto_url} 
                          alt={cliente.nome}
                          className="w-20 h-28 rounded-lg object-cover border-2 border-[#D4AF37]/30"
                        />
                      ) : (
                        <div className="w-20 h-28 bg-[#D4AF37]/10 rounded-lg flex items-center justify-center border-2 border-[#D4AF37]/30">
                          <User className="w-10 h-10 text-[#D4AF37]" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-white font-semibold">{cliente.nome}</h3>
                          <div className="flex gap-2 mt-1 flex-wrap">
                            <Badge className={`${stats.rankColor} border`}>
                              <Award className="w-3 h-3 mr-1" />
                              {stats.rank}
                            </Badge>
                            {cliente.tem_canal && (
                              <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/30">
                                🎯 Canal DeMattos
                              </Badge>
                            )}
                            {!cliente.tem_canal && (
                             <Badge className="bg-gray-500/10 text-gray-400 border-gray-500/30">
                               Sem Canal
                             </Badge>
                            )}
                            {cliente.cadastrado_via_whatsapp && (
                             <Badge className="bg-green-500/10 text-green-400 border-green-500/30">
                               <MessageCircle className="w-3 h-3 mr-1" />
                               WhatsApp
                             </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {cliente.cadastrado_via_whatsapp && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedClienteConversas(cliente);
                                setConversasDialogOpen(true);
                              }}
                              className="text-green-400 hover:text-green-300 h-8 w-8"
                              title="Ver Conversas WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {cliente.email && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedClienteAdmin(cliente);
                                setAdminDialogOpen(true);
                              }}
                              className={`h-8 w-8 ${adminUsers.includes(cliente.email) ? 'text-yellow-400 hover:text-yellow-300' : 'text-gray-400 hover:text-yellow-400'}`}
                              title={adminUsers.includes(cliente.email) ? 'Remover Admin' : 'Promover a Admin'}
                            >
                              {adminUsers.includes(cliente.email) ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldOff className="w-3.5 h-3.5" />}
                            </Button>
                          )}
                          {cliente.email && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedUserForCredit({ email: cliente.email, full_name: cliente.nome, ai_credits: cliente.ai_credits });
                                setCreditDialogOpen(true);
                              }}
                              className="text-[#D4AF37] hover:text-[#B8973D] h-8 w-8"
                              title="Conceder Créditos IA"
                            >
                              <Coins className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(cliente)}
                            className="text-gray-400 hover:text-white h-8 w-8"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (window.confirm('Deseja realmente excluir este cliente?')) {
                                deleteMutation.mutate(cliente.id);
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
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Phone className="w-4 h-4" />
                      {cliente.telefone}
                    </div>
                    {cliente.email && (
                      <div className="flex items-center gap-2 text-gray-400">
                        <Mail className="w-4 h-4" />
                        {cliente.email}
                      </div>
                    )}
                    {cliente.instagram && (
                      <div className="flex items-center gap-2 text-gray-400">
                        <span className="font-semibold">IG:</span>
                        {cliente.instagram}
                      </div>
                    )}
                    {cliente.facebook && (
                      <div className="flex items-center gap-2 text-gray-400">
                        <span className="font-semibold">FB:</span>
                        {cliente.facebook}
                      </div>
                    )}
                    {cliente.data_nascimento && (
                      <div className="flex items-center gap-2 text-gray-400">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(cliente.data_nascimento + 'T12:00:00'), 'dd/MM/yyyy')}
                      </div>
                    )}
                  </div>

                  {cliente.observacoes && (
                    <div className="mt-4 text-gray-400 text-xs bg-[#0a0a0a] p-2 rounded">
                      {cliente.observacoes}
                    </div>
                  )}

                  {/* Status de usuário e créditos */}
                  {cliente.email && (
                    <div className="mt-4 flex items-center justify-between bg-[#D4AF37]/10 p-3 rounded border border-[#D4AF37]/30">
                      <div className="flex items-center gap-2">
                        <Coins className="w-4 h-4 text-[#D4AF37]" />
                        <span className="text-sm text-gray-300">Créditos IA:</span>
                      </div>
                      <span className="text-[#D4AF37] font-semibold">
                        {cliente.ai_credits || 0}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Dialog para Promover/Rebaixar Admin */}
      <Dialog open={adminDialogOpen} onOpenChange={setAdminDialogOpen}>
        <DialogContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-yellow-400" />
              Permissão de Administrador
            </DialogTitle>
          </DialogHeader>
          {selectedClienteAdmin && (
            <div className="space-y-4">
              <div className="bg-[#0a0a0a] p-4 rounded border border-[#2a2a2a]">
                <p className="text-sm text-gray-400 mb-1">Cliente:</p>
                <p className="text-white font-medium">{selectedClienteAdmin.nome}</p>
                <p className="text-sm text-gray-400">{selectedClienteAdmin.email}</p>
                <div className="mt-3">
                  <span className={`text-xs px-2 py-1 rounded ${adminUsers.includes(selectedClienteAdmin.email) ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-500/20 text-gray-400'}`}>
                    {adminUsers.includes(selectedClienteAdmin.email) ? '✓ Administrador' : 'Usuário comum'}
                  </span>
                </div>
              </div>
              {adminUsers.includes(selectedClienteAdmin.email) ? (
                <>
                  <p className="text-sm text-gray-300">Este cliente atualmente tem acesso de administrador. Deseja remover os privilégios?</p>
                  <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setAdminDialogOpen(false)} className="border-[#2a2a2a]">Cancelar</Button>
                    <Button
                      onClick={() => promoverAdminMutation.mutate({ email: selectedClienteAdmin.email, promover: false })}
                      disabled={promoverAdminMutation.isPending}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      <ShieldOff className="w-4 h-4 mr-2" />
                      {promoverAdminMutation.isPending ? 'Removendo...' : 'Remover Admin'}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-300">Deseja promover este cliente a administrador? Ele terá acesso total ao painel admin.</p>
                  <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setAdminDialogOpen(false)} className="border-[#2a2a2a]">Cancelar</Button>
                    <Button
                      onClick={() => promoverAdminMutation.mutate({ email: selectedClienteAdmin.email, promover: true })}
                      disabled={promoverAdminMutation.isPending}
                      className="bg-yellow-500 hover:bg-yellow-600 text-black"
                    >
                      <ShieldCheck className="w-4 h-4 mr-2" />
                      {promoverAdminMutation.isPending ? 'Promovendo...' : 'Promover a Admin'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog para Conceder Créditos */}
      <Dialog open={creditDialogOpen} onOpenChange={setCreditDialogOpen}>
        <DialogContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-[#D4AF37]" />
              Conceder Créditos IA
            </DialogTitle>
          </DialogHeader>
          {selectedUserForCredit && (
            <form onSubmit={handleGrantCredits} className="space-y-4">
              <div className="bg-[#0a0a0a] p-4 rounded border border-[#2a2a2a]">
                <p className="text-sm text-gray-400 mb-1">Cliente:</p>
                <p className="text-white font-medium">{selectedUserForCredit.full_name}</p>
                <p className="text-sm text-gray-400">{selectedUserForCredit.email}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm text-gray-400">Créditos Atuais:</span>
                  <span className="text-[#D4AF37] font-semibold text-lg">
                    {selectedUserForCredit.ai_credits || 0}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Quantidade de Créditos *</label>
                <Input
                  type="number"
                  min="1"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                  placeholder="Ex: 100"
                  required
                  className="bg-[#0a0a0a] border-[#2a2a2a]"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Observação (Opcional)</label>
                <Textarea
                  value={creditObservation}
                  onChange={(e) => setCreditObservation(e.target.value)}
                  placeholder="Motivo da concessão de créditos..."
                  rows={3}
                  className="bg-[#0a0a0a] border-[#2a2a2a] resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCreditDialogOpen(false);
                    setCreditAmount('');
                    setCreditObservation('');
                    setSelectedUserForCredit(null);
                  }}
                  className="border-[#2a2a2a]"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  className="bg-[#D4AF37] hover:bg-[#B8973D] text-black"
                  disabled={grantCreditsMutation.isPending}
                >
                  {grantCreditsMutation.isPending ? 'Concedendo...' : 'Conceder Créditos'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog para Ver Conversas WhatsApp */}
      <Dialog open={conversasDialogOpen} onOpenChange={setConversasDialogOpen}>
        <DialogContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-green-400" />
              Histórico de Conversas WhatsApp
            </DialogTitle>
          </DialogHeader>
          {selectedClienteConversas && (
            <div>
              <div className="bg-[#0a0a0a] p-4 rounded border border-[#2a2a2a] mb-4">
                <p className="text-sm text-gray-400 mb-1">Cliente:</p>
                <p className="text-white font-medium">{selectedClienteConversas.nome}</p>
                <p className="text-sm text-gray-400">{selectedClienteConversas.telefone}</p>
              </div>

              <div className="space-y-3">
                {conversasWhatsApp.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">Nenhuma conversa encontrada</p>
                ) : (
                  conversasWhatsApp.map((conversa) => (
                    <div
                      key={conversa.id}
                      className={`p-4 rounded-lg ${
                        conversa.role === 'user'
                          ? 'bg-green-500/10 border border-green-500/30 ml-8'
                          : 'bg-blue-500/10 border border-blue-500/30 mr-8'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-semibold ${
                          conversa.role === 'user' ? 'text-green-400' : 'text-blue-400'
                        }`}>
                          {conversa.role === 'user' ? 'Cliente' : 'Assistente'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {format(new Date(conversa.created_date), 'dd/MM/yyyy HH:mm')}
                        </span>
                      </div>
                      <p className="text-white text-sm whitespace-pre-wrap">{conversa.mensagem}</p>
                      {conversa.dados_extraidos && Object.keys(conversa.dados_extraidos).length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-700">
                          <p className="text-xs text-gray-500 mb-1">Dados Extraídos:</p>
                          <div className="text-xs text-gray-400">
                            {Object.entries(conversa.dados_extraidos).map(([key, value]) => (
                              value && <div key={key}><span className="font-semibold">{key}:</span> {value}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminClientes() {
  return (
    <AdminRoute>
      <AdminClientesContent />
    </AdminRoute>
  );
}