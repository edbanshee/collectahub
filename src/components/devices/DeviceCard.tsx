import React, { useState } from 'react';
import {
  Gamepad2,
  Laptop,
  HardDrive,
  Package,
  Plus,
  Edit2,
  Trash2,
  ChevronRight,
  Info,
  Sparkles,
  Star,
  ExternalLink,
  Maximize2,
} from 'lucide-react';
import { Device, StorageDrive, Accessory } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { formatStorageGB } from '../../utils/formatters';
import { DeviceInfoModal } from '../modals/DeviceInfoModal';
import { DriveInfoModal } from '../modals/DriveInfoModal';
import { AccessoryInfoModal } from '../modals/AccessoryInfoModal';
import { ImageViewerModal } from '../modals/ImageViewerModal';
import { getRatingConfig, getSafeRating } from '../../utils/ratingColors';

interface DeviceCardProps {
  device: Device;
  drives: StorageDrive[];
  accessories?: Accessory[];
  onEdit: (device: Device) => void;
  onDelete: (device: Device) => void;
  onAddDrive: (deviceName: string) => void;
  onAddAccessory?: (deviceName: string) => void;
  onEditAccessory?: (accessory: Accessory) => void;
  onNavigateToMatrix?: (deviceId?: string) => void;
}

export const DeviceCard: React.FC<DeviceCardProps> = ({
  device,
  drives,
  accessories = [],
  onEdit,
  onDelete,
  onAddDrive,
  onAddAccessory,
  onEditAccessory,
  onNavigateToMatrix,
}) => {
  const { t, language } = useLanguage();
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [selectedDriveForInfo, setSelectedDriveForInfo] = useState<StorageDrive | null>(null);
  const [selectedAccessoryForInfo, setSelectedAccessoryForInfo] = useState<Accessory | null>(null);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);

  const deviceDrives = drives.filter((dr) => dr.device === device.name);
  const deviceAccessories = accessories.filter((acc) => acc.device === device.name);

  const totalCap = deviceDrives.reduce((sum, dr) => sum + (dr.capacity || 0), 0);
  const totalUsed = deviceDrives.reduce((sum, dr) => sum + (dr.used || 0), 0);
  const totalFree = Math.max(0, totalCap - totalUsed);
  const usedPercent = totalCap > 0 ? Math.min(100, Math.round((totalUsed / totalCap) * 100)) : 0;

  const safeDeviceRating = getSafeRating(device.rating, 5);
  const deviceRatingConfig = getRatingConfig(safeDeviceRating);

  const unitLabel = language === 'es'
    ? (deviceDrives.length === 1 ? 'unidad' : 'unidades')
    : (deviceDrives.length === 1 ? 'drive' : 'drives');

  // Emulation stats
  const scores = device.emulationScores || {};
  const scoredSystems = Object.entries(scores);
  const playableCount = scoredSystems.filter(([_, score]) => score >= 3).length;

  const getScoreColor = (score: number) => {
    if (score === 5) return 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10';
    if (score === 4) return 'border-teal-500/50 text-teal-400 bg-teal-500/10';
    if (score === 3) return 'border-amber-500/50 text-amber-400 bg-amber-500/10';
    if (score === 2) return 'border-orange-500/50 text-orange-400 bg-orange-500/10';
    return 'border-rose-500/50 text-rose-400 bg-rose-500/10';
  };

  return (
    <div className="flex flex-col bg-white dark:bg-[#18181c] rounded-2xl border border-slate-200 dark:border-[#27272b] shadow-xs hover:shadow-md transition-all overflow-hidden">
      {/* 1. Header with Category Pill, Unified Physical Rating Badge and Action Icons */}
      <div className="p-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-normal bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
            {device.isGamingDevice ? (
              <Gamepad2 className="w-3 h-3 text-purple-500" />
            ) : (
              <Laptop className="w-3 h-3 text-blue-500" />
            )}
            <span>{device.category}</span>
          </span>
          <div
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-normal ${deviceRatingConfig.badgeBg} ${deviceRatingConfig.badgeBorder} ${deviceRatingConfig.textColor}`}
            title={`${language === 'es' ? 'Estado físico' : 'Physical condition'}: ${safeDeviceRating}/5 (${deviceRatingConfig.label[language] || deviceRatingConfig.label.es})`}
          >
            <span className="opacity-90">
              {language === 'es' ? 'Estado' : 'Condition'}
            </span>
            <Star className={`w-3 h-3 ${deviceRatingConfig.starColor}`} />
            <span className="font-semibold">{safeDeviceRating}</span>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setShowInfoModal(true)}
            title="Info"
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-[#f4f4f5] hover:bg-slate-100 dark:hover:bg-[#222226] rounded-lg transition-colors cursor-pointer"
          >
            <Info className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onEdit(device)}
            title={t('devicesCardEdit')}
            className="p-1.5 text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-slate-100 dark:hover:bg-[#222226] rounded-lg transition-colors cursor-pointer"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(device)}
            title={t('devicesCardDelete')}
            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Device Title and Subtitle (OS • CPU) */}
      <div className="px-5 pb-4">
        <div className="min-h-[3.5rem] flex flex-col justify-center">
          <h3
            className="text-lg font-extrabold text-slate-900 dark:text-[#f4f4f5] tracking-tight leading-7 line-clamp-2"
            title={device.name}
          >
            {device.name}
          </h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-[#a1a1aa] mt-1 h-4 leading-4 truncate">
          {device.system}{device.cpu ? ` • ${device.cpu}` : ''}
        </p>
      </div>

      {/* 3. Hero Device Image (Edge-to-Edge) */}
      {device.imageUrl && (
        <div className="pb-4">
          <div
            onClick={() => setIsImageViewerOpen(true)}
            className="group relative w-full h-48 sm:h-52 bg-slate-950/40 border-y border-slate-200/80 dark:border-[#27272b] overflow-hidden cursor-zoom-in"
            title={language === 'es' ? 'Haz clic para ver la imagen en pantalla completa' : 'Click to view image in full screen'}
          >
            <img
              src={
                /^(https?:\/\/|data:|\/)/i.test(device.imageUrl.trim())
                  ? device.imageUrl.trim()
                  : `https://${device.imageUrl.trim()}`
              }
              alt={device.name}
              className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
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
        </div>
      )}

      {/* 5. Notes Quote Block */}
      {device.notes && (
        <div className="px-5 pb-4">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#202024] border border-slate-200/80 dark:border-[#27272b] text-xs italic text-slate-600 dark:text-[#a1a1aa]">
            "{device.notes}"
          </div>
        </div>
      )}

      {/* 6. Storage Section */}
      <div className="px-5 pb-4 space-y-3">
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#202024] border border-slate-200/80 dark:border-[#27272b] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-[#f4f4f5]">
              <HardDrive className="w-4 h-4 text-purple-500" />
              <span>
                {t('drivesLinkedTitle', {
                  count: deviceDrives.length,
                  label: unitLabel,
                })}
              </span>
            </div>
            <span className="text-xs font-extrabold font-mono text-purple-600 dark:text-purple-400">
              {formatStorageGB(totalCap)}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-[#2a2a30] overflow-hidden">
            <div
              className="h-full rounded-full bg-purple-600 transition-all duration-300"
              style={{ width: `${usedPercent}%` }}
            />
          </div>

          {/* Sub usage label */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-[#a1a1aa] font-mono">
            <span>{t('deviceInfoUsed', { used: formatStorageGB(totalUsed) })} ({usedPercent}%)</span>
            <span>{t('deviceInfoFreeSpace', { free: formatStorageGB(totalFree) })}</span>
          </div>

          {/* Mini drives list */}
          {deviceDrives.length > 0 ? (
            <div className="space-y-1.5 pt-1">
              {deviceDrives.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-[#18181c] border border-slate-200/70 dark:border-[#27272b] hover:border-purple-300 dark:hover:border-purple-800/60 transition-colors text-xs"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedDriveForInfo(d)}
                    className="flex items-center gap-2 truncate text-left cursor-pointer hover:text-purple-600 dark:hover:text-purple-400 transition-colors min-w-0"
                  >
                    <HardDrive className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-semibold text-slate-800 dark:text-[#f4f4f5] truncate font-mono">
                      {d.drive}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-[#222226] text-slate-500 dark:text-[#a1a1aa] shrink-0">
                      {d.driveType}
                    </span>
                  </button>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-[11px] font-bold text-slate-600 dark:text-[#a1a1aa]">
                      {formatStorageGB(d.capacity)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedDriveForInfo(d)}
                      title={t('driveInfoBtn')}
                      className="p-1 text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 rounded transition-colors cursor-pointer"
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 dark:text-[#71717a] text-center py-1">
              {t('devicesNoDrives')}
            </p>
          )}

          {/* Add drive button (corner bottom right) */}
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => onAddDrive(device.name)}
              title={t('actionAddDrive')}
              className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-600 dark:text-purple-400 border border-purple-200/70 dark:border-purple-800/60 transition-all cursor-pointer hover:scale-105"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 7. Accessories Section */}
      <div className="px-5 pb-4 space-y-3">
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#202024] border border-slate-200/80 dark:border-[#27272b] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-[#f4f4f5]">
              <Package className="w-4 h-4 text-purple-500" />
              <span>
                {t('accessoriesLinkedTitle', {
                  count: deviceAccessories.length,
                })}
              </span>
            </div>
          </div>

          {/* Mini accessories list */}
          {deviceAccessories.length > 0 ? (
            <div className="space-y-1.5 pt-1">
              {deviceAccessories.map((acc) => {
                const safeAccRating = getSafeRating(acc.rating, 5);
                const accConfig = getRatingConfig(safeAccRating);
                return (
                  <div
                    key={acc.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-[#18181c] border border-slate-200/70 dark:border-[#27272b] hover:border-purple-300 dark:hover:border-purple-800/60 transition-colors text-xs"
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedAccessoryForInfo(acc)}
                      className="flex items-center gap-2 truncate text-left cursor-pointer hover:text-purple-600 dark:hover:text-purple-400 transition-colors min-w-0"
                    >
                      <Package className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-800 dark:text-[#f4f4f5] truncate">
                        {acc.name}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-normal bg-slate-100 dark:bg-[#222226] text-slate-500 dark:text-[#a1a1aa] shrink-0">
                        {acc.category}
                      </span>
                    </button>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Summarize stars with single number and semáforo color */}
                      <div className={`flex items-center gap-1 font-mono text-xs font-bold ${accConfig.textColor}`}>
                        <Star className={`w-3.5 h-3.5 ${accConfig.starColor}`} />
                        <span>{safeAccRating}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedAccessoryForInfo(acc)}
                        title={t('accessoryInfoBtn')}
                        className="p-1 text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 rounded transition-colors cursor-pointer"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-400 dark:text-[#71717a] text-center py-1">
              {t('devicesNoAccessories')}
            </p>
          )}

          {/* Add accessory button (corner bottom right) */}
          {onAddAccessory && (
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => onAddAccessory(device.name)}
                title={t('accessoriesAddAccessoryTo')}
                className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-600 dark:text-purple-400 border border-purple-200/70 dark:border-purple-800/60 transition-all cursor-pointer hover:scale-105"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 8. Emulation Capabilities Section (Gaming only) */}
      {device.isGamingDevice && (
        <div className="px-5 pb-5">
          <div className="p-4 rounded-xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-purple-700 dark:text-purple-300">
                <Gamepad2 className="w-4 h-4 text-purple-500" />
                <span>{t('devicesEmulationCapabilities')}</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/80">
                {t('devicesPlayableCount', {
                  playable: playableCount,
                  total: scoredSystems.length || 0,
                })}
              </span>
            </div>

            {device.emulationOverview && (
              <p className="text-xs text-slate-600 dark:text-[#d4d4d8] leading-relaxed">
                {device.emulationOverview}
              </p>
            )}

            {/* Rating chips with SVG Star icon */}
            {scoredSystems.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {scoredSystems.slice(0, 6).map(([system, score]) => (
                  <span
                    key={system}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border ${getScoreColor(
                      score
                    )}`}
                  >
                    <span>{system}</span>
                    <span className="inline-flex items-center gap-0.5 font-bold">
                      <Star className="w-3 h-3 fill-current shrink-0" />
                      <span>{score}</span>
                    </span>
                  </span>
                ))}
                {scoredSystems.length > 6 && (
                  <span className="text-[11px] text-slate-400 dark:text-[#71717a] font-semibold pl-1">
                    {t('devicesMoreSystems', { count: scoredSystems.length - 6 })}
                  </span>
                )}
              </div>
            )}

            {/* Link to matrix */}
            {onNavigateToMatrix && (
              <button
                type="button"
                onClick={() => onNavigateToMatrix(device.id)}
                className="w-full mt-2 pt-2 border-t border-purple-200/50 dark:border-purple-900/40 flex items-center justify-between text-xs font-bold text-purple-600 dark:text-purple-300 hover:text-purple-700 dark:hover:text-purple-200 group cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                  <span>{t('devicesViewMatrixBtn')}</span>
                </span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Full Device Details Modal */}
      <DeviceInfoModal
        isOpen={showInfoModal}
        onClose={() => setShowInfoModal(false)}
        device={device}
        drives={drives}
        onEdit={onEdit}
        onNavigateToMatrix={onNavigateToMatrix}
      />

      {/* Drive Info Modal */}
      <DriveInfoModal
        isOpen={!!selectedDriveForInfo}
        drive={selectedDriveForInfo}
        onClose={() => setSelectedDriveForInfo(null)}
        onEdit={() => {
          setSelectedDriveForInfo(null);
        }}
      />

      {/* Accessory Info Modal */}
      <AccessoryInfoModal
        isOpen={!!selectedAccessoryForInfo}
        accessory={selectedAccessoryForInfo}
        onClose={() => setSelectedAccessoryForInfo(null)}
        onEdit={(acc) => {
          setSelectedAccessoryForInfo(null);
          onEditAccessory?.(acc);
        }}
      />

      {/* Fullscreen Image Lightbox Modal */}
      <ImageViewerModal
        isOpen={isImageViewerOpen}
        imageUrl={
          device.imageUrl?.trim()
            ? /^(https?:\/\/|data:|\/)/i.test(device.imageUrl.trim())
              ? device.imageUrl.trim()
              : `https://${device.imageUrl.trim()}`
            : null
        }
        title={device.name}
        onClose={() => setIsImageViewerOpen(false)}
      />
    </div>
  );
};
