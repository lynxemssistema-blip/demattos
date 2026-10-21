import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';

export default function AgendamentosFiltros({ 
  searchTerm, 
  setSearchTerm, 
  statusFilter, 
  setStatusFilter,
  servicoFilter,
  setServicoFilter,
  dataInicio,
  setDataInicio,
  dataFim,
  setDataFim,
  servicos = []
}) {
  const limparFiltros = () => {
    setSearchTerm('');
    setStatusFilter('todos');
    setServicoFilter('todos');
    setDataInicio('');
    setDataFim('');
  };

  const temFiltrosAtivos = searchTerm || statusFilter !== 'todos' || servicoFilter !== 'todos' || dataInicio || dataFim;

  const selectClass = "w-full h-12 md:h-9 rounded-md border border-[#2a2a2a] bg-[#1a1a1a] text-white text-[16px] md:text-sm px-3 focus:outline-none focus:border-[#D4AF37] appearance-none";
  const selectStyle = { colorScheme: 'dark', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' };

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
        {/* Busca por nome */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 sm:w-5 h-4 sm:h-5" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar cliente..."
            className="pl-9 sm:pl-10 bg-[#1a1a1a] border-[#2a2a2a] text-white touch-manipulation"
          />
        </div>

        {/* Status — select nativo (evita race condition do drawer mobile) */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={`${selectClass} sm:w-48`}
          style={selectStyle}
        >
          <option value="todos">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="confirmado">Confirmado</option>
          <option value="realizado">Realizado</option>
          <option value="cancelado">Cancelado</option>
        </select>

        {/* Serviço — select nativo */}
        <select
          value={servicoFilter}
          onChange={(e) => setServicoFilter(e.target.value)}
          className={`${selectClass} sm:w-48`}
          style={selectStyle}
        >
          <option value="todos">Todos os serviços</option>
          {(servicos || []).filter(s => s && s.id && s.nome).map((servico) => (
            <option key={servico.id} value={servico.nome}>{servico.nome}</option>
          ))}
        </select>
      </div>

      {/* Filtros de data */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
        <div className="flex-1">
          <Input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            placeholder="Data início"
            className="bg-[#1a1a1a] border-[#2a2a2a] text-white touch-manipulation [color-scheme:dark]"
          />
        </div>
        <div className="flex-1">
          <Input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            placeholder="Data fim"
            className="bg-[#1a1a1a] border-[#2a2a2a] text-white touch-manipulation [color-scheme:dark]"
          />
        </div>
        {temFiltrosAtivos && (
          <Button
            onClick={limparFiltros}
            variant="outline"
            className="border-[#2a2a2a] text-gray-400 hover:bg-[#1a1a1a] hover:text-white touch-manipulation"
          >
            <X className="w-4 h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Limpar</span>
          </Button>
        )}
      </div>
    </div>
  );
}