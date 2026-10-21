import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import AdminRoute from '@/components/auth/AdminRoute';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Plus, User, Edit, Trash2, Loader2, Scissors, Calendar, CheckCircle, XCircle, Clock, Award } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function AdminProfissionaisContent() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProfissional, setEditingProfissional] = useState(null);
  const [uploadando, setUploadando] = useState(false);
  const [agendaDialogOpen, setAgendaDialogOpen] = useState(false);
  const [profissionalSelecionado, setProfissionalSelecionado] = useState(null);
  const [agendamentos, setAgendamentos] = useState([]);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    foto_url: '',
    historico_profissional: '',
    servicos_ids: [],
    senha_acesso: '',
    tem_acesso_admin: false,
    destaque_home: false,
    ativo: true,
  });
  
  const [configAgenda, setConfigAgenda] = useState({
    dias_semana: [1, 2, 3, 4, 5, 6],
    horario_inicio: '09:00',
    horario_fim: '18:00',
    horario_almoco_inicio: '',
    horario_almoco_fim: '',
    intervalo_minutos: 30,
  });
  const [configAgendaId, setConfigAgendaId] = useState(null);

  const queryClient = useQueryClient();

  const { data: profissionais = [], isLoading } = useQuery({
    queryKey: ['profissionais'],
    queryFn: async () => {
      const response = await base44.functions.invoke('getAdminProfissionais', {});
      return response.data.success ? response.data.profissionais : [];
    },
  });

  const { data: servicos = [] } = useQuery({
    queryKey: ['servicos'],
    queryFn: () => base44.entities.Servico.filter({ ativo: true }),
  });

  const { data: todosAgendamentos = [] } = useQuery({
    queryKey: ['todos-agendamentos'],
    queryFn: () => base44.entities.Agendamento.list(),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('criarProfissional', {
        profissionalData: data,
        configAgenda
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profissionais'] });
      setDialogOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data, configId }) => {
      const response = await base44.functions.invoke('atualizarProfissional', {
        profissional_id: id,
        profissionalData: data,
        configAgenda,
        configId
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profissionais'] });
      setDialogOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Profissional.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profissionais'] });
    },
  });

  const resetForm = () => {
    setFormData({
      nome: '',
      email: '',
      telefone: '',
      foto_url: '',
      historico_profissional: '',
      servicos_ids: [],
      senha_acesso: '',
      tem_acesso_admin: false,
      destaque_home: false,
      ativo: true,
    });
    setConfigAgenda({
      dias_semana: [1, 2, 3, 4, 5, 6],
      horario_inicio: '09:00',
      horario_fim: '18:00',
      horario_almoco_inicio: '',
      horario_almoco_fim: '',
      intervalo_minutos: 30,
    });
    setConfigAgendaId(null);
    setEditingProfissional(null);
  };

  const gerarHorariosDisponiveis = async (profissionalId, profissionalNome) => {
    const hoje = new Date();
    const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    
    const horarios = [];
    
    // Calcular minutos de almoço (se configurado)
    let almocoInicio = null;
    let almocoFim = null;
    if (configAgenda.horario_almoco_inicio && configAgenda.horario_almoco_fim) {
      const [horaAlmocoIni, minAlmocoIni] = configAgenda.horario_almoco_inicio.split(':').map(Number);
      const [horaAlmocoFim, minAlmocoFim] = configAgenda.horario_almoco_fim.split(':').map(Number);
      almocoInicio = horaAlmocoIni * 60 + minAlmocoIni;
      almocoFim = horaAlmocoFim * 60 + minAlmocoFim;
    }
    
    for (let dia = hoje.getDate(); dia <= ultimoDiaMes.getDate(); dia++) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth(), dia);
      const diaSemana = data.getDay();
      
      if (configAgenda.dias_semana.includes(diaSemana)) {
        const [horaInicio, minInicio] = configAgenda.horario_inicio.split(':').map(Number);
        const [horaFim, minFim] = configAgenda.horario_fim.split(':').map(Number);
        
        let horaAtual = horaInicio * 60 + minInicio;
        const horaFinal = horaFim * 60 + minFim;
        
        while (horaAtual < horaFinal) {
          const horas = Math.floor(horaAtual / 60).toString().padStart(2, '0');
          const minutos = (horaAtual % 60).toString().padStart(2, '0');
          
          // Pular horários de almoço/intervalo
          const dentroDoAlmoco = almocoInicio !== null && horaAtual >= almocoInicio && horaAtual < almocoFim;
          
          if (!dentroDoAlmoco) {
            horarios.push({
              profissional_id: profissionalId,
              profissional_nome: profissionalNome,
              data: data.toISOString().split('T')[0],
              horario: `${horas}:${minutos}`,
              disponivel: true
            });
          }
          
          horaAtual += configAgenda.intervalo_minutos;
        }
      }
    }
    
    if (horarios.length > 0) {
      await base44.entities.HorarioDisponivel.bulkCreate(horarios);
    }
  };

  const handleFotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadando(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, foto_url: file_url });
    } catch (error) {
      alert('Erro ao fazer upload da foto');
    } finally {
      setUploadando(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (editingProfissional) {
      updateMutation.mutate({ 
        id: editingProfissional.id, 
        data: formData,
        configId: configAgendaId 
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = async (profissional) => {
    setEditingProfissional(profissional);
    setFormData({
      nome: profissional.nome,
      email: profissional.email,
      telefone: profissional.telefone || '',
      foto_url: profissional.foto_url || '',
      historico_profissional: profissional.historico_profissional || '',
      servicos_ids: profissional.servicos_ids || [],
      senha_acesso: '', // Não preencher senha existente
      tem_acesso_admin: profissional.tem_acesso_admin || false,
      destaque_home: profissional.destaque_home || false,
      ativo: profissional.ativo,
    });
    
    const configs = await base44.entities.ConfigAgendaProfissional.filter({
      profissional_id: profissional.id
    });
    
    if (configs.length > 0) {
      setConfigAgenda({
        dias_semana: configs[0].dias_semana || [1, 2, 3, 4, 5, 6],
        horario_inicio: configs[0].horario_inicio || '09:00',
        horario_fim: configs[0].horario_fim || '18:00',
        horario_almoco_inicio: configs[0].horario_almoco_inicio || '',
        horario_almoco_fim: configs[0].horario_almoco_fim || '',
        intervalo_minutos: configs[0].intervalo_minutos || 30,
      });
      setConfigAgendaId(configs[0].id);
    } else {
      setConfigAgendaId(null);
    }
    
    setDialogOpen(true);
  };

  const toggleServico = (servicoId) => {
    if (formData.servicos_ids.includes(servicoId)) {
      setFormData({
        ...formData,
        servicos_ids: formData.servicos_ids.filter(id => id !== servicoId)
      });
    } else {
      setFormData({
        ...formData,
        servicos_ids: [...formData.servicos_ids, servicoId]
      });
    }
  };

  const toggleDiaSemana = (dia) => {
    if (configAgenda.dias_semana.includes(dia)) {
      setConfigAgenda({
        ...configAgenda,
        dias_semana: configAgenda.dias_semana.filter(d => d !== dia)
      });
    } else {
      setConfigAgenda({
        ...configAgenda,
        dias_semana: [...configAgenda.dias_semana, dia].sort()
      });
    }
  };

  const diasSemanaLabels = {
    0: 'Dom',
    1: 'Seg',
    2: 'Ter',
    3: 'Qua',
    4: 'Qui',
    5: 'Sex',
    6: 'Sáb'
  };

  const statusColors = {
    pendente: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
    confirmado: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
    realizado: 'bg-green-500/20 text-green-500 border-green-500/30',
    cancelado: 'bg-red-500/20 text-red-500 border-red-500/30',
  };

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list(),
  });

  const verAgendaProfissional = async (profissional) => {
    setProfissionalSelecionado(profissional);
    const agendamentosProf = await base44.entities.Agendamento.filter({
      profissional_id: profissional.id
    }, '-data');
    setAgendamentos(agendamentosProf);
    setAgendaDialogOpen(true);
  };

  const handleStatusChange = async (agendamentoId, novoStatus) => {
    await base44.entities.Agendamento.update(agendamentoId, { status: novoStatus });
    if (profissionalSelecionado) {
      const agendamentosProf = await base44.entities.Agendamento.filter({
        profissional_id: profissionalSelecionado.id
      }, '-data');
      setAgendamentos(agendamentosProf);
    }
  };

  const agendamentosPorData = agendamentos.reduce((acc, agendamento) => {
    const data = agendamento.data;
    if (!acc[data]) acc[data] = [];
    acc[data].push(agendamento);
    return acc;
  }, {});

  const getProfissionalStats = (profissional) => {
    const profAgendamentos = todosAgendamentos.filter(ag => ag.profissional_id === profissional.id);
    const total = profAgendamentos.length;
    const concluidos = profAgendamentos.filter(ag => ag.status === 'realizado').length;
    const cancelados = profAgendamentos.filter(ag => ag.status === 'cancelado').length;
    
    let rank = 'Novo';
    if (concluidos >= 100) rank = 'Master';
    else if (concluidos >= 50) rank = 'Expert';
    else if (concluidos >= 20) rank = 'Senior';
    else if (concluidos >= 5) rank = 'Junior';
    
    const rankColor = {
      'Master': 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      'Expert': 'bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/30',
      'Senior': 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      'Junior': 'bg-green-500/10 text-green-400 border-green-500/30',
      'Novo': 'bg-gray-400/10 text-gray-400 border-gray-400/30',
    };
    
    return { total, concluidos, cancelados, rank, rankColor: rankColor[rank] };
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
                <h1 className="text-2xl font-bold text-white">Profissionais</h1>
                <p className="text-gray-400 text-sm">Gerencie a equipe da barbearia</p>
              </div>
            </div>
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="bg-[#D4AF37] hover:bg-[#B8973D] text-black">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Profissional
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingProfissional ? 'Editar Profissional' : 'Novo Profissional'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Foto do Profissional</label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleFotoUpload}
                      disabled={uploadando}
                      className="bg-[#0a0a0a] border-[#2a2a2a]"
                    />
                    {uploadando && (
                      <div className="flex items-center gap-2 text-[#D4AF37] text-sm mt-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Enviando...
                      </div>
                    )}
                    {formData.foto_url && (
                      <img src={formData.foto_url} alt="Preview" className="w-24 h-24 rounded-full mt-3 object-cover" />
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Nome Completo *</label>
                    <Input
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      required
                      className="bg-[#0a0a0a] border-[#2a2a2a]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Email *</label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                        className="bg-[#0a0a0a] border-[#2a2a2a]"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Telefone</label>
                      <Input
                        value={formData.telefone}
                        onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                        className="bg-[#0a0a0a] border-[#2a2a2a]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      {editingProfissional ? 'Nova Senha (deixe vazio para não alterar)' : 'Senha de Acesso *'}
                    </label>
                    <Input
                      type="password"
                      value={formData.senha_acesso}
                      onChange={(e) => setFormData({ ...formData, senha_acesso: e.target.value })}
                      required={!editingProfissional}
                      placeholder={editingProfissional ? "Deixe vazio para manter a atual" : "Mínimo 6 caracteres"}
                      className="bg-[#0a0a0a] border-[#2a2a2a]"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Histórico Profissional</label>
                    <Textarea
                      value={formData.historico_profissional}
                      onChange={(e) => setFormData({ ...formData, historico_profissional: e.target.value })}
                      rows={4}
                      placeholder="Experiência, especialidades, cursos..."
                      className="bg-[#0a0a0a] border-[#2a2a2a] resize-none"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium">Serviços que Executa</label>
                      {servicos.length > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (formData.servicos_ids.length === servicos.length) {
                              setFormData({ ...formData, servicos_ids: [] });
                            } else {
                              setFormData({ ...formData, servicos_ids: servicos.map(s => s.id) });
                            }
                          }}
                          className="text-[#D4AF37] hover:text-[#B8973D] h-8"
                        >
                          {formData.servicos_ids.length === servicos.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4 max-h-48 overflow-y-auto">
                      {servicos.length === 0 ? (
                        <p className="text-gray-500 text-sm">Nenhum serviço cadastrado</p>
                      ) : (
                        servicos.map((servico) => (
                          <label key={servico.id} className="flex items-center gap-3 cursor-pointer hover:bg-[#1a1a1a] p-2 rounded">
                            <Checkbox
                              checked={formData.servicos_ids.includes(servico.id)}
                              onCheckedChange={() => toggleServico(servico.id)}
                              className="border-[#D4AF37]"
                            />
                            <div className="flex items-center gap-2 flex-1">
                              <Scissors className="w-4 h-4 text-[#D4AF37]" />
                              <span className="text-white">{servico.nome}</span>
                              <span className="text-gray-400 text-sm ml-auto">R$ {servico.preco.toFixed(2)}</span>
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="border-t border-[#2a2a2a] pt-4 mt-4">
                    <h3 className="text-sm font-semibold text-white mb-4">Configuração de Agenda</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Dias de Trabalho</label>
                        <div className="flex flex-wrap gap-2">
                          {[0, 1, 2, 3, 4, 5, 6].map((dia) => (
                            <button
                              key={dia}
                              type="button"
                              onClick={() => toggleDiaSemana(dia)}
                              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                configAgenda.dias_semana.includes(dia)
                                  ? 'bg-[#D4AF37] text-black'
                                  : 'bg-[#0a0a0a] text-gray-400 border border-[#2a2a2a]'
                              }`}
                            >
                              {diasSemanaLabels[dia]}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium mb-2 block">Início</label>
                          <Input
                            type="time"
                            value={configAgenda.horario_inicio}
                            onChange={(e) => setConfigAgenda({ ...configAgenda, horario_inicio: e.target.value })}
                            className="bg-[#0a0a0a] border-[#2a2a2a]"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">Fim</label>
                          <Input
                            type="time"
                            value={configAgenda.horario_fim}
                            onChange={(e) => setConfigAgenda({ ...configAgenda, horario_fim: e.target.value })}
                            className="bg-[#0a0a0a] border-[#2a2a2a]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium mb-2 block">Almoço/Intervalo - Início</label>
                          <Input
                            type="time"
                            value={configAgenda.horario_almoco_inicio}
                            onChange={(e) => setConfigAgenda({ ...configAgenda, horario_almoco_inicio: e.target.value })}
                            className="bg-[#0a0a0a] border-[#2a2a2a]"
                            placeholder="Opcional"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">Almoço/Intervalo - Fim</label>
                          <Input
                            type="time"
                            value={configAgenda.horario_almoco_fim}
                            onChange={(e) => setConfigAgenda({ ...configAgenda, horario_almoco_fim: e.target.value })}
                            className="bg-[#0a0a0a] border-[#2a2a2a]"
                            placeholder="Opcional"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Intervalo (minutos)</label>
                        <Input
                          type="number"
                          min="15"
                          step="15"
                          value={configAgenda.intervalo_minutos}
                          onChange={(e) => setConfigAgenda({ ...configAgenda, intervalo_minutos: parseInt(e.target.value) })}
                          className="bg-[#0a0a0a] border-[#2a2a2a]"
                        />
                        <p className="text-xs text-gray-500 mt-1">Tempo entre cada horário disponível</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Acesso à Página Admin</label>
                    <Switch
                      checked={formData.tem_acesso_admin}
                      onCheckedChange={(checked) => setFormData({ ...formData, tem_acesso_admin: checked })}
                    />
                  </div>
                  <p className="text-xs text-gray-500 -mt-2">Permitir que este profissional acesse o painel administrativo</p>
                  
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Destaque na Home</label>
                    <Switch
                      checked={formData.destaque_home}
                      onCheckedChange={(checked) => setFormData({ ...formData, destaque_home: checked })}
                    />
                  </div>
                  <p className="text-xs text-gray-500 -mt-2">Máximo 6 profissionais em destaque na página inicial</p>
                  
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Profissional Ativo</label>
                    <Switch
                      checked={formData.ativo}
                      onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
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
                      {editingProfissional ? 'Atualizar' : 'Cadastrar'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {isLoading ? (
          <div className="text-white text-center py-12">Carregando...</div>
        ) : profissionais.length === 0 ? (
          <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
            <CardContent className="py-12 text-center text-gray-400">
              Nenhum profissional cadastrado
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profissionais.map((profissional) => {
              const stats = getProfissionalStats(profissional);
              
              return (
              <Card key={profissional.id} className="bg-[#1a1a1a] border-[#2a2a2a]">
                <CardContent className="p-6">
                  <div className="flex gap-4 mb-4">
                    {/* Foto do Profissional */}
                    <div className="flex-shrink-0">
                      {profissional.foto_url ? (
                        <img 
                          src={profissional.foto_url} 
                          alt={profissional.nome}
                          className="w-20 h-28 rounded-lg object-cover border-2 border-[#D4AF37]/30"
                        />
                      ) : (
                        <div className="w-20 h-28 bg-[#D4AF37]/10 rounded-lg flex items-center justify-center border-2 border-[#D4AF37]/30">
                          <User className="w-10 h-10 text-[#D4AF37]" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0 pr-2">
                          <h3 className="text-white font-semibold text-sm break-words">{profissional.nome}</h3>
                          <Badge className={`${stats.rankColor} border mt-1`}>
                            <Award className="w-3 h-3 mr-1" />
                            {stats.rank}
                          </Badge>
                          <p className="text-gray-400 text-xs mt-1">{profissional.email}</p>
                          {!profissional.ativo && (
                            <span className="text-xs text-red-400 block mt-1">Inativo</span>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => verAgendaProfissional(profissional)}
                            className="text-[#D4AF37] hover:text-[#B8973D] h-8 w-8"
                            title="Ver Agenda"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(profissional)}
                            className="text-gray-400 hover:text-white h-8 w-8"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm('Deseja realmente excluir este profissional?')) {
                                deleteMutation.mutate(profissional.id);
                              }
                            }}
                            className="text-red-500 hover:text-red-600 h-8 w-8"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Estatísticas de Atendimentos */}
                      <div className="grid grid-cols-3 gap-2 mt-3">
                        <div className="bg-[#0a0a0a] p-1.5 rounded text-center">
                          <div className="flex items-center justify-center gap-1 text-gray-400 mb-0.5">
                            <Clock className="w-3 h-3" />
                          </div>
                          <div className="text-white font-semibold text-sm">{stats.total}</div>
                          <div className="text-gray-500 text-xs">Total</div>
                        </div>
                        <div className="bg-[#0a0a0a] p-1.5 rounded text-center">
                          <div className="flex items-center justify-center gap-1 text-green-400 mb-0.5">
                            <CheckCircle className="w-3 h-3" />
                          </div>
                          <div className="text-white font-semibold text-sm">{stats.concluidos}</div>
                          <div className="text-gray-500 text-xs">Realizados</div>
                        </div>
                        <div className="bg-[#0a0a0a] p-1.5 rounded text-center">
                          <div className="flex items-center justify-center gap-1 text-red-400 mb-0.5">
                            <XCircle className="w-3 h-3" />
                          </div>
                          <div className="text-white font-semibold text-sm">{stats.cancelados}</div>
                          <div className="text-gray-500 text-xs">Cancelados</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {profissional.historico_profissional && (
                    <p className="text-gray-400 text-sm mb-3 line-clamp-2 break-words">{profissional.historico_profissional}</p>
                  )}

                  <div className="pt-3 border-t border-[#2a2a2a]">
                    <p className="text-gray-400 text-xs mb-2">Serviços:</p>
                    <div className="flex flex-wrap gap-1">
                      {profissional.servicos_ids && profissional.servicos_ids.length > 0 ? (
                        profissional.servicos_ids.slice(0, 3).map((servicoId) => {
                          const servico = servicos.find(s => s.id === servicoId);
                          return servico ? (
                            <span key={servicoId} className="text-xs bg-[#D4AF37]/10 text-[#D4AF37] px-2 py-1 rounded">
                              {servico.nome}
                            </span>
                          ) : null;
                        })
                      ) : (
                        <span className="text-xs text-gray-500">Nenhum serviço</span>
                      )}
                      {profissional.servicos_ids && profissional.servicos_ids.length > 3 && (
                        <span className="text-xs text-gray-500">+{profissional.servicos_ids.length - 3}</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Dialog de Agenda */}
      <Dialog open={agendaDialogOpen} onOpenChange={setAgendaDialogOpen}>
        <DialogContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white max-w-5xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-[#D4AF37]" />
              Agenda de {profissionalSelecionado?.nome}
            </DialogTitle>
          </DialogHeader>
          
          {agendamentos.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              Nenhum agendamento encontrado
            </div>
          ) : (
            <div className="space-y-6">
              {Object.keys(agendamentosPorData).sort().reverse().map((data) => (
                <div key={data}>
                  <h3 className="text-lg font-semibold text-[#D4AF37] mb-3">
                   {data ? format(new Date(data + 'T12:00:00'), "EEEE, dd 'de' MMMM", { locale: ptBR }) : 'Data não disponível'}
                  </h3>
                  <div className="grid md:grid-cols-2 gap-3">
                   {agendamentosPorData[data].sort((a, b) => a.horario.localeCompare(b.horario)).map((agendamento) => {
                     const cliente = clientes.find(c => c.telefone === agendamento.cliente_telefone);
                     return (
                      <Card key={agendamento.id} className="bg-[#0a0a0a] border-[#2a2a2a]">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2 text-[#D4AF37]">
                              <span className="font-semibold">
                                {agendamento.horario}
                                {agendamento.horario_fim && ` - ${agendamento.horario_fim}`}
                              </span>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusColors[agendamento.status]}`}>
                              {agendamento.status}
                            </span>
                          </div>

                          <div className="flex gap-3 mb-3">
                            {cliente?.foto_url ? (
                              <img 
                                src={cliente.foto_url} 
                                alt={agendamento.cliente_nome}
                                className="w-12 h-12 rounded-full object-cover border-2 border-[#D4AF37]/30"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-[#D4AF37]/10 flex items-center justify-center border-2 border-[#D4AF37]/30">
                                <User className="w-6 h-6 text-[#D4AF37]" />
                              </div>
                            )}
                            <div className="flex-1 space-y-1">
                              <div className="text-white font-medium">{agendamento.cliente_nome}</div>
                              <div className="text-gray-400 text-sm">{agendamento.cliente_telefone}</div>
                              <div className="text-white text-sm">{agendamento.servico}</div>
                              {agendamento.duracao_total && (
                                <div className="text-[#D4AF37] text-xs">
                                  Duração: {agendamento.duracao_total} minutos
                                </div>
                              )}
                            </div>
                          </div>

                          {agendamento.observacoes && (
                            <p className="text-gray-400 text-xs border-t border-[#2a2a2a] pt-2 mb-3">
                              {agendamento.observacoes}
                            </p>
                          )}

                          <div className="flex gap-2">
                            {agendamento.status === 'pendente' && (
                              <>
                                <Button
                                  onClick={() => handleStatusChange(agendamento.id, 'confirmado')}
                                  size="sm"
                                  className="flex-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border border-blue-500/30"
                                >
                                  Confirmar
                                </Button>
                                <Button
                                  onClick={() => handleStatusChange(agendamento.id, 'cancelado')}
                                  size="sm"
                                  className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30"
                                >
                                  Cancelar
                                </Button>
                              </>
                            )}
                            {agendamento.status === 'confirmado' && (
                              <Button
                                onClick={() => handleStatusChange(agendamento.id, 'realizado')}
                                size="sm"
                                className="w-full bg-green-500/10 hover:bg-green-500/20 text-green-500 border border-green-500/30"
                              >
                                Marcar como Realizado
                              </Button>
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
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminProfissionais() {
  return (
    <AdminRoute>
      <AdminProfissionaisContent />
    </AdminRoute>
  );
}