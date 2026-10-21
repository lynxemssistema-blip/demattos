import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, X, Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

function useIsMobileTouch() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768 && 'ontouchstart' in window);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

export function SearchableSelect({
  value,
  onValueChange,
  placeholder = 'Buscar...',
  items = [],
  displayKey = 'label',
  searchKeys = [displayKey],
  sortKey = displayKey,
  className = '',
  triggerClassName = '',
  contentClassName = '',
  disabled = false,
}) {
  const isMobile = useIsMobileTouch();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const filteredItems = useMemo(() => {
    let filtered = items;
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = items.filter(item =>
        searchKeys.some(key => {
          const val = item[key];
          return val && val.toString().toLowerCase().includes(searchLower);
        })
      );
    }
    return filtered.sort((a, b) => {
      const aVal = a[sortKey]?.toString() || '';
      const bVal = b[sortKey]?.toString() || '';
      return aVal.localeCompare(bVal, 'pt-BR');
    });
  }, [items, search, searchKeys, sortKey]);

  const selectedItem = items.find(
    item => String(item.id) === String(value) || String(item.value) === String(value)
  );
  const displayValue = selectedItem ? selectedItem[displayKey] : '';

  const handleSelect = (itemValue) => {
    if (onValueChange) onValueChange(itemValue);
    setOpen(false);
    setSearch('');
  };

  // ── MOBILE: Drawer próprio, sem depender do Select customizado ──
  if (isMobile) {
    return (
      <div className={`relative ${className}`}>
        {/* Trigger visual */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(true)}
          className={cn(
            "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-[#2a2a2a] bg-[#0a0a0a] px-3 py-2 text-sm shadow-sm",
            displayValue ? "text-white" : "text-muted-foreground",
            disabled && "opacity-50 cursor-not-allowed",
            triggerClassName
          )}
          style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
        >
          <span className="line-clamp-1">{displayValue || placeholder}</span>
          <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0" />
        </button>

        {/* Drawer mobile */}
        <Drawer open={open} onOpenChange={(o) => { if (!o) { setOpen(false); setSearch(''); } }}>
          <DrawerContent className="bg-[#1a1a1a] border-[#2a2a2a] max-h-[80vh]">
            <DrawerHeader>
              <DrawerTitle className="text-white text-center">Selecione uma opção</DrawerTitle>
            </DrawerHeader>

            {/* Campo de busca */}
            <div className="px-4 pb-2 border-b border-[#2a2a2a]">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Digite para buscar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus={false}
                  className="pl-8 pr-8 bg-[#0a0a0a] border-[#2a2a2a] text-white h-9 text-[16px]"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-2.5 text-gray-400 hover:text-white touch-manipulation"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Lista de itens */}
            <div className="px-4 overflow-y-auto max-h-[55vh] safe-area-bottom pb-4">
              {filteredItems.length === 0 ? (
                <div className="p-4 text-center text-gray-400 text-sm">
                  Nenhum resultado encontrado
                </div>
              ) : (
                filteredItems.map((item) => {
                  const itemVal = String(item.id || item.value);
                  const isSelected = String(value) === itemVal;
                  return (
                    <button
                      key={itemVal}
                      type="button"
                      onClick={() => handleSelect(itemVal)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-4 py-3.5 text-sm transition-colors mb-1",
                        isSelected
                          ? "bg-[#D4AF37]/20 text-[#D4AF37]"
                          : "text-white hover:bg-[#2a2a2a]"
                      )}
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                      <span>{item[displayKey]}</span>
                      {isSelected && <Check className="h-4 w-4 flex-shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    );
  }

  // ── DESKTOP: Select com dropdown e campo de busca ──
  return (
    <div className={`relative ${className}`}>
      <Select value={value} onValueChange={onValueChange} open={open} onOpenChange={setOpen}>
        <SelectTrigger
          className={`bg-[#0a0a0a] border-[#2a2a2a] text-white ${triggerClassName}`}
          disabled={disabled}
        >
          <SelectValue placeholder={placeholder}>
            {displayValue || undefined}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className={`bg-[#1a1a1a] border-[#2a2a2a] max-h-[60vh] ${contentClassName}`}>
          <div className="sticky top-0 bg-[#1a1a1a] p-2 border-b border-[#2a2a2a] z-10">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Digite para buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="pl-8 pr-8 bg-[#0a0a0a] border-[#2a2a2a] text-white h-9 text-sm"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-2.5 text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {filteredItems.length === 0 ? (
            <div className="p-4 text-center text-gray-400 text-sm">
              Nenhum resultado encontrado
            </div>
          ) : (
            filteredItems.map((item) => (
              <SelectItem
                key={item.id || item.value}
                value={String(item.id || item.value)}
                className="text-white"
              >
                {item[displayKey]}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

export default SearchableSelect;