import React, { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronLeft, ChevronRight, Trash2, Zap, User } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { createSafariDate } from '@/lib/SafariCompat';

const statusColors = {
  pendente: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  confirmado: 'bg-blue-100 text-blue-800 border-blue-200',
  realizado: 'bg-green-100 text-green-800 border-green-200',
  cancelado: 'bg-red-100 text-red-800 border-red-200',
};

export default function AgendamentosCalendarView({ 
  agendamentos, 
  profissionais, 
  onUpdateStatus, 
  onDelete,
  onOpenDailyAgenda
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Agrupar agendamentos por data
  const agendamentosPorData = useMemo(() => {
    const grouped = {};
    agendamentos.forEach((ag) => {
      if (ag && ag.data) {
        const dateKey = ag.data;
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(ag);
      }
    });
    // Ordenar agendamentos dentro de cada dia por horário
    Object.keys(grouped).forEach(dateKey => {
      grouped[dateKey].sort((a, b) => {
        const timeA = a.horario || '00:00';
        const timeB = b.horario || '00:00';
        return timeA.localeCompare(timeB);
      });
    });
    return grouped;
  }, [agendamentos]);

  const handleDateClick = (date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const agendamentosNoDia = agendamentosPorData[dateKey] || [];
    
    if (agendamentosNoDia.length > 0) {
      setSelectedDate({ date, agendamentos: agendamentosNoDia });
      setDialogOpen(true);
    } else {
      // Dia sem agendamentos - abrir agenda diária do profissional
      const profAtivo = profissionais.find(p => p.ativo);
      if (profAtivo) {
        onOpenDailyAgenda(profAtivo.id, dateKey);
      } else if (profissionais.length > 0) {
        onOpenDailyAgenda(profissionais[0].id, dateKey);
      }
    }
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  // Calcular o primeiro dia da semana do mês
  const firstDayOfMonth = monthStart.getDay();
  const diasVazios = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Navegação do calendário */}
        <div className="flex items-center justify-between mb-4">
        <Button
          onClick={handlePreviousMonth}
          variant="outline"
          size="icon"
          className="border-[#2a2a2a] text-white hover:bg-[#1a1a1a] touch-manipulation"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-xl font-semibold text-white">
          {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
        </h2>
        <Button
          onClick={handleNextMonth}
          variant="outline"
          size="icon"
          className="border-[#2a2a2a] text-white hover:bg-[#1a1a1a] touch-manipulation"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Calendário */}
      <div className="grid grid-cols-7 gap-2">
        {/* Cabeçalho dos dias da semana */}
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dia) => (
          <div key={dia} className="text-center text-gray-400 font-medium py-2">
            {dia}
          </div>
        ))}

        {/* Dias vazios antes do início do mês */}
        {diasVazios.map((_, index) => (
          <div key={`empty-${index}`} className="aspect-square" />
        ))}

        {/* Dias do mês */}
        {daysInMonth.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const agendamentosNoDia = agendamentosPorData[dateKey] || [];
          const temAgendamentos = agendamentosNoDia.length > 0;
          const isToday = isSameDay(day, new Date());

          return (
            <button
              key={day.toISOString()}
              onClick={() => handleDateClick(day)}
              className={`
                aspect-square p-2 rounded-lg border transition-all cursor-pointer touch-manipulation
                ${temAgendamentos 
                  ? 'bg-[#D4AF37]/10 border-[#D4AF37]/30 hover:bg-[#D4AF37]/20' 
                  : 'bg-[#1a1a1a] border-[#2a2a2a] hover:bg-[#2a2a2a]/50'
                }
                ${isToday ? 'ring-2 ring-[#D4AF37]' : ''}
              `}
            >
              <div className="flex flex-col items-center justify-center h-full">
                <span className={`text-sm font-medium ${temAgendamentos ? 'text-white' : 'text-gray-400'}`}>
                  {format(day, 'd')}
                </span>
                {temAgendamentos && (
                  <span className="text-xs text-[#D4AF37] mt-1">
                    {agendamentosNoDia.length}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Dialog com detalhes dos agendamentos do dia */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedDate && format(createSafariDate(format(selectedDate.date, 'yyyy-MM-dd')), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4 safe-area-bottom pb-6">
            {selectedDate?.agendamentos.map((agendamento) => {
              const profissional = profissionais.find(p => p.id === agendamento.profissional_id);
              
              return (
                <Card key={agendamento.id} className="bg-[#0a0a0a] border-[#2a2a2a]">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-white font-semibold">{agendamento.cliente_nome}</span>
                          <Badge className={`${statusColors[agendamento.status]} border text-xs`}>
                            {agendamento.status}
                          </Badge>
                          {agendamento.status === 'confirmado' && agendamento.confirmado_automaticamente && (
                            <Tooltip>
                              <TooltipTrigger>
                                <div className="flex items-center gap-1 bg-[#D4AF37]/20 text-[#D4AF37] px-2 py-1 rounded text-xs border border-[#D4AF37]/30">
                                  <Zap className="w-3 h-3" />
                                  <span>Auto</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="bg-[#1a1a1a] border-[#D4AF37]/30">
                                <p className="text-xs">Confirmado automaticamente</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          {agendamento.status === 'confirmado' && !agendamento.confirmado_automaticamente && (
                            <Tooltip>
                              <TooltipTrigger>
                                <div className="flex items-center gap-1 bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-xs border border-blue-500/30">
                                  <User className="w-3 h-3" />
                                  <span>Manual</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="bg-[#1a1a1a] border-blue-500/30">
                                <p className="text-xs">Confirmado manualmente</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm text-gray-400">
                          <div>
                            <span className="text-[#D4AF37]">Horário:</span> {agendamento.horario} - {agendamento.horario_fim || 'N/A'}
                          </div>
                          <div>
                            <span className="text-[#D4AF37]">Telefone:</span> {agendamento.cliente_telefone}
                          </div>
                          <div>
                            <span className="text-[#D4AF37]">Serviço:</span> {agendamento.servico}
                          </div>
                          <div>
                            <span className="text-[#D4AF37]">Profissional:</span> {profissional?.nome || 'N/A'}
                          </div>
                        </div>
                        {agendamento.observacoes && (
                          <div className="text-sm text-gray-400 bg-[#1a1a1a] p-2 rounded">
                            <span className="text-[#D4AF37]">Obs:</span> {agendamento.observacoes}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        {agendamento.status === 'pendente' && (
                          <Button
                            onClick={() => {
                              onUpdateStatus(agendamento.id, 'confirmado');
                              setDialogOpen(false);
                            }}
                            className="bg-[#D4AF37] hover:bg-[#B8973D] text-black font-semibold"
                            size="sm"
                          >
                            Confirmar
                          </Button>
                        )}
                        {agendamento.status === 'confirmado' && (
                          <Button
                            onClick={() => {
                              onUpdateStatus(agendamento.id, 'realizado');
                              setDialogOpen(false);
                            }}
                            className="bg-[#D4AF37] hover:bg-[#B8973D] text-black font-semibold"
                            size="sm"
                          >
                            Finalizar
                          </Button>
                        )}
                        {agendamento.status !== 'cancelado' && agendamento.status !== 'realizado' && (
                          <Button
                            onClick={() => {
                              onUpdateStatus(agendamento.id, 'cancelado');
                              setDialogOpen(false);
                            }}
                            variant="outline"
                            className="border-[#2a2a2a] text-gray-400 hover:bg-[#1a1a1a] hover:text-white"
                            size="sm"
                          >
                            Cancelar
                          </Button>
                        )}
                        <Button
                          onClick={() => {
                            onDelete(agendamento.id);
                            setDialogOpen(false);
                          }}
                          variant="outline"
                          className="border-red-500/30 text-red-500 hover:bg-red-500/10"
                          size="sm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </TooltipProvider>
  );
}