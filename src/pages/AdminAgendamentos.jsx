import React, { useState, useMemo, Fragment } from 'react';
import { base44 } from '@/api/base44Client';
import AdminRoute from '@/components/auth/AdminRoute';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, List, Table, Calendar, Plus, Eye, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import AgendamentosFiltros from '@/components/admin/AgendamentosFiltros';
import AgendamentosListView from '@/components/admin/AgendamentosListView';
import AgendamentosTableView from '@/components/admin/AgendamentosTableView';
import AgendamentosCalendarView from '@/components/admin/AgendamentosCalendarView';
import AgendamentoForm from '@/components/AgendamentoForm';
import AgendamentosDailyAgendaModal from '@/components/admin/AgendamentosDailyAgendaModal';
import { isValidSafariDate, createSafariDate } from '@/lib/SafariCompat';

function AdminAgendamentosContent() {
  const [viewMode, setViewMode] = useState(() => {
    const saved = localStorage.getItem('agendamentosViewMode');
    return saved || 'list';
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [servicoFilter, setServicoFilter] = useState('todos');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [confirmDialog, setConfirmDialog] = useState({ open: false, agendamentoId: null, action: null });
  const [novoAgendamentoOpen, setNovoAgendamentoOpen] = useState(false);
  const [dailyAgendaModal, setDailyAgendaModal] = useState({ open: false, profissionalId: null, data: null });
  const [viewAgendaDialog, setViewAgendaDialog] = useState(false);
  const [selectedProfForView, setSelectedProfForView] = useState('');
  const [selectedDateForView, setSelectedDateForView] = useState('');
  const [dateError, setDateError] = useState(null); // ✅ CORREÇÃO #4: Debug de silêncio
  const queryClient = useQueryClient();

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    localStorage.setItem('agendamentosViewMode', mode);
  };

  const { data: agendamentosData = [], isLoading } = useQuery({
    queryKey: ['agendamentos', dataInicio],
    queryFn: async () => {
      try {
        const response = await base44.functions.invoke('getAdminAgendamentos', { dataInicio });
        const result = response?.data;
        if (result && result.success && Array.isArray(result.agendamentos)) {
          return result.agendamentos;
        }
        return [];
      } catch (error) {
        console.error('Erro ao buscar agendamentos:', error);
        return [];
      }
    },
    retry: 2,
    retryDelay: 1000,
  });

  // ✅ GUARD: Garantir array sempre inicializado
  const agendamentos = Array.isArray(agendamentosData) ? agendamentosData : [];

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: async () => {
      try {
        const result = await base44.entities.Cliente.list();
        return Array.isArray(result) ? result : [];
      } catch (error) {
        console.error('Erro ao buscar clientes:', error);
        return [];
      }
    },
  });

  const { data: profissionais = [] } = useQuery({
    queryKey: ['profissionais'],
    queryFn: async () => {
      try {
        const result = await base44.entities.Profissional.list();
        return Array.isArray(result) ? result : [];
      } catch (error) {
        console.error('Erro ao buscar profissionais:', error);
        return [];
      }
    },
  });

  const { data: servicos = [] } = useQuery({
    queryKey: ['servicos'],
    queryFn: async () => {
      try {
        const result = await base44.entities.Servico.list();
        return Array.isArray(result) ? result : [];
      } catch (error) {
        console.error('Erro ao buscar serviços:', error);
        return [];
      }
    },
  });

  // ✅ REFATORAÇÃO CRÍTICA #1: Remover loop de updates do frontend
  // Agora apenas chama a função backend que centraliza a lógica
  const deleteAgendamentoMutation = useMutation({
    mutationFn: async (id) => {
      const response = await base44.functions.invoke('cancelarAgendamento', {
        agendamentoId: id
      });
      if (response?.data?.error) {
        throw new Error(response.data.error);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
      toast.success('Agendamento excluído com sucesso!');
    },
    onError: (error) => {
      // ✅ PROTEÇÃO: onError configurado para capturar falhas
      console.error('Erro ao deletar agendamento:', error);
      toast.error('Erro ao excluir agendamento');
    }
  });

  // ✅ REFATORAÇÃO CRÍTICA #1B: Remover loop de updates ao cancelar
  // Agora a lógica de liberação de horários é feita no backend
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      const response = await base44.functions.invoke('atualizarStatusAgendamento', {
        agendamentoId: id,
        novoStatus: status
      });
      if (response?.data?.error) {
        throw new Error(response.data.error);
      }
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
      if (data?.status === 'confirmado') {
        toast.success('Agendamento confirmado com sucesso!');
      } else {
        toast.success(`Agendamento atualizado para ${data?.status}`);
      }
    },
    onError: (error) => {
      // ✅ PROTEÇÃO: onError configurado para capturar falhas
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar agendamento');
    }
  });

  // ✅ REFATORAÇÃO: Filtrar e ordenar agendamentos com guards de segurança + normalização Safari
  const filteredAgendamentos = useMemo(() => {
    // ✅ GUARD #1: Garantir que agendamentos é um array
    if (!Array.isArray(agendamentos) || agendamentos.length === 0) {
      return [];
    }

    // ✅ CORREÇÃO #1: Validar datas para Safari antes de filtrar
    try {
      if (dataInicio && !isValidSafariDate(dataInicio)) {
        console.warn('Data início inválida para Safari:', dataInicio);
        setDateError('Data de início inválida');
        return [];
      }
      if (dataFim && !isValidSafariDate(dataFim)) {
        console.warn('Data fim inválida para Safari:', dataFim);
        setDateError('Data de fim inválida');
        return [];
      }
      setDateError(null); // Limpar erro se datas são válidas
    } catch (error) {
      console.error('Erro ao validar datas Safari:', error);
      setDateError('Erro ao processar datas');
      return [];
    }

    let filtered = (agendamentos || []).filter(ag => {
      // ✅ GUARD #2: Validar objeto agendamento completamente
      if (!ag || typeof ag !== 'object') return false;
      if (!ag.cliente_nome || !ag.cliente_telefone) return false;
      
      // Filtro de busca por nome (com optional chaining)
      const clienteNome = String(ag.cliente_nome || '').toLowerCase();
      const matchSearch = clienteNome.includes(searchTerm.toLowerCase());
      
      // Filtro de status
      let matchStatus = true;
      if (statusFilter !== 'todos') {
        matchStatus = ag.status === statusFilter;
      }
      
      // Filtro de serviço
      const matchServico = servicoFilter === 'todos' || ag.servico === servicoFilter;
      
      // Filtro de data
      let matchData = true;
      if (dataInicio || dataFim) {
        const agData = ag.data || '';
        if (dataInicio && agData < dataInicio) matchData = false;
        if (dataFim && agData > dataFim) matchData = false;
      }
      
      return matchSearch && matchStatus && matchServico && matchData;
    });

    // ✅ GUARD #3: Ordenação segura com fallbacks
    filtered.sort((a, b) => {
      const dataA = a?.data || '9999-12-31';
      const dataB = b?.data || '9999-12-31';
      
      if (!dataA || !dataB) return 0;
      const dateCompare = dataA.localeCompare(dataB);
      if (dateCompare !== 0) return dateCompare;
      
      // Se as datas são iguais, ordenar por horário
      const timeA = a?.horario || '00:00';
      const timeB = b?.horario || '00:00';
      return timeA.localeCompare(timeB);
    });

    return filtered;
  }, [agendamentos, searchTerm, statusFilter, servicoFilter, dataInicio, dataFim]);

  const handleUpdateStatus = (id, status) => {
    updateStatusMutation.mutate({ id, status });
  };

  const handleDelete = (id) => {
    setConfirmDialog({ open: true, agendamentoId: id, action: 'delete' });
  };

  const handleOpenDailyAgenda = (profissionalId, data) => {
    setDailyAgendaModal({ open: true, profissionalId, data });
  };

  const handleViewAgenda = () => {
    if (selectedProfForView && selectedDateForView) {
      setDailyAgendaModal({ open: true, profissionalId: selectedProfForView, data: selectedDateForView });
      setViewAgendaDialog(false);
      setSelectedProfForView('');
      setSelectedDateForView('');
    }
  };

  // ✅ CORREÇÃO #4: Early return com error boundary para prevenir tela branca
  if (isLoading && agendamentos.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#D4AF37]"></div>
          <p className="text-white mt-4">Carregando agendamentos...</p>
        </div>
      </div>
    );
  }

  // ✅ CORREÇÃO #4: Verificar se há erro de data e exibir mensagem
  if (dateError) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-red-300 font-semibold mb-2">Erro ao processar datas</h3>
              <p className="text-red-200 text-sm">{dateError}</p>
              <button
                onClick={() => {
                  setDateError(null);
                  setDataInicio('');
                  setDataFim('');
                }}
                className="mt-3 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded text-sm"
              >
                Limpar Filtros
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Fragment>
      <div className="min-h-screen bg-[#0a0a0a] pb-24 md:pb-0">
        {/* Header */}
        <div className="bg-[#111111] border-b border-[#2a2a2a] sticky top-0 z-40" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-4 flex-1">
               <Link to={createPageUrl('Admin')}>
                 <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white touch-manipulation">
                   <ArrowLeft className="w-5 h-5" />
                 </Button>
               </Link>
               <div className="min-w-0">
                 <h1 className="text-lg sm:text-2xl font-bold text-white truncate">Agendamentos</h1>
                 <p className="text-gray-400 text-xs sm:text-sm">Gerencie agendamentos</p>
               </div>
             </div>

             {/* Seletor de visualização - Responsivo Mobile */}
             <div className="flex gap-1 sm:gap-2 flex-wrap sm:flex-nowrap">
              <Dialog open={viewAgendaDialog} onOpenChange={setViewAgendaDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="border-[#2a2a2a] text-gray-400 hover:bg-[#1a1a1a]" size="sm">
                    <Eye className="w-4 h-4 mr-2" />
                    Ver Agenda
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white safe-area-bottom">
                   <DialogHeader>
                     <DialogTitle>Ver Agenda Diária</DialogTitle>
                   </DialogHeader>
                   <div className="space-y-4 py-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Profissional</label>
                      <div className="relative">
                        <select
                          value={String(selectedProfForView)}
                          onChange={(e) => setSelectedProfForView(e.target.value)}
                          className="w-full h-10 rounded-md border border-[#2a2a2a] bg-[#0a0a0a] text-white text-[16px] px-3 pr-8 focus:outline-none focus:border-[#D4AF37] appearance-none touch-manipulation"
                          style={{ WebkitAppearance: 'none', colorScheme: 'dark' }}
                        >
                          <option value="" disabled>Selecione o profissional</option>
                          {(profissionais || []).map((prof) => (
                            <option key={String(prof.id)} value={String(prof.id)}>
                              {prof.nome || 'Sem nome'}
                            </option>
                          ))}
                        </select>
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">▾</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Data</label>
                      <Input
                       type="date"
                       value={selectedDateForView}
                       onChange={(e) => setSelectedDateForView(e.target.value)}
                       className="bg-[#0a0a0a] border-[#2a2a2a] text-white [color-scheme:dark]"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                     onClick={handleViewAgenda}
                     disabled={!selectedProfForView || !selectedDateForView}
                     className="bg-[#D4AF37] hover:bg-[#B8973D] text-black touch-manipulation"
                    >
                      Ver Agenda
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Dialog open={novoAgendamentoOpen} onOpenChange={setNovoAgendamentoOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-[#D4AF37] text-black hover:bg-[#B8973D]" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Agendamento
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Novo Agendamento</DialogTitle>
                  </DialogHeader>
                  <AgendamentoForm
                    isAdmin={true}
                    onSuccess={() => {
                      queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
                      setNovoAgendamentoOpen(false);
                      toast.success('Agendamento criado com sucesso!');
                    }}
                  />
                </DialogContent>
              </Dialog>
              <Button
                onClick={() => handleViewModeChange('list')}
                variant={viewMode === 'list' ? 'default' : 'outline'}
                className={`touch-manipulation ${viewMode === 'list' ? 'bg-[#D4AF37] text-black hover:bg-[#B8973D]' : 'border-[#2a2a2a] text-gray-400 hover:bg-[#1a1a1a]'}`}
                size="sm"
              >
                <List className="w-4 h-4 mr-2" />
                Lista
              </Button>
              <Button
                onClick={() => handleViewModeChange('table')}
                variant={viewMode === 'table' ? 'default' : 'outline'}
                className={`touch-manipulation ${viewMode === 'table' ? 'bg-[#D4AF37] text-black hover:bg-[#B8973D]' : 'border-[#2a2a2a] text-gray-400 hover:bg-[#1a1a1a]'}`}
                size="sm"
              >
                <Table className="w-4 h-4 mr-2" />
                Tabela
              </Button>
              <Button
                onClick={() => handleViewModeChange('calendar')}
                variant={viewMode === 'calendar' ? 'default' : 'outline'}
                className={`touch-manipulation ${viewMode === 'calendar' ? 'bg-[#D4AF37] text-black hover:bg-[#B8973D]' : 'border-[#2a2a2a] text-gray-400 hover:bg-[#1a1a1a]'}`}
                size="sm"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Calendário
              </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
          <AgendamentosFiltros
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            servicoFilter={servicoFilter}
            setServicoFilter={setServicoFilter}
            dataInicio={dataInicio}
            setDataInicio={setDataInicio}
            dataFim={dataFim}
            setDataFim={setDataFim}
            servicos={servicos}
          />

          {/* Content */}
          <div className="mt-4 sm:mt-6">
            {!filteredAgendamentos || filteredAgendamentos.length === 0 ? (
              <div className="text-gray-400 text-center py-8 sm:py-12 border border-[#2a2a2a] rounded-lg">
                <p className="text-sm sm:text-base">Nenhum agendamento encontrado</p>
              </div>
            ) : (
              <>
                {viewMode === 'list' && (
                  <AgendamentosListView
                    agendamentos={filteredAgendamentos || []}
                    clientes={clientes || []}
                    profissionais={profissionais || []}
                    onUpdateStatus={handleUpdateStatus}
                    onDelete={handleDelete}
                    onOpenDailyAgenda={handleOpenDailyAgenda}
                  />
                )}
                {viewMode === 'table' && (
                  <AgendamentosTableView
                    agendamentos={filteredAgendamentos || []}
                    profissionais={profissionais || []}
                    onUpdateStatus={handleUpdateStatus}
                    onDelete={handleDelete}
                    onOpenDailyAgenda={handleOpenDailyAgenda}
                  />
                )}
                {viewMode === 'calendar' && (
                  <AgendamentosCalendarView
                    agendamentos={filteredAgendamentos || []}
                    profissionais={profissionais || []}
                    onUpdateStatus={handleUpdateStatus}
                    onDelete={handleDelete}
                    onOpenDailyAgenda={handleOpenDailyAgenda}
                  />
                )}
              </>
            )}
          </div>
        </div>

        {/* Confirm Dialog */}
        <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
          <DialogContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
            <DialogHeader>
              <DialogTitle>Confirmar Exclusão</DialogTitle>
              <DialogDescription className="text-gray-400">
                Deseja realmente excluir este agendamento? Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0 safe-area-bottom">
              <Button
                variant="outline"
                onClick={() => setConfirmDialog({ open: false, agendamentoId: null, action: null })}
                className="touch-manipulation border-[#2a2a2a] text-gray-400 hover:bg-[#0a0a0a]"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (confirmDialog.action === 'delete') {
                    deleteAgendamentoMutation.mutate(confirmDialog.agendamentoId);
                  }
                  setConfirmDialog({ open: false, agendamentoId: null, action: null });
                }}
                className="touch-manipulation bg-red-500 hover:bg-red-600 text-white"
              >
                Excluir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Daily Agenda Modal */}
        <AgendamentosDailyAgendaModal
          open={dailyAgendaModal.open}
          onOpenChange={(open) => setDailyAgendaModal({ ...dailyAgendaModal, open })}
          profissionalId={dailyAgendaModal.profissionalId}
          data={dailyAgendaModal.data}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
          }}
        />
      </div>
    </Fragment>
  );
}

export default function AdminAgendamentos() {
  return (
    <AdminRoute>
      <AdminAgendamentosContent />
    </AdminRoute>
  );
}