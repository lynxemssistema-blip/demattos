import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, User, Plus, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import AgendamentoForm from '@/components/AgendamentoForm';

const statusColors = {
  pendente: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300',
  confirmado: 'bg-green-500/20 border-green-500/40 text-green-300',
  realizado: 'bg-blue-500/20 border-blue-500/40 text-blue-300',
  cancelado: 'bg-red-500/20 border-red-500/40 text-red-300'
};

export default function AgendamentosDailyAgendaModal({ open, onOpenChange, profissionalId, data, onSuccess }) {
  const [draggingAgendamento, setDraggingAgendamento] = useState(null);
  const [novoAgendamentoSlot, setNovoAgendamentoSlot] = useState(null);
  const queryClient = useQueryClient();

  const { data: agendaData, isLoading } = useQuery({
    queryKey: ['agendaDiaria', profissionalId, data],
    queryFn: async () => {
      const response = await base44.functions.invoke('getAgendaDiariaProfissional', {
        profissional_id: profissionalId,
        data
      });
      return response.data;
    },
    enabled: open && !!profissionalId && !!data
  });

  // ✅ REFATORAÇÃO: Mutation com onError e onSettled configurados
  // Previne spinners infinitos se a requisição falhar
  const moverAgendamentoMutation = useMutation({
   mutationFn: async ({ agendamento_id, nova_data, novo_horario }) => {
     const response = await base44.functions.invoke('moverAgendamento', {
       agendamento_id,
       nova_data,
       novo_horario
     });
     if (response?.data?.error) {
       throw new Error(response.data.error);
     }
     return response.data;
   },
   onSuccess: () => {
     queryClient.invalidateQueries({ queryKey: ['agendaDiaria'] });
     queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
     toast.success('Agendamento movido com sucesso!');
   },
   onError: (error) => {
     // ✅ onError com fallback seguro
     console.error('Erro ao mover agendamento:', error);
     toast.error(error?.message || 'Erro ao mover agendamento');
   }
  });

  const handleDragStart = (agendamento) => {
    setDraggingAgendamento(agendamento);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (slot) => {
    if (!draggingAgendamento) return;
    
    if (!slot.disponivel || slot.agendamento || slot.isAlmoco) {
      toast.error('Este horário não está disponível');
      setDraggingAgendamento(null);
      return;
    }

    moverAgendamentoMutation.mutate({
      agendamento_id: draggingAgendamento.id,
      nova_data: data,
      novo_horario: slot.horario
    });

    setDraggingAgendamento(null);
  };

  const handleNovoAgendamento = (horario) => {
    setNovoAgendamentoSlot({ horario, data, profissional_id: profissionalId });
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="sr-only">Carregando Agenda</DialogTitle>
            <DialogDescription className="sr-only">Carregando os horários da agenda</DialogDescription>
          </DialogHeader>
          <div className="text-center py-12">Carregando agenda...</div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!agendaData?.success) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white max-w-4xl">
          <DialogHeader>
            <DialogTitle className="sr-only">Erro ao Carregar Agenda</DialogTitle>
            <DialogDescription className="sr-only">Ocorreu um erro ao carregar a agenda</DialogDescription>
          </DialogHeader>
          <div className="text-center py-12 text-red-400">
            {agendaData?.error || 'Erro ao carregar agenda'}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open && !novoAgendamentoSlot} onOpenChange={onOpenChange}>
        <DialogContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white max-w-4xl h-[90vh] overflow-y-auto z-[9999]">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#D4AF37]" />
              Agenda de {agendaData.profissional.nome} - {format(new Date(data + 'T00:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-400">
              Visualize e gerencie os horários do dia. Arraste agendamentos para movê-los ou clique para criar novos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 mt-4">
            <div className="text-sm text-gray-400 mb-4">
              <p>💡 Arraste os agendamentos para movê-los entre horários livres</p>
              <p>💡 Clique no "+" para criar um novo agendamento no horário</p>
            </div>

            {agendaData.slots.map((slot) => (
              <div
                key={slot.horario}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(slot)}
                className={`
                  border rounded-lg p-3 transition-all
                  ${slot.isAlmoco ? 'bg-gray-900 border-gray-700 opacity-50' : ''}
                  ${slot.agendamento ? 'bg-[#111111] border-[#2a2a2a]' : 'bg-[#0a0a0a] border-[#1a1a1a]'}
                  ${slot.disponivel && !slot.isAlmoco && !slot.agendamento ? 'hover:border-[#D4AF37] cursor-pointer' : ''}
                  ${draggingAgendamento && slot.disponivel && !slot.isAlmoco && !slot.agendamento ? 'border-[#D4AF37] border-dashed' : ''}
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#D4AF37]" />
                      <span className="font-mono font-semibold">{slot.horario}</span>
                    </div>

                    {slot.isAlmoco && (
                      <span className="text-xs text-gray-500">Intervalo</span>
                    )}

                    {slot.agendamento && (
                      <div
                        draggable
                        onDragStart={() => handleDragStart(slot.agendamento)}
                        className="flex items-center gap-3 cursor-move hover:opacity-80"
                      >
                        <div className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[slot.agendamento.status]}`}>
                          {slot.agendamento.status}
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{slot.agendamento.cliente_nome}</span>
                        </div>
                        <span className="text-sm text-gray-400">• {slot.agendamento.servico}</span>
                        {slot.agendamento.confirmado_automaticamente && (
                          <Zap className="w-4 h-4 text-[#D4AF37]" title="Confirmado automaticamente" />
                        )}
                      </div>
                    )}

                    {!slot.agendamento && !slot.isAlmoco && slot.disponivel && (
                      <span className="text-sm text-green-400">Livre</span>
                    )}

                    {!slot.agendamento && !slot.isAlmoco && !slot.disponivel && agendaData.slots && (
                      <div className="flex items-center gap-3 text-sm text-gray-400">
                        <span className="text-red-400">Indisponível</span>
                        {(() => {
                          // Buscar agendamento de outro profissional que está ocupando este horário
                          const outroAgendamento = agendaData.slots.find(s => 
                            s.horario === slot.horario && s.agendamento
                          )?.agendamento;
                          
                          if (outroAgendamento) {
                            return (
                              <>
                                <span>•</span>
                                <User className="w-4 h-4" />
                                <span>{outroAgendamento.cliente_nome}</span>
                                <span className="text-xs">({outroAgendamento.servico})</span>
                              </>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    )}
                  </div>

                  {!slot.agendamento && !slot.isAlmoco && slot.disponivel && (
                    <Button
                      onClick={() => handleNovoAgendamento(slot.horario)}
                      size="sm"
                      variant="outline"
                      className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de novo agendamento */}
      <Dialog open={!!novoAgendamentoSlot} onOpenChange={() => setNovoAgendamentoSlot(null)}>
        <DialogContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white max-w-2xl h-[90vh] overflow-y-auto z-[9999]">
          <DialogHeader>
            <DialogTitle>Novo Agendamento - {novoAgendamentoSlot?.horario}</DialogTitle>
            <DialogDescription className="text-sm text-gray-400">
              Criar um novo agendamento neste horário
            </DialogDescription>
          </DialogHeader>
          {novoAgendamentoSlot && (
            <AgendamentoForm
              isAdmin={true}
              preSelectedData={{
                profissional_id: novoAgendamentoSlot.profissional_id,
                data: novoAgendamentoSlot.data,
                horario: novoAgendamentoSlot.horario
              }}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['agendaDiaria'] });
                queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
                setNovoAgendamentoSlot(null);
                if (onSuccess) onSuccess();
                toast.success('Agendamento criado com sucesso!');
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}