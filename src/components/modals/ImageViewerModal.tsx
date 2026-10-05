import React, { useEffect } from 'react';
import { X, Maximize2, ZoomIn } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface ImageViewerModalProps {
  isOpen: boolean;
  imageUrl: string | null;
  title?: string;
  onClose: () => void;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  isOpen,
  imageUrl,
  title,
  onClose,
}) => {
  const { language } = useLanguage();

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-3 sm:p-6 bg-slate-950/92 backdrop-blur-lg animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Top Bar with Title & Close Button */}
      <div
        className="w-full max-w-5xl flex items-center justify-between gap-4 py-2 px-3 mb-2 text-white/90 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Maximize2 className="w-4 h-4 text-purple-400 shrink-0" />
          <span className="text-sm sm:text-base font-bold truncate">
            {title || (language === 'es' ? 'Visualizador de Imagen' : 'Image Viewer')}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-block text-xs text-white/50 font-mono">
            {language === 'es' ? 'Presiona Esc para cerrar' : 'Press Esc to close'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
            title={language === 'es' ? 'Cerrar (Esc)' : 'Close (Esc)'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Image Container */}
      <div
        className="relative max-w-5xl max-h-[85vh] flex items-center justify-center overflow-hidden rounded-2xl border border-white/10 shadow-2xl bg-black/40"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={imageUrl}
          alt={title || 'Full screen preview'}
          className="max-w-full max-h-[80vh] sm:max-h-[84vh] object-contain select-none rounded-xl"
        />
      </div>
    </div>
  );
};
