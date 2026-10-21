import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { User, Phone, Calendar, Clock, Trash2, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatInTimeZone } from 'date-fns-tz';
import { createSafariDate, isValidSafariDate } from '@/lib/SafariCompat';

const statusColors = {
  pendente: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  confirmado: 'bg-blue-100 text-blue-800 border-blue-200',
  realizado: 'bg-green-100 text-green-800 border-green-200',
  cancelado: 'bg-red-100 text-red-800 border-red-200',
};

export default function AgendamentosListView({ 
  agendamentos, 
  clientes, 
  profissionais, 
  onUpdateStatus, 
  onDelete,
  onOpenDailyAgenda
}) {
  // ✅ CORREÇÃO #3: Memoizar para evitar re-renders excessivos em mobile
  const clientesMap = useMemo(() => {
    const map = {};
    (clientes || []).forEach(c => {
      if (c && c.telefone) map[c.telefone] = c;
    });
    return map;
  }, [clientes]);

  const profissionaisMap = useMemo(() => {
    const map = {};
    (profissionais || []).forEach(p => {
      if (p && p.id) map[p.id] = p;
    });
    return map;
  }, [profissionais]);

  if (agendamentos.length === 0) {
    return (
      <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
        <CardContent className="py-8 sm:py-12 text-center text-gray-400 text-sm">
          Nenhum agendamento encontrado
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-3 sm:space-y-4">
        {agendamentos.map((agendamento) => {
        if (!agendamento || !agendamento.id) return null;
        
        const cliente = clientesMap[agendamento.cliente_telefone];
        const profissional = profissionaisMap[agendamento.profissional_id];
        
        // ✅ CORREÇÃO #1: Usar SafariDate para validação
        const dataValida = isValidSafariDate(agendamento.data);
        const createdDateValida = agendamento.created_date && !isNaN(new Date(agendamento.created_date).getTime());
        
        return (
          <Card key={agendamento.id} className="bg-[#1a1a1a] border-[#2a2a2a]">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="flex gap-4 flex-1">
                  {/* Foto do Cliente */}
                  <div className="flex-shrink-0">
                    {cliente?.foto_url ? (
                      <img 
                        src={cliente.foto_url} 
                        alt={agendamento.cliente_nome}
                        className="w-24 h-32 md:w-28 md:h-36 rounded-lg object-cover border-2 border-[#D4AF37]/30"
                      />
                    ) : (
                      <div className="w-24 h-32 md:w-28 md:h-36 bg-[#D4AF37]/10 rounded-lg flex items-center justify-center border-2 border-[#D4AF37]/30">
                        <User className="w-12 h-12 text-[#D4AF37]" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 flex-1">
                     <div className="flex flex-col gap-3">
                       <span className="text-white font-semibold">{agendamento.cliente_nome}</span>
                       <div className="flex items-center gap-2 flex-wrap">
                         <Badge className={`${statusColors[agendamento.status]} border`}>
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
                               <p className="text-xs">Confirmado automaticamente pelo sistema</p>
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
                               <p className="text-xs">Confirmado manualmente por um administrador</p>
                             </TooltipContent>
                           </Tooltip>
                         )}
                       </div>
                     </div>
                  
                    <div className="grid sm:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-400">
                        <Phone className="w-4 h-4" />
                        {agendamento.cliente_telefone}
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <Calendar className="w-4 h-4" />
                        <button
                          onClick={() => onOpenDailyAgenda(agendamento.profissional_id, agendamento.data)}
                          className="hover:text-[#D4AF37] hover:underline transition-colors touch-manipulation text-xs sm:text-sm"
                        >
                          {agendamento.data && dataValida ? format(createSafariDate(agendamento.data), "dd 'de' MMM", { locale: ptBR }) : 'N/A'}
                        </button>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <Clock className="w-4 h-4" />
                        <button
                          onClick={() => onOpenDailyAgenda(agendamento.profissional_id, agendamento.data)}
                          className="hover:text-[#D4AF37] hover:underline transition-colors touch-manipulation text-xs sm:text-sm"
                        >
                          {agendamento.horario} - {agendamento.horario_fim || 'N/A'}
                        </button>
                      </div>
                      <div className="text-gray-400">
                        <span className="text-[#D4AF37]">Serviço:</span> {agendamento.servico}
                      </div>
                    </div>

                    {profissional && (
                      <div className="flex items-center gap-3 bg-[#0a0a0a] p-3 rounded-lg border border-[#2a2a2a]">
                        {profissional.foto_url ? (
                          <img 
                            src={profissional.foto_url} 
                            alt={profissional.nome}
                            className="w-10 h-10 rounded-full object-cover border-2 border-[#D4AF37]/30"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-[#D4AF37]/10 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-[#D4AF37]" />
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="text-white font-medium text-sm">{profissional.nome}</div>
                          {profissional.telefone && (
                            <div className="text-gray-400 text-xs flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3" />
                              {profissional.telefone}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="text-xs text-gray-500 mt-2">
                      Solicitado em: {agendamento.created_date && createdDateValida ? formatInTimeZone(
                        new Date(agendamento.created_date),
                        'America/Sao_Paulo',
                        'dd/MM/yyyy, HH:mm',
                        { locale: ptBR }
                      ) : 'Data não disponível'}
                    </div>

                    {agendamento.observacoes && (
                      <div className="text-gray-400 text-sm bg-[#0a0a0a] p-3 rounded">
                        <span className="text-[#D4AF37]">Obs:</span> {agendamento.observacoes}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap lg:flex-col gap-1 sm:gap-2">
                  {agendamento.status === 'pendente' && (
                    <Button
                      onClick={() => onUpdateStatus(agendamento.id, 'confirmado')}
                      className="bg-[#D4AF37] hover:bg-[#B8973D] text-black font-semibold text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2 touch-manipulation"
                      size="sm"
                    >
                      Confirmar
                    </Button>
                  )}
                  {agendamento.status === 'confirmado' && (
                    <Button
                      onClick={() => onUpdateStatus(agendamento.id, 'realizado')}
                      className="bg-[#D4AF37] hover:bg-[#B8973D] text-black font-semibold text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2 touch-manipulation"
                      size="sm"
                    >
                      Finalizar
                    </Button>
                  )}
                  {agendamento.status !== 'cancelado' && agendamento.status !== 'realizado' && (
                    <Button
                      onClick={() => onUpdateStatus(agendamento.id, 'cancelado')}
                      variant="outline"
                      className="border-[#2a2a2a] text-gray-400 hover:bg-[#1a1a1a] hover:text-white text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2 touch-manipulation"
                      size="sm"
                    >
                      Cancelar
                    </Button>
                  )}
                  <Button
                    onClick={() => onDelete(agendamento.id)}
                    variant="outline"
                    className="border-red-500/30 text-red-500 hover:bg-red-500/10 text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2 touch-manipulation"
                    size="sm"
                  >
                    <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 mr-0 sm:mr-1" />
                    <span className="hidden sm:inline">Excluir</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
        })}
      </div>
    </TooltipProvider>
  );
}