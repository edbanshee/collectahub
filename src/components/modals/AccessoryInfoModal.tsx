import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Edit2,
  Calendar,
  Tag,
  Star,
  Laptop,
  Maximize2,
} from 'lucide-react';
import { Accessory } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { ImageViewerModal } from './ImageViewerModal';
import { getRatingConfig, getSafeRating } from '../../utils/ratingColors';

interface AccessoryInfoModalProps {
  isOpen: boolean;
  accessory: Accessory | null;
  onClose: () => void;
  onEdit?: (accessory: Accessory) => void;
}

export const AccessoryInfoModal: React.FC<AccessoryInfoModalProps> = ({
  isOpen,
  accessory,
  onClose,
  onEdit,
}) => {
  const { t, language } = useLanguage();
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);

  if (!isOpen || !accessory) return null;

  const normalizedImageUrl = accessory.imageUrl?.trim()
    ? /^(https?:\/\/|data:|\/)/i.test(accessory.imageUrl.trim())
      ? accessory.imageUrl.trim()
      : `https://${accessory.imageUrl.trim()}`
    : '';

  const safeRating = getSafeRating(accessory.rating, 5);
  const ratingConfig = getRatingConfig(safeRating);
  const ratingMeaning = ratingConfig.label[language] || ratingConfig.label.es;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#18181c] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#27272b] my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-[#27272b] bg-slate-50/50 dark:bg-[#202024]/40">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800/60 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                <span className="inline-block px-2 py-0.5 rounded-lg text-[10px] font-normal bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                  {accessory.category}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-normal border ${ratingConfig.badgeBg} ${ratingConfig.badgeBorder} ${ratingConfig.textColor}`}
                >
                  <span className="opacity-90">
                    {language === 'es' ? 'Estado' : 'Condition'}
                  </span>
                  <Star className={`w-3 h-3 ${ratingConfig.starColor}`} />
                  <span className="font-semibold">{safeRating}</span>
                </span>
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-[#f4f4f5] truncate">
                {accessory.name}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-[#f4f4f5] rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Hero Image */}
          {normalizedImageUrl && (
            <div
              onClick={() => setIsImageViewerOpen(true)}
              className="group relative w-full h-44 rounded-xl overflow-hidden border border-slate-200 dark:border-[#27272b] bg-slate-950/40 shadow-inner cursor-zoom-in transition-transform"
              title={language === 'es' ? 'Haz clic para ver la imagen en pantalla completa' : 'Click to view image in full screen'}
            >
              <img
                src={normalizedImageUrl}
                alt={accessory.name}
                className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center pointer-events-none">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-xs text-white px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-lg">
                  <Maximize2 className="w-3.5 h-3.5 text-purple-400" />
                  <span>{language === 'es' ? 'Ver en pantalla completa' : 'View full screen'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Key Properties Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Physical Condition Rating */}
            <div className={`p-3 rounded-xl border ${ratingConfig.badgeBg} ${ratingConfig.badgeBorder}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-[#a1a1aa]">
                  {t('accessoryPhysicalCondition')}
                </span>
                <span className={`text-xs font-bold font-sans ${ratingConfig.textColor}`}>
                  {ratingMeaning}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        safeRating >= star
                          ? `${ratingConfig.starColor} drop-shadow-xs`
                          : 'text-slate-300 dark:text-[#383840]'
                      }`}
                    />
                  ))}
                </div>
                <span className={`text-xs font-mono font-bold ${ratingConfig.textColor}`}>
                  {safeRating} / 5
                </span>
              </div>
            </div>

            {/* Assigned Device */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#202024] border border-slate-200/80 dark:border-[#27272b]">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-[#a1a1aa] block mb-1">
                {t('accessoryDevice')}
              </span>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-[#f4f4f5]">
                <Laptop className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                <span className="truncate">
                  {accessory.device ? accessory.device : t('accessoryUnassigned')}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          {accessory.description && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#202024] border border-slate-200/80 dark:border-[#27272b]">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-[#a1a1aa] block mb-1">
                {t('accessoryDescription')}
              </span>
              <p className="text-xs text-slate-700 dark:text-[#d4d4d8] leading-relaxed whitespace-pre-wrap">
                {accessory.description}
              </p>
            </div>
          )}

          {/* Tags */}
          {accessory.tags && accessory.tags.length > 0 && (
            <div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-[#a1a1aa] block mb-1.5">
                {t('accessoryTags')}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {accessory.tags.map((tg) => (
                  <span
                    key={tg}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                  >
                    #{tg}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-[#27272b] bg-slate-50/50 dark:bg-[#202024]/40">
          {onEdit ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(accessory);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>{language === 'es' ? 'Editar Accesorio' : 'Edit Accessory'}</span>
            </button>
          ) : <div />}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-[#a1a1aa] hover:bg-slate-200 dark:hover:bg-[#26262b] rounded-xl transition-colors cursor-pointer"
          >
            {t('btnClose')}
          </button>
        </div>
      </div>

      {/* Fullscreen Image Lightbox Modal */}
      <ImageViewerModal
        isOpen={isImageViewerOpen}
        imageUrl={normalizedImageUrl || null}
        title={accessory.name}
        onClose={() => setIsImageViewerOpen(false)}
      />
    </div>
  );
};
