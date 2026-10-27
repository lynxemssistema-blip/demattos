import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/**
 * Header unificado para mobile que funciona em todas as sub-páginas
 * Exibe título, botão voltar e gerencia navegação
 */
export default function UnifiedMobileHeader({
  title,
  subtitle,
  showBackButton = true,
  onBackClick,
  rightAction,
  className = ''
}) {
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
      className={`bg-[#111111] border-b border-[#2a2a2a] sticky top-0 z-50 ${className}`}
      style={{ paddingTop: 'env(safe-area-inset-top, 0)' }}
    >
      <div className="px-4 py-4 flex items-center justify-between gap-3">
        {/* Left: Back Button */}
        {showBackButton && (
          <button
            onClick={handleBack}
            className="flex-shrink-0 p-2 -ml-2 text-gray-400 hover:text-white transition-colors touch-manipulation"
            style={{ WebkitTapHighlightColor: 'transparent' }}
            aria-label="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}

        {/* Center: Title */}
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-white truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-gray-400 truncate">
              {subtitle}
            </p>
          )}
        </div>

        {/* Right: Action Button */}
        {rightAction && (
          <div className="flex-shrink-0">
            {rightAction}
          </div>
        )}
      </div>
    </div>
  );
}