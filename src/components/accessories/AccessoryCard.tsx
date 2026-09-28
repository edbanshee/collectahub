import React, { useState } from 'react';
import {
  Sparkles,
  Edit2,
  Trash2,
  Info,
  Star,
  Laptop,
} from 'lucide-react';
import { Accessory } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { AccessoryInfoModal } from '../modals/AccessoryInfoModal';
import { getRatingConfig, getSafeRating } from '../../utils/ratingColors';

interface AccessoryCardProps {
  accessory: Accessory;
  onEdit: (accessory: Accessory) => void;
  onDelete: (accessory: Accessory) => void;
}

export const AccessoryCard: React.FC<AccessoryCardProps> = ({
  accessory,
  onEdit,
  onDelete,
}) => {
  const { t, language } = useLanguage();
  const [showInfo, setShowInfo] = useState(false);

  const normalizedImageUrl = accessory.imageUrl?.trim()
    ? /^(https?:\/\/|data:|\/)/i.test(accessory.imageUrl.trim())
      ? accessory.imageUrl.trim()
      : `https://${accessory.imageUrl.trim()}`
    : '';

  const safeRating = getSafeRating(accessory.rating, 5);
  const ratingConfig = getRatingConfig(safeRating);

  return (
    <div className="flex flex-col bg-white dark:bg-[#18181c] rounded-2xl border border-slate-200 dark:border-[#27272b] shadow-xs hover:shadow-md transition-all overflow-hidden">
      {/* 1. Card Top Bar: Category Pill & Unified Estado Badge on Left, Actions on Right */}
      <div className="p-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-normal bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
            <span>{accessory.category}</span>
          </span>
          <div
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-normal ${ratingConfig.badgeBg} ${ratingConfig.badgeBorder} ${ratingConfig.textColor}`}
            title={`${language === 'es' ? 'Estado físico' : 'Physical condition'}: ${safeRating}/5 (${ratingConfig.label[language] || ratingConfig.label.es})`}
          >
            <span className="opacity-90">
              {language === 'es' ? 'Estado' : 'Condition'}
            </span>
            <Star className={`w-3 h-3 ${ratingConfig.starColor}`} />
            <span className="font-semibold">{safeRating}</span>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setShowInfo(true)}
            title={t('accessoryInfoBtn')}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-[#f4f4f5] hover:bg-slate-100 dark:hover:bg-[#222226] rounded-lg transition-colors cursor-pointer"
          >
            <Info className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onEdit(accessory)}
            title={t('devicesCardEdit')}
            className="p-1.5 text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-slate-100 dark:hover:bg-[#222226] rounded-lg transition-colors cursor-pointer"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(accessory)}
            title={t('devicesCardDelete')}
            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Title & Device Link */}
      <div className="px-4 pb-3">
        <div className="min-h-[3rem] flex flex-col justify-center">
          <h3
            className="text-base font-extrabold text-slate-900 dark:text-[#f4f4f5] tracking-tight leading-6 line-clamp-2"
            title={accessory.name}
          >
            {accessory.name}
          </h3>
        </div>
        <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500 dark:text-[#a1a1aa] h-4 leading-4">
          <Laptop className="w-3.5 h-3.5 text-purple-500 shrink-0" />
          <span className="truncate font-medium">
            {accessory.device ? accessory.device : t('accessoryUnassigned')}
          </span>
        </div>
      </div>

      {/* 3. Hero Image (if available) */}
      {normalizedImageUrl && (
        <div className="px-4 pb-3">
          <div className="relative w-full h-36 rounded-xl overflow-hidden border border-slate-200 dark:border-[#27272b] bg-slate-950/40">
            <img
              src={normalizedImageUrl}
              alt={accessory.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        </div>
      )}

      {/* 4. Description */}
      {accessory.description && (
        <div className="px-4 pb-3">
          <p className="text-xs text-slate-600 dark:text-[#a1a1aa] line-clamp-2 leading-relaxed">
            {accessory.description}
          </p>
        </div>
      )}

      {/* 6. Tags Footer */}
      {accessory.tags && accessory.tags.length > 0 && (
        <div className="px-4 pb-4 mt-auto">
          <div className="flex flex-wrap gap-1">
            {accessory.tags.map((tg) => (
              <span
                key={tg}
                className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-[#202024] text-slate-600 dark:text-[#a1a1aa] border border-slate-200/60 dark:border-[#27272b]"
              >
                #{tg}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Info Modal */}
      <AccessoryInfoModal
        isOpen={showInfo}
        accessory={accessory}
        onClose={() => setShowInfo(false)}
        onEdit={onEdit}
      />
    </div>
  );
};
