import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResponsiveProfissionalPicker } from '../ResponsiveProfissionalPicker';


export function AgendamentoFormFields({
  formData,
  setFormData,
  profissionais,
  servicos,
  horariosDisponiveis,
  loadingHorarios,
  usuarioLogado,
  clienteExistente,
  verificandoCliente,
  userInteractedRef,
  onRefreshHorarios,
}) {
  return (
    <>
      {/* Nome + WhatsApp lado a lado no mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
        <div>
          <label className="text-white text-sm sm:text-xs font-medium mb-2 sm:mb-1.5 block">Nome Completo *</label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Seu nome"
            required
            disabled={!!usuarioLogado}
            className="bg-[#0a0a0a] border-[#2a2a2a] text-white placeholder:text-gray-500 focus:border-[#D4AF37] disabled:opacity-60 h-12 sm:h-10 text-base sm:text-sm"
          />
        </div>
        <div>
          <label className="text-white text-sm sm:text-xs font-medium mb-2 sm:mb-1.5 block">WhatsApp *</label>
          <Input
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            placeholder="(31) 99999-9999"
            required
            disabled={!!usuarioLogado}
            className="bg-[#0a0a0a] border-[#2a2a2a] text-white placeholder:text-gray-500 focus:border-[#D4AF37] disabled:opacity-60 h-12 sm:h-10 text-base sm:text-sm"
          />
          {verificandoCliente && (
            <p className="text-xs text-gray-400 mt-1.5">Verificando...</p>
          )}
          {clienteExistente && !usuarioLogado && (
            <p className="text-xs text-green-400 mt-1.5">✓ Cliente cadastrado</p>
          )}
          {!clienteExistente && formData.phone.length >= 10 && !verificandoCliente && !usuarioLogado && (
            <p className="text-xs text-blue-400 mt-1.5">Novo cliente</p>
          )}
        </div>
      </div>

      {/* Email */}
      <div>
        <label className="text-white text-sm sm:text-xs font-medium mb-2 sm:mb-1.5 block">E-mail *</label>
        <Input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          placeholder="seu@email.com"
          required
          disabled={!!usuarioLogado}
          className="bg-[#0a0a0a] border-[#2a2a2a] text-white placeholder:text-gray-500 focus:border-[#D4AF37] disabled:opacity-60 h-12 sm:h-10 text-base sm:text-sm"
        />
      </div>

      {/* Profissional */}
      <div>
        <label className="text-white text-sm sm:text-xs font-medium mb-2 sm:mb-1.5 block">Profissional *</label>
        <ResponsiveProfissionalPicker
          value={formData.profissional_id}
          onValueChange={(value) => {
            if (userInteractedRef) {
              userInteractedRef.current = true; // ⚡ Marcar que usuário interagiu
            }
            setFormData(prev => ({
              ...prev,
              profissional_id: value,
              horario: ''
            }));
          }}
          profissionais={profissionais}
          placeholder="Selecione um profissional"
        />
      </div>

      {/* Serviços */}
      <div>
        <label className="text-white text-sm sm:text-xs font-medium mb-2 sm:mb-1.5 block">Serviços Desejados *</label>
        <div className="space-y-2 sm:space-y-1.5 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-3 max-h-56 sm:max-h-44 overflow-y-auto">
          {servicos && servicos.length > 0 && servicos.filter(serv => serv && serv.id).map(serv => (
            <div
              key={serv.id}
              onClick={() => {
                const isSelected = formData.servicos_ids.includes(serv.id);
                setFormData(prev => ({
                  ...prev,
                  servicos_ids: isSelected
                    ? prev.servicos_ids.filter(id => id !== serv.id)
                    : [...prev.servicos_ids, serv.id]
                }));
              }}
              className={`flex items-center gap-3 p-3 sm:p-2.5 rounded-lg cursor-pointer transition-colors min-h-[44px] sm:min-h-auto ${
                formData.servicos_ids.includes(serv.id)
                  ? 'bg-[#D4AF37]/10 border border-[#D4AF37]/30'
                  : 'bg-[#1a1a1a] hover:bg-[#1a1a1a]/80 border border-transparent'
              }`}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <div className={`w-5 h-5 sm:w-4 sm:h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                formData.servicos_ids.includes(serv.id) ? 'bg-[#D4AF37] border-[#D4AF37]' : 'bg-[#0a0a0a] border-[#2a2a2a]'
              }`}>
                {formData.servicos_ids.includes(serv.id) && (
                  <svg className="w-3 h-3 sm:w-2.5 sm:h-2.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div className="flex-1 pointer-events-none min-w-0">
                <div className="text-white font-medium text-sm sm:text-sm truncate">{serv.nome}</div>
                <div className="text-[#D4AF37] text-xs">{serv.duracao} min • R$ {(Number(serv.preco) || 0).toFixed(2)}</div>
              </div>
            </div>
          ))}
        </div>
        {formData.servicos_ids.length > 0 && (
          <div className="mt-2 sm:mt-1.5 text-xs text-gray-400">{formData.servicos_ids.length} serviço(s) selecionado(s)</div>
        )}
      </div>

      {/* Data e Horário */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-white text-sm sm:text-xs font-medium mb-2 sm:mb-1.5 block">Data *</label>
          <Input
            type="date"
            value={formData.data || ''}
            onChange={(e) => {
              setFormData(prev => ({ ...prev, data: e.target.value, horario: '' }));
            }}
            min={new Date().toISOString().split('T')[0]}
            required
            disabled={!formData.profissional_id}
            className="bg-[#0a0a0a] border-[#2a2a2a] text-white focus:border-[#D4AF37] h-12 sm:h-10 text-base sm:text-sm [color-scheme:dark]"
          />
        </div>

        <div>
          <label className="text-white text-sm sm:text-xs font-medium mb-2 sm:mb-1.5 block">Horário *</label>
          {/* Select nativo — funciona perfeitamente no iOS Safari */}
          <select
            value={formData.horario || ''}
            onChange={(e) => {
              const value = e.target.value;
              if (value) setFormData(prev => ({ ...prev, horario: value }));
            }}
            disabled={!formData.profissional_id || !formData.data || loadingHorarios}
            className="w-full h-12 sm:h-10 rounded-md border border-[#2a2a2a] bg-[#0a0a0a] text-white text-[16px] sm:text-sm px-3 focus:outline-none focus:border-[#D4AF37] disabled:opacity-50 disabled:cursor-not-allowed appearance-none touch-manipulation"
            style={{ WebkitAppearance: 'none', colorScheme: 'dark', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
          >
            <option value="" disabled>
              {loadingHorarios ? 'Carregando...' :
               !formData.profissional_id ? 'Selecione prof.' :
               !formData.data ? 'Selecione data' :
               horariosDisponiveis.length === 0 ? 'Sem horários' :
               'Escolha o horário'}
            </option>
            {horariosDisponiveis.filter(h => h && h.horario).map((h, i) => (
              <option key={`${h.horario}-${i}`} value={h.horario}>{h.horario}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Observação */}
      <div>
        <label className="text-white text-sm sm:text-xs font-medium mb-2 sm:mb-1.5 block">Observação (opcional)</label>
        <Textarea
          value={formData.message}
          onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
          placeholder="Alguma preferência?"
          rows={3}
          className="bg-[#0a0a0a] border-[#2a2a2a] text-white placeholder:text-gray-500 focus:border-[#D4AF37] resize-none text-base sm:text-sm"
        />
      </div>

      {/* Senha Canal (novos clientes) */}
      {!clienteExistente && !usuarioLogado && formData.phone.length >= 10 && (
        <div>
          <label className="text-white text-sm sm:text-xs font-medium mb-2 sm:mb-1.5 block">Senha do Canal DeMattos *</label>
          <Input
            type="password"
            value={formData.senhaCanal}
            onChange={(e) => setFormData(prev => ({ ...prev, senhaCanal: e.target.value }))}
            placeholder="Mínimo 6 caracteres"
            required
            className="bg-[#0a0a0a] border-[#2a2a2a] text-white placeholder:text-gray-500 focus:border-[#D4AF37] h-12 sm:h-10 text-base sm:text-sm"
          />
          <p className="text-xs text-gray-400 mt-1.5">Senha para acessar seu Canal DeMattos</p>
        </div>
      )}
    </>
  );
}