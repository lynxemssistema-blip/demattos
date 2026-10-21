import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

/**
 * Componente de header móvel unificado para subpáginas
 * Oferece navegação nativa com back button e suporta safe-area
 */
export default function MobileHeader({ title, onBackClick, showBack = true }) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBackClick) {
      onBackClick();
    } else {
      navigate(-1);
    }
  };

  return (
    <div 
      className="bg-[#111111] border-b border-[#2a2a2a] sticky top-0 z-40"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 sm:py-3">
        <div className="flex items-center gap-2">
          {showBack && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleBack}
              className="text-gray-400 hover:text-white flex-shrink-0 h-12 w-12 md:h-9 md:w-9 rounded-lg"
              style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation', minHeight: '44px', minWidth: '44px' }}
            >
              <ArrowLeft className="w-5 h-5 md:w-4 md:h-4" />
            </Button>
          )}
          <h1 
            className="text-base md:text-lg font-bold text-white truncate flex-1"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            {title}
          </h1>
        </div>
      </div>
    </div>
  );
}