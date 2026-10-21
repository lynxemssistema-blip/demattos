import React from 'react';

export function ResponsiveProfissionalPicker({ value, onValueChange, profissionais, placeholder = "Selecione um profissional", disabled = false }) {
  const ativos = profissionais ? profissionais.filter(prof => prof && prof.id && prof.nome && prof.ativo) : [];

  // ✅ CORREÇÃO #2 e #4: Interação mobile segura com touch-action e fallback
  const handleChange = (e) => {
    if (e.target.value) {
      onValueChange(e.target.value);
    }
  };

  const handlePointerDown = (e) => {
    // ✅ CORREÇÃO #4: Fallback para Safari iOS - garantir que o toque é processado
    e.stopPropagation();
  };

  return (
    <select
      value={value || ''}
      onChange={handleChange}
      onPointerDown={handlePointerDown}
      disabled={disabled || ativos.length === 0}
      className="w-full h-12 sm:h-11 rounded-md border border-[#2a2a2a] bg-[#0a0a0a] text-white text-base sm:text-sm px-3 focus:outline-none focus:border-[#D4AF37] disabled:opacity-50 disabled:cursor-not-allowed appearance-none touch-manipulation"
      style={{ 
        WebkitAppearance: 'none', 
        colorScheme: 'dark',
        cursor: 'pointer',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent'
      }}
    >
      <option value="" disabled>
        {ativos.length === 0 ? 'Carregando profissionais...' : placeholder}
      </option>
      {ativos.map(prof => (
        <option key={prof.id} value={prof.id}>{prof.nome}</option>
      ))}
    </select>
  );
}