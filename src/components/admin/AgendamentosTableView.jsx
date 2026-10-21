import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Trash2, Zap, User } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusColors = {
  pendente: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  confirmado: 'bg-blue-100 text-blue-800 border-blue-200',
  realizado: 'bg-green-100 text-green-800 border-green-200',
  cancelado: 'bg-red-100 text-red-800 border-red-200',
};

export default function AgendamentosTableView({ 
  agendamentos, 
  profissionais, 
  onUpdateStatus, 
  onDelete,
  onOpenDailyAgenda
}) {
  if (agendamentos.length === 0) {
    return (
      <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
        <CardContent className="py-12 text-center text-gray-400">
          Nenhum agendamento encontrado
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#2a2a2a]">
              <th className="text-left p-4 text-gray-400 font-medium">Data</th>
              <th className="text-left p-4 text-gray-400 font-medium">Horário</th>
              <th className="text-left p-4 text-gray-400 font-medium">Cliente</th>
              <th className="text-left p-4 text-gray-400 font-medium">Telefone</th>
              <th className="text-left p-4 text-gray-400 font-medium">Serviço</th>
              <th className="text-left p-4 text-gray-400 font-medium">Profissional</th>
              <th className="text-left p-4 text-gray-400 font-medium">Status</th>
              <th className="text-right p-4 text-gray-400 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {agendamentos.map((agendamento) => {
            if (!agendamento || !agendamento.id) return null;
            
            const profissional = profissionais.find(p => p.id === agendamento.profissional_id);
            
            let dataValida = true;
            let dataFormatada = 'Data não definida';
            try {
              if (agendamento.data) {
                dataFormatada = format(new Date(agendamento.data + 'T12:00:00Z'), "dd/MM/yyyy", { locale: ptBR });
              }
            } catch (e) {
              dataValida = false;
            }
            
            return (
              <tr key={agendamento.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a] transition-colors">
                <td className="p-4 text-white">
                  <button
                    onClick={() => onOpenDailyAgenda(agendamento.profissional_id, agendamento.data)}
                    className="hover:text-[#D4AF37] hover:underline transition-colors"
                  >
                    {dataFormatada}
                  </button>
                </td>
                <td className="p-4 text-white">
                  <button
                    onClick={() => onOpenDailyAgenda(agendamento.profissional_id, agendamento.data)}
                    className="hover:text-[#D4AF37] hover:underline transition-colors"
                  >
                    {agendamento.horario}
                  </button>
                </td>
                <td className="p-4 text-white">{agendamento.cliente_nome}</td>
                <td className="p-4 text-gray-400">{agendamento.cliente_telefone}</td>
                <td className="p-4 text-gray-400">{agendamento.servico}</td>
                <td className="p-4 text-white">{profissional?.nome || 'N/A'}</td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <Badge className={`${statusColors[agendamento.status]} border`}>
                      {agendamento.status}
                    </Badge>
                    {agendamento.status === 'confirmado' && agendamento.confirmado_automaticamente && (
                      <Tooltip>
                        <TooltipTrigger>
                          <Zap className="w-4 h-4 text-[#D4AF37]" />
                        </TooltipTrigger>
                        <TooltipContent className="bg-[#1a1a1a] border-[#D4AF37]/30">
                          <p className="text-xs">Confirmado automaticamente</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {agendamento.status === 'confirmado' && !agendamento.confirmado_automaticamente && (
                      <Tooltip>
                        <TooltipTrigger>
                          <User className="w-4 h-4 text-blue-400" />
                        </TooltipTrigger>
                        <TooltipContent className="bg-[#1a1a1a] border-blue-500/30">
                          <p className="text-xs">Confirmado manualmente</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex justify-end gap-2">
                    {agendamento.status === 'pendente' && (
                      <Button
                        onClick={() => onUpdateStatus(agendamento.id, 'confirmado')}
                        className="bg-[#D4AF37] hover:bg-[#B8973D] text-black font-semibold"
                        size="sm"
                      >
                        Confirmar
                      </Button>
                    )}
                    {agendamento.status === 'confirmado' && (
                      <Button
                        onClick={() => onUpdateStatus(agendamento.id, 'realizado')}
                        className="bg-[#D4AF37] hover:bg-[#B8973D] text-black font-semibold"
                        size="sm"
                      >
                        Finalizar
                      </Button>
                    )}
                    {agendamento.status !== 'cancelado' && agendamento.status !== 'realizado' && (
                      <Button
                        onClick={() => onUpdateStatus(agendamento.id, 'cancelado')}
                        variant="outline"
                        className="border-[#2a2a2a] text-gray-400 hover:bg-[#1a1a1a] hover:text-white"
                        size="sm"
                      >
                        Cancelar
                      </Button>
                    )}
                    <Button
                      onClick={() => onDelete(agendamento.id)}
                      variant="outline"
                      className="border-red-500/30 text-red-500 hover:bg-red-500/10"
                      size="sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
            })}
          </tbody>
        </table>
      </div>
    </TooltipProvider>
  );
}