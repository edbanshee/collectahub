import React, { useState } from 'react';
import {
  X,
  Gamepad2,
  Laptop,
  Cpu,
  FileText,
  HardDrive,
  Cloud,
  Edit3,
  ExternalLink,
  Sparkles,
  Info,
  Package,
  Star,
  Maximize2,
} from 'lucide-react';
import { Device, StorageDrive } from '../../types';
import { formatStorageGB } from '../../utils/formatters';
import { EMULATION_SYSTEMS } from '../../data/emulationCatalog';
import { useLanguage } from '../../context/LanguageContext';
import { useStorage } from '../../context/StorageContext';
import { DriveInfoModal } from './DriveInfoModal';
import { ImageViewerModal } from './ImageViewerModal';
import { getRatingConfig, getSafeRating } from '../../utils/ratingColors';

interface DeviceInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  device: Device;
  drives: StorageDrive[];
  onEdit: (device: Device) => void;
  onNavigateToMatrix?: (deviceId?: string) => void;
  onEditDrive?: (drive: StorageDrive) => void;
}

export const DeviceInfoModal: React.FC<DeviceInfoModalProps> = ({
  isOpen,
  onClose,
  device,
  drives,
  onEdit,
  onNavigateToMatrix,
  onEditDrive,
}) => {
  const { accessories } = useStorage();
  const { t, language } = useLanguage();
  const [selectedDriveForInfo, setSelectedDriveForInfo] = useState<StorageDrive | null>(null);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);

  if (!isOpen) return null;

  const deviceDrives = drives.filter((d) => d.device === device.name);
  const deviceAccessories = accessories.filter((a) => a.device === device.name);
  const totalCap = deviceDrives.reduce((sum, d) => sum + (d.capacity || 0), 0);
  const totalUsed = deviceDrives.reduce((sum, d) => sum + (d.used || 0), 0);
  const totalFree = Math.max(0, totalCap - totalUsed);
  const usedPercent = totalCap > 0 ? Math.min(100, Math.round((totalUsed / totalCap) * 100)) : 0;

  // Normalized image URL
  const normalizedImageUrl = device.imageUrl?.trim()
    ? /^(https?:\/\/|data:|\/)/i.test(device.imageUrl.trim())
      ? device.imageUrl.trim()
      : `https://${device.imageUrl.trim()}`
    : undefined;

  // Emulation scores
  const scores = device.emulationScores || {};
  const scoredEntries = Object.entries(scores);

  const getScoreColor = (score: number) => {
    if (score === 5) return 'border-emerald-500/50 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10';
    if (score === 4) return 'border-teal-500/50 text-teal-600 dark:text-teal-400 bg-teal-500/10';
    if (score === 3) return 'border-amber-500/50 text-amber-600 dark:text-amber-400 bg-amber-500/10';
    if (score === 2) return 'border-orange-500/50 text-orange-600 dark:text-orange-400 bg-orange-500/10';
    return 'border-rose-500/50 text-rose-600 dark:text-rose-400 bg-rose-500/10';
  };

  const getScoreLabel = (score: number) => {
    switch (score) {
      case 5:
        return language === 'es' ? 'Velocidad Máxima' : 'Full Speed';
      case 4:
        return language === 'es' ? 'Muy Bueno' : 'Very Good';
      case 3:
        return language === 'es' ? 'Jugable' : 'Playable';
      case 2:
        return language === 'es' ? 'Lento' : 'Slow';
      default:
        return language === 'es' ? 'Injugable' : 'Unplayable';
    }
  };

  const unitLabel = language === 'es'
    ? (deviceDrives.length === 1 ? 'unidad' : 'unidades')
    : (deviceDrives.length === 1 ? 'drive' : 'drives');

  const safeDeviceRating = getSafeRating(device.rating, 5);
  const deviceRatingConfig = getRatingConfig(safeDeviceRating);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white dark:bg-[#121215] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#27272b] my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-[#27272b] bg-slate-50/70 dark:bg-[#18181c]/70">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800/60 shrink-0">
              {device.isGamingDevice ? (
                <Gamepad2 className="w-5 h-5" />
              ) : (
                <Laptop className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-[#f4f4f5] truncate">
                {device.name}
              </h3>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="px-2 py-0.5 rounded-lg text-[10px] font-normal bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
                  {device.category}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-[#a1a1aa] font-normal">
                  {device.system}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-normal border ${deviceRatingConfig.badgeBg} ${deviceRatingConfig.badgeBorder} ${deviceRatingConfig.textColor}`}
                  title={`${language === 'es' ? 'Estado físico' : 'Physical condition'}: ${safeDeviceRating}/5 (${deviceRatingConfig.label[language] || deviceRatingConfig.label.es})`}
                >
                  <span className="opacity-90">
                    {language === 'es' ? 'Estado' : 'Condition'}
                  </span>
                  <Star className={`w-3 h-3 ${deviceRatingConfig.starColor}`} />
                  <span className="font-semibold">{safeDeviceRating}</span>
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-[#f4f4f5] rounded-lg hover:bg-slate-100 dark:hover:bg-[#222226] transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Banner Image */}
          {normalizedImageUrl && (
            <div
              onClick={() => setIsImageViewerOpen(true)}
              className="group relative w-full h-44 sm:h-52 rounded-xl overflow-hidden border border-slate-200 dark:border-[#27272b] bg-slate-950 shadow-inner cursor-zoom-in transition-transform"
              title={language === 'es' ? 'Haz clic para ver la imagen en pantalla completa' : 'Click to view image in full screen'}
            >
              <img
                src={normalizedImageUrl}
                alt={device.name}
                className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
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

          {/* 1. Procesador / CPU / Gráficos */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-[#27272b] bg-slate-50/50 dark:bg-[#18181c]/50 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-[#d4d4d8]">
              <Cpu className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>{t('deviceInfoProcessor')}</span>
            </div>
            <div className="p-3 rounded-lg bg-white dark:bg-[#202024] border border-slate-200 dark:border-[#2b2b30] text-sm font-mono text-slate-800 dark:text-[#f4f4f5]">
              {device.cpu || t('deviceInfoNotSpecified')}
            </div>
          </div>

          {/* 2. Estado Físico (Encima de la descripción / notas) */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-[#27272b] bg-slate-50/50 dark:bg-[#18181c]/50 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-[#d4d4d8]">
                <Star className={`w-4 h-4 ${deviceRatingConfig.starColor}`} />
                <span>{t('devicesConditionRating')}</span>
              </div>
              <span className={`text-xs font-bold font-sans ${deviceRatingConfig.textColor}`}>
                {deviceRatingConfig.label[language] || deviceRatingConfig.label.es}
              </span>
            </div>
            <div className={`flex items-center justify-between p-3 rounded-xl border ${deviceRatingConfig.badgeBg} ${deviceRatingConfig.badgeBorder}`}>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      safeDeviceRating >= star
                        ? `${deviceRatingConfig.starColor} drop-shadow-xs`
                        : 'text-slate-300 dark:text-[#383840]'
                    }`}
                  />
                ))}
              </div>
              <span className={`text-xs font-mono font-bold ${deviceRatingConfig.textColor}`}>
                {safeDeviceRating} / 5
              </span>
            </div>
          </div>

          {/* 3. Notas y Descripción */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-[#27272b] bg-slate-50/50 dark:bg-[#18181c]/50 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-[#d4d4d8]">
              <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>{t('deviceInfoNotes')}</span>
            </div>
            <div className="p-3 rounded-lg bg-white dark:bg-[#202024] border border-slate-200 dark:border-[#2b2b30] text-xs sm:text-sm text-slate-700 dark:text-[#d4d4d8] italic leading-relaxed">
              {device.notes ? `"${device.notes}"` : t('deviceInfoNoNotes')}
            </div>
          </div>

          {/* 3. Capacidades de Emulación */}
          {device.isGamingDevice ? (
            <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-900/40 bg-purple-50/30 dark:bg-purple-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-purple-950 dark:text-purple-200">
                  <Gamepad2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>{t('deviceInfoEmulation')}</span>
                </div>
                {onNavigateToMatrix && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateToMatrix(device.id);
                    }}
                    className="flex items-center gap-1 text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                  >
                    <span>{t('deviceInfoViewMatrix')}</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>

              {device.emulationOverview ? (
                <div className="p-3 rounded-lg bg-white dark:bg-[#18181c] border border-purple-100 dark:border-purple-900/50 text-xs sm:text-sm text-slate-700 dark:text-[#d4d4d8] leading-relaxed">
                  {device.emulationOverview}
                </div>
              ) : (
                <p className="text-xs text-slate-500 dark:text-[#a1a1aa] italic">
                  {t('deviceInfoNoOverview')}
                </p>
              )}

              {/* Scored Systems list if any */}
              {scoredEntries.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-purple-900 dark:text-purple-300">
                    <span>{t('deviceInfoEvaluatedSystems', { count: scoredEntries.length })}</span>
                    <span>
                      {t('deviceInfoPlayableCount', { count: scoredEntries.filter(([_, s]) => s >= 3).length })}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                    {scoredEntries.map(([sysId, score]) => {
                      const colorClass = getScoreColor(score);
                      const label = getScoreLabel(score);
                      const sysDef = EMULATION_SYSTEMS.find((s) => s.id === sysId);
                      return (
                        <div
                          key={sysId}
                          className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white dark:bg-[#18181c] border border-slate-200/80 dark:border-[#27272b] text-xs"
                        >
                          <span
                            className="font-medium text-slate-800 dark:text-[#f4f4f5] truncate"
                            title={sysDef?.name || sysId}
                          >
                            {sysDef?.shortName || sysId}
                          </span>
                          <div
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold border shrink-0 ${colorClass}`}
                          >
                            <span className="inline-flex items-center gap-0.5 font-bold font-mono">
                              <Star className="w-3 h-3 fill-current shrink-0" />
                              <span>{score}</span>
                            </span>
                            <span className="text-[10px] font-medium opacity-90">
                              • {label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-slate-200 dark:border-[#27272b] bg-slate-50/50 dark:bg-[#18181c]/50 flex items-center gap-2.5 text-xs text-slate-500 dark:text-[#a1a1aa]">
              <Laptop className="w-4 h-4 text-slate-400" />
              <span>{t('deviceInfoProductivityOnly')}</span>
            </div>
          )}

          {/* 4. Almacenamiento Vinculado */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-[#27272b] bg-slate-50/50 dark:bg-[#18181c]/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-[#f4f4f5]">
                    {t('deviceInfoLinkedStorage')}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-[#a1a1aa]">
                    {t('deviceInfoUnitsCount', {
                      count: deviceDrives.length,
                      label: unitLabel,
                      used: formatStorageGB(totalUsed),
                      total: formatStorageGB(totalCap),
                    })}
                  </p>
                </div>
              </div>
              <span className="text-base sm:text-lg font-mono font-bold text-slate-900 dark:text-[#f4f4f5]">
                {formatStorageGB(totalCap)}
              </span>
            </div>

            {/* Total progress bar */}
            {totalCap > 0 && (
              <div className="space-y-1">
                <div className="w-full bg-slate-200 dark:bg-[#25252a] rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      usedPercent > 90
                        ? 'bg-rose-500'
                        : usedPercent > 75
                        ? 'bg-amber-500'
                        : 'bg-purple-600'
                    }`}
                    style={{ width: `${usedPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 dark:text-[#71717a] font-mono">
                  <span>{t('deviceInfoUsedPercent', { percent: usedPercent })}</span>
                  <span>{t('deviceInfoFreeSpace', { free: formatStorageGB(totalFree) })}</span>
                </div>
              </div>
            )}

            {/* Individual drives list */}
            {deviceDrives.length > 0 ? (
              <div className="space-y-1.5 pt-1">
                {deviceDrives.map((d) => (
                  <div
                    key={d.id}
                    className="p-2.5 rounded-lg bg-white dark:bg-[#202024] border border-slate-200/80 dark:border-[#2b2b30] flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {d.storageMedium === 'cloud_network' ? (
                        <Cloud className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                      ) : (
                        <HardDrive className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-[#f4f4f5] font-mono truncate">
                          {d.drive}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {d.driveType || d.label} {d.format ? `• ${d.format}` : ''} {d.tags?.length ? `• ${d.tags.join(', ')}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right font-mono text-[11px]">
                        <span className="font-semibold text-slate-700 dark:text-[#d4d4d8]">
                          {formatStorageGB(d.capacity)}
                        </span>
                        <p className="text-[10px] text-slate-400">
                          {d.used ? t('deviceInfoUsed', { used: formatStorageGB(d.used) }) : '0 GB'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedDriveForInfo(d)}
                        title={t('driveInfoBtn')}
                        className="p-1 text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-slate-100 dark:hover:bg-[#28282d] rounded-lg transition-colors cursor-pointer"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                {t('deviceInfoNoDrives')}
              </p>
            )}
          </div>

          {/* 5. Accesorios */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-[#27272b] bg-slate-50/50 dark:bg-[#18181c]/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-[#f4f4f5]">
                    {t('accessoriesLinkedTitle', { count: deviceAccessories.length })}
                  </h4>
                </div>
              </div>
              <span className="text-xs font-bold text-slate-500 dark:text-[#a1a1aa]">
                {deviceAccessories.length} {deviceAccessories.length === 1 ? 'accesorio' : 'accesorios'}
              </span>
            </div>

            {deviceAccessories.length > 0 ? (
              <div className="space-y-1.5 pt-1">
                {deviceAccessories.map((acc) => (
                  <div
                    key={acc.id}
                    className="p-2.5 rounded-lg bg-white dark:bg-[#202024] border border-slate-200/80 dark:border-[#2b2b30] flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Package className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-[#f4f4f5] truncate">
                          {acc.name}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {acc.category} {acc.tags?.length ? `• ${acc.tags.join(', ')}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {(() => {
                        const safeAccRating = getSafeRating(acc.rating, 5);
                        const accConfig = getRatingConfig(safeAccRating);
                        return (
                          <div className={`flex items-center gap-1 font-mono text-xs font-bold ${accConfig.textColor}`}>
                            <Star className={`w-3.5 h-3.5 ${accConfig.starColor}`} />
                            <span>{safeAccRating}</span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                {t('devicesNoAccessories')}
              </p>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-[#27272b] bg-slate-50/50 dark:bg-[#18181c]/50">
          <button
            type="button"
            onClick={() => {
              onClose();
              onEdit(device);
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 border border-purple-200 dark:border-purple-800/80 rounded-xl transition-colors cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{t('deviceInfoEditBtn')}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-700 dark:text-[#d4d4d8] bg-slate-200/80 dark:bg-[#27272b] hover:bg-slate-300 dark:hover:bg-[#323238] rounded-xl transition-colors cursor-pointer"
          >
            {t('deviceInfoCloseBtn')}
          </button>
        </div>
      </div>

      {/* Drive Info Sub-Modal */}
      <DriveInfoModal
        isOpen={!!selectedDriveForInfo}
        drive={selectedDriveForInfo}
        onClose={() => setSelectedDriveForInfo(null)}
        onEdit={(dr) => {
          setSelectedDriveForInfo(null);
          if (onEditDrive) {
            onClose();
            onEditDrive(dr);
          }
        }}
      />

      {/* Fullscreen Image Lightbox Modal */}
      <ImageViewerModal
        isOpen={isImageViewerOpen}
        imageUrl={normalizedImageUrl || null}
        title={device.name}
        onClose={() => setIsImageViewerOpen(false)}
      />
    </div>
  );
};
