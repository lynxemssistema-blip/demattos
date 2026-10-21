import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { Lock, ArrowLeft, Calendar, Clock, User, CheckCircle, XCircle, Trash2, Edit, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { createSafariDate } from '@/lib/SafariCompat';
import { toast } from 'sonner';

export default function AgendaProfissional() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [profissional, setProfissional] = useState(null);
  const [agendamentos, setAgendamentos] = useState([]);
  const [clientes, setClientes] = useState({});
  const [loading, setLoading] = useState(false);
  const [loginData, setLoginData] = useState({
    email: '',
    senha: '',
  });

  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState(null);
  const [detalhesOpen, setDetalhesOpen] = useState(false);
  const [editandoAgendamento, setEditandoAgendamento] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => {
    const profissionalStorage = localStorage.getItem('agenda_profissional');
    if (profissionalStorage) {
      const profissionalData = JSON.parse(profissionalStorage);
      setProfissional(profissionalData);
      setLoggedIn(true);
      loadAgendamentos(profissionalData.id);
    }
  }, []);

  const loadAgendamentos = async (profissionalId) => {
    try {
      const response = await base44.functions.invoke('getAgendaProfissional', {
        profissional_id: profissionalId
      });

      if (response.data.success) {
        setAgendamentos(response.data.agendamentos);
        setClientes(response.data.clientes);
      }
    } catch (error) {
      toast.error('Erro ao carregar agendamentos');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await base44.functions.invoke('loginProfissional', {
        email: loginData.email,
        senha: loginData.senha
      });

      if (response.data.error) {
        alert(response.data.error);
        setLoading(false);
        return;
      }

      const profissionalEncontrado = response.data.profissional;

      localStorage.setItem('agenda_profissional', JSON.stringify(profissionalEncontrado));
      setProfissional(profissionalEncontrado);
      setLoggedIn(true);
      loadAgendamentos(profissionalEncontrado.id);
    } catch (error) {
      alert('Erro ao fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('agenda_profissional');
    setLoggedIn(false);
    setProfissional(null);
    setAgendamentos([]);
    setLoginData({ email: '', senha: '' });
  };

  const handleStatusChange = async (agendamentoId, novoStatus) => {
    try {
      const response = await base44.functions.invoke('updateAgendamentoProfissional', {
        profissional_id: profissional.id,
        agendamento_id: agendamentoId,
        action: 'status',
        data: { status: novoStatus }
      });

      if (response.data.error) {
        toast.error(response.data.error);
        return;
      }

      await loadAgendamentos(profissional.id);
      toast.success('Status atualizado com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const handleDeleteAgendamento = async (agendamentoId) => {
    if (!confirm('Deseja realmente excluir este agendamento?')) return;
    
    try {
      const response = await base44.functions.invoke('updateAgendamentoProfissional', {
        profissional_id: profissional.id,
        agendamento_id: agendamentoId,
        action: 'delete'
      });

      if (response.data.error) {
        toast.error(response.data.error);
        return;
      }

      await loadAgendamentos(profissional.id);
      setDetalhesOpen(false);
      toast.success('Agendamento excluído com sucesso!');
    } catch (error) {
      toast.error('Erro ao excluir agendamento');
    }
  };

  const handleEditAgendamento = (agendamento) => {
    setEditandoAgendamento({
      ...agendamento,
      nova_data: agendamento.data,
      novo_horario: agendamento.horario
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editandoAgendamento) return;

    try {
      const response = await base44.functions.invoke('updateAgendamentoProfissional', {
        profissional_id: profissional.id,
        agendamento_id: editandoAgendamento.id,
        action: 'update',
        data: {
          data: editandoAgendamento.nova_data,
          horario: editandoAgendamento.novo_horario,
          observacoes: editandoAgendamento.observacoes
        }
      });

      if (response.data.error) {
        toast.error(response.data.error);
        return;
      }

      await loadAgendamentos(profissional.id);
      setEditDialogOpen(false);
      setEditandoAgendamento(null);
      toast.success('Agendamento atualizado com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar agendamento');
    }
  };

  const verDetalhes = (agendamento) => {
    setAgendamentoSelecionado(agendamento);
    setDetalhesOpen(true);
  };

  const statusColors = {
    pendente: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
    confirmado: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
    realizado: 'bg-green-500/20 text-green-500 border-green-500/30',
    cancelado: 'bg-red-500/20 text-red-500 border-red-500/30',
  };

  const agendamentosPorData = agendamentos.reduce((acc, agendamento) => {
    const data = agendamento.data;
    if (!acc[data]) acc[data] = [];
    acc[data].push(agendamento);
    return acc;
  }, {});

  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Link to={createPageUrl('Home')}>
            <Button variant="ghost" className="text-gray-400 hover:text-white mb-6">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </Link>

          <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-[#D4AF37]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-[#D4AF37]" />
              </div>
              <CardTitle className="text-2xl text-white">Agenda do Profissional</CardTitle>
              <p className="text-gray-400 text-sm mt-2">
                Acesse sua agenda pessoal
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="text-white text-sm font-medium mb-2 block">E-mail</label>
                  <Input
                    type="email"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    placeholder="seu@email.com"
                    required
                    className="bg-[#0a0a0a] border-[#2a2a2a] text-white text-base"
                  />
                </div>

                <div>
                  <label className="text-white text-sm font-medium mb-2 block">Senha</label>
                  <Input
                    type="password"
                    value={loginData.senha}
                    onChange={(e) => setLoginData({ ...loginData, senha: e.target.value })}
                    placeholder="Sua senha"
                    required
                    className="bg-[#0a0a0a] border-[#2a2a2a] text-white text-base"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#D4AF37] hover:bg-[#B8973D] text-black font-semibold"
                >
                  {loading ? 'Entrando...' : 'Entrar'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="bg-[#111111] border-b border-[#2a2a2a]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Home')}>
                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Georgia, serif' }}>
                  Olá, <span className="text-[#D4AF37]">{profissional.nome.split(' ')[0]}</span>
                </h1>
                <p className="text-gray-400 text-sm">Sua agenda pessoal</p>
              </div>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="border-red-500/30 text-red-500 hover:bg-red-500/10"
            >
              Sair
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-2">Meus Agendamentos</h2>
          <p className="text-gray-400 text-sm">
            Total: {agendamentos.length} agendamento{agendamentos.length !== 1 ? 's' : ''}
          </p>
        </div>

        {agendamentos.length === 0 ? (
          <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
            <CardContent className="py-20 text-center">
              <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">Nenhum agendamento encontrado</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {Object.keys(agendamentosPorData).sort().reverse().map((data) => (
              <div key={data}>
                <h3 className="text-lg font-semibold text-[#D4AF37] mb-4">
                  {data ? format(createSafariDate(data), "EEEE, dd 'de' MMMM", { locale: ptBR }) : 'Data não disponível'}
                </h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {agendamentosPorData[data].map((agendamento) => {
                    const cliente = clientes[agendamento.cliente_telefone];
                    return (
                      <Card 
                        key={agendamento.id} 
                        className="bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#D4AF37]/30 transition-all cursor-pointer touch-manipulation"
                        onClick={() => verDetalhes(agendamento)}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4 mb-4">
                            {/* Foto do Cliente */}
                            <div className="flex-shrink-0">
                              {cliente?.foto_url ? (
                                <img 
                                  src={cliente.foto_url} 
                                  alt={agendamento.cliente_nome}
                                  className="w-16 h-16 rounded-full object-cover border-2 border-[#D4AF37]"
                                />
                              ) : (
                                <div className="w-16 h-16 bg-[#D4AF37]/10 rounded-full flex items-center justify-center border-2 border-[#D4AF37]/30">
                                  <User className="w-8 h-8 text-[#D4AF37]" />
                                </div>
                              )}
                            </div>

                            {/* Informações */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 text-[#D4AF37] mb-2">
                                <Clock className="w-4 h-4" />
                                <span className="font-semibold">
                                  {agendamento.horario}
                                  {agendamento.horario_fim && ` - ${agendamento.horario_fim}`}
                                </span>
                              </div>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusColors[agendamento.status]}`}>
                                {agendamento.status}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="text-white font-semibold">
                              {agendamento.cliente_nome}
                            </div>
                            <div className="flex items-center gap-2 text-gray-400 text-sm">
                              <Phone className="w-4 h-4" />
                              {agendamento.cliente_telefone}
                            </div>
                            <div className="text-white text-sm">{agendamento.servico}</div>
                            {agendamento.duracao_total && (
                              <div className="text-[#D4AF37] text-xs">
                                Duração: {agendamento.duracao_total} minutos
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialog de Detalhes */}
      <Dialog open={detalhesOpen} onOpenChange={setDetalhesOpen}>
        <DialogContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Detalhes do Agendamento</DialogTitle>
          </DialogHeader>
          
          {agendamentoSelecionado && (
            <div className="space-y-6">
              {/* Cliente */}
              <div className="flex items-center gap-4 p-4 bg-[#0a0a0a] rounded-lg">
                {clientes[agendamentoSelecionado.cliente_telefone]?.foto_url ? (
                  <img 
                    src={clientes[agendamentoSelecionado.cliente_telefone].foto_url} 
                    alt={agendamentoSelecionado.cliente_nome}
                    className="w-20 h-20 rounded-full object-cover border-2 border-[#D4AF37]"
                  />
                ) : (
                  <div className="w-20 h-20 bg-[#D4AF37]/10 rounded-full flex items-center justify-center border-2 border-[#D4AF37]/30">
                    <User className="w-10 h-10 text-[#D4AF37]" />
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-semibold text-white">{agendamentoSelecionado.cliente_nome}</h3>
                  <p className="text-gray-400">{agendamentoSelecionado.cliente_telefone}</p>
                  {clientes[agendamentoSelecionado.cliente_telefone]?.email && (
                    <p className="text-gray-400 text-sm">{clientes[agendamentoSelecionado.cliente_telefone].email}</p>
                  )}
                </div>
              </div>

              {/* Dados do Agendamento */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-[#0a0a0a] rounded-lg">
                  <p className="text-gray-400 text-sm mb-1">Data</p>
                  <p className="text-white font-semibold">
                    {agendamentoSelecionado.data ? format(createSafariDate(agendamentoSelecionado.data), "dd/MM/yyyy") : 'Data não disponível'}
                  </p>
                </div>
                <div className="p-4 bg-[#0a0a0a] rounded-lg">
                  <p className="text-gray-400 text-sm mb-1">Horário</p>
                  <p className="text-white font-semibold">
                    {agendamentoSelecionado.horario}
                    {agendamentoSelecionado.horario_fim && ` - ${agendamentoSelecionado.horario_fim}`}
                  </p>
                </div>
                <div className="p-4 bg-[#0a0a0a] rounded-lg">
                  <p className="text-gray-400 text-sm mb-1">Serviço</p>
                  <p className="text-white font-semibold">{agendamentoSelecionado.servico}</p>
                </div>
                <div className="p-4 bg-[#0a0a0a] rounded-lg">
                  <p className="text-gray-400 text-sm mb-1">Duração</p>
                  <p className="text-white font-semibold">{agendamentoSelecionado.duracao_total || 30} min</p>
                </div>
              </div>

              {/* Status */}
              <div className="p-4 bg-[#0a0a0a] rounded-lg">
                <p className="text-gray-400 text-sm mb-2">Status</p>
                <span className={`px-4 py-2 rounded-full text-sm font-medium border inline-block ${statusColors[agendamentoSelecionado.status]}`}>
                  {agendamentoSelecionado.status}
                </span>
              </div>

              {/* Observações */}
              {agendamentoSelecionado.observacoes && (
                <div className="p-4 bg-[#0a0a0a] rounded-lg">
                  <p className="text-gray-400 text-sm mb-2">Observações</p>
                  <p className="text-white">{agendamentoSelecionado.observacoes}</p>
                </div>
              )}

              {/* Ações */}
              <div className="flex gap-3 pt-4 border-t border-[#2a2a2a] safe-area-bottom pb-6">
                <Button
                  onClick={() => handleEditAgendamento(agendamentoSelecionado)}
                  className="flex-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border border-blue-500/30 touch-manipulation"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </Button>
                {agendamentoSelecionado.status === 'pendente' && (
                  <Button
                    onClick={() => handleStatusChange(agendamentoSelecionado.id, 'confirmado')}
                    className="flex-1 bg-green-500/10 hover:bg-green-500/20 text-green-500 border border-green-500/30 touch-manipulation"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirmar
                  </Button>
                )}
                {agendamentoSelecionado.status === 'confirmado' && (
                  <Button
                    onClick={() => handleStatusChange(agendamentoSelecionado.id, 'realizado')}
                    className="flex-1 bg-green-500/10 hover:bg-green-500/20 text-green-500 border border-green-500/30 touch-manipulation"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Finalizar
                  </Button>
                )}
                <Button
                  onClick={() => handleDeleteAgendamento(agendamentoSelecionado.id)}
                  variant="outline"
                  className="border-red-500/30 text-red-500 hover:bg-red-500/10 touch-manipulation"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Edição */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
          <DialogHeader>
            <DialogTitle>Editar Agendamento</DialogTitle>
          </DialogHeader>
          
          {editandoAgendamento && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Nova Data</label>
                <Input
                  type="date"
                  value={editandoAgendamento.nova_data}
                  onChange={(e) => setEditandoAgendamento({...editandoAgendamento, nova_data: e.target.value})}
                  className="bg-[#0a0a0a] border-[#2a2a2a] text-[16px]"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Novo Horário</label>
                <Input
                  type="time"
                  value={editandoAgendamento.novo_horario}
                  onChange={(e) => setEditandoAgendamento({...editandoAgendamento, novo_horario: e.target.value})}
                  className="bg-[#0a0a0a] border-[#2a2a2a] text-[16px]"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Observações</label>
                <Input
                  value={editandoAgendamento.observacoes || ''}
                  onChange={(e) => setEditandoAgendamento({...editandoAgendamento, observacoes: e.target.value})}
                  className="bg-[#0a0a0a] border-[#2a2a2a] text-[16px]"
                />
              </div>
              <div className="flex gap-3 pt-4 safe-area-bottom pb-6">
                <Button
                  variant="outline"
                  onClick={() => setEditDialogOpen(false)}
                  className="flex-1 border-[#2a2a2a] touch-manipulation"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  className="flex-1 bg-[#D4AF37] hover:bg-[#B8973D] text-black touch-manipulation"
                >
                  Salvar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}