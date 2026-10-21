import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { formatDateForInput, parseDateFromInput } from '@/lib/SafariCompat';

/**
 * Input de data com fallback para Safari
 * Detecta problemas com type="date" e oferece alternativas
 */
export default function SafeDateInput({ 
  value, 
  onChange, 
  min, 
  max, 
  disabled,
  className,
  ...props 
}) {
  const [displayMode, setDisplayMode] = useState('date'); // 'date' ou 'text'
  
  // Testa se o navegador suporta type="date" adequadamente
  useEffect(() => {
    const testInput = document.createElement('input');
    testInput.setAttribute('type', 'date');
    
    // Se o tipo não é reconhecido, usa fallback
    if (testInput.type !== 'date') {
      setDisplayMode('text');
    }
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    
    if (displayMode === 'text') {
      // Formato DD/MM/YYYY -> YYYY-MM-DD
      const regex = /(\d{2})\/(\d{2})\/(\d{4})/;
      const match = val.match(regex);
      
      if (match) {
        const [, day, month, year] = match;
        const formatted = `${year}-${month}-${day}`;
        onChange({ target: { value: formatted } });
      }
    } else {
      // type="date" nativo
      const formatted = parseDateFromInput(val);
      onChange({ target: { value: formatted } });
    }
  };

  const displayValue = displayMode === 'text' 
    ? value ? `${value.split('-').reverse().join('/')}` : ''
    : value;

  return (
    <Input
      type={displayMode === 'date' ? 'date' : 'text'}
      value={displayValue}
      onChange={handleChange}
      disabled={disabled}
      className={className}
      min={displayMode === 'date' ? min : undefined}
      max={displayMode === 'date' ? max : undefined}
      placeholder={displayMode === 'text' ? 'DD/MM/YYYY' : ''}
      {...props}
    />
  );
}