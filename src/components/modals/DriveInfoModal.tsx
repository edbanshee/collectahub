import React from 'react';
import {
  X,
  HardDrive,
  Cloud,
  Usb,
  Laptop,
  Gamepad2,
  Tag,
  FileText,
  Edit3,
  Mail,
  FolderOpen,
} from 'lucide-react';
import { StorageDrive } from '../../types';
import { useStorage } from '../../context/StorageContext';
import { useLanguage } from '../../context/LanguageContext';
import { formatStorageGB } from '../../utils/formatters';

interface DriveInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  drive: StorageDrive | null;
  onEdit: (drive: StorageDrive) => void;
}

export const DriveInfoModal: React.FC<DriveInfoModalProps> = ({
  isOpen,
  onClose,
  drive,
  onEdit,
}) => {
  const { devices } = useStorage();
  const { t } = useLanguage();

  if (!isOpen || !drive) return null;

  const isCloud = drive.storageMedium === 'cloud_network';
  const isUnassigned =
    !drive.device ||
    !drive.device.trim() ||
    drive.device === 'Sin Dispositivo / Unassigned' ||
    drive.device === '__unassigned__';

  const linkedDevice = isUnassigned ? null : devices.find((d) => d.name === drive.device);

  const capacity = drive.capacity || 0;
  const used = drive.used || 0;
  const freeGb = Math.max(0, capacity - used);
  const usedPercent = capacity > 0 ? Math.min(100, Math.round((used / capacity) * 100)) : 0;

  const isUsbType =
    drive.driveType?.toLowerCase().includes('usb') ||
    drive.driveType?.toLowerCase().includes('pendrive') ||
    drive.driveType?.toLowerCase().includes('flash');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white dark:bg-[#121215] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#27272b] my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-[#27272b] bg-slate-50/70 dark:bg-[#18181c]/70">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`p-2.5 rounded-xl border shrink-0 ${
                isCloud
                  ? 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800/60'
                  : isUnassigned || isUsbType
                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/60'
                  : 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/60'
              }`}
            >
              {isCloud ? (
                <Cloud className="w-5 h-5" />
              ) : isUnassigned || isUsbType ? (
                <Usb className="w-5 h-5" />
              ) : (
                <HardDrive className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-[#f4f4f5] tracking-tight truncate">
                  {drive.drive}
                </h3>
                {drive.label && (
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-[#27272b] text-slate-700 dark:text-[#d4d4d8] border border-slate-200 dark:border-[#38383e]">
                    {drive.label}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-[#a1a1aa] truncate mt-0.5">
                {drive.driveType || 'Drive'} • {drive.format || 'NTFS'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-[#f4f4f5] hover:bg-slate-200/60 dark:hover:bg-[#27272b] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 space-y-5 max-h-[calc(85vh-130px)] overflow-y-auto">
          {/* 1. Linked Device Card */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-[#27272b] bg-slate-50/50 dark:bg-[#18181c]/50">
            <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-[#a1a1aa] mb-2.5">
              {t('driveInfoDevice')}
            </h4>
            {linkedDevice ? (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800/60">
                    {linkedDevice.isGamingDevice ? (
                      <Gamepad2 className="w-4 h-4" />
                    ) : (
                      <Laptop className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 dark:text-[#f4f4f5] text-sm truncate">
                      {linkedDevice.name}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-[#a1a1aa] truncate">
                      {linkedDevice.system}{linkedDevice.cpu ? ` • ${linkedDevice.cpu}` : ''}
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-lg text-[10px] font-normal bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 shrink-0">
                  {linkedDevice.category}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">
                  <Usb className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-amber-700 dark:text-amber-400 text-sm">
                    {t('driveInfoUnassigned')}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-[#a1a1aa]">
                    {t('drivesUnassignedSubtitle')}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 2. Specs & Medium Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl border border-slate-200/80 dark:border-[#27272b] bg-white dark:bg-[#18181c]">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-[#71717a] block">
                {t('driveInfoMedium')}
              </span>
              <div className="flex items-center gap-1.5 mt-1 font-semibold text-xs text-slate-800 dark:text-[#f4f4f5]">
                {isCloud ? (
                  <>
                    <Cloud className="w-3.5 h-3.5 text-cyan-500" />
                    <span>{t('driveInfoMediumCloud')}</span>
                  </>
                ) : (
                  <>
                    <HardDrive className="w-3.5 h-3.5 text-purple-500" />
                    <span>{t('driveInfoMediumPhysical')}</span>
                  </>
                )}
              </div>
            </div>

            <div className="p-3 rounded-xl border border-slate-200/80 dark:border-[#27272b] bg-white dark:bg-[#18181c]">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-[#71717a] block">
                {t('driveInfoType')}
              </span>
              <span className="mt-1 font-semibold text-xs text-slate-800 dark:text-[#f4f4f5] block truncate font-mono">
                {drive.driveType || '-'}
              </span>
            </div>

            <div className="p-3 rounded-xl border border-slate-200/80 dark:border-[#27272b] bg-white dark:bg-[#18181c] col-span-2 sm:col-span-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-[#71717a] block">
                {t('driveInfoFormat')}
              </span>
              <span className="mt-1 font-mono font-bold text-xs text-purple-600 dark:text-purple-400 block truncate">
                {drive.format || '-'}
              </span>
            </div>
          </div>

          {/* 3. Capacity & Usage Details */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-[#27272b] bg-slate-50/50 dark:bg-[#18181c]/50 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 dark:text-[#f4f4f5]">
                {t('driveInfoCapacityUsage')}
              </h4>
              <span className="text-base font-mono font-bold text-slate-900 dark:text-[#f4f4f5]">
                {formatStorageGB(capacity)}
              </span>
            </div>

            {/* Gauge bar */}
            <div className="space-y-1">
              <div className="w-full bg-slate-200 dark:bg-[#25252a] rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    usedPercent >= 90
                      ? 'bg-rose-500'
                      : usedPercent >= 75
                      ? 'bg-amber-500'
                      : isCloud
                      ? 'bg-cyan-500'
                      : 'bg-purple-600'
                  }`}
                  style={{ width: `${usedPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] font-mono text-slate-500 dark:text-[#71717a]">
                <span>{usedPercent}% {t('deviceInfoUsedPercent', { percent: '' }).trim()}</span>
                <span>{formatStorageGB(freeGb)} {t('driveInfoFreeSpace').toLowerCase()}</span>
              </div>
            </div>

            {/* 3 Metrics breakdown */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/60 dark:border-[#27272b]/60 text-center font-mono">
              <div className="p-2 rounded-lg bg-white dark:bg-[#202024] border border-slate-200/60 dark:border-[#2b2b30]">
                <p className="text-[10px] text-slate-400 font-sans">{t('driveInfoTotalCapacity')}</p>
                <p className="text-xs font-bold text-slate-800 dark:text-[#f4f4f5] mt-0.5">
                  {formatStorageGB(capacity)}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-white dark:bg-[#202024] border border-slate-200/60 dark:border-[#2b2b30]">
                <p className="text-[10px] text-slate-400 font-sans">{t('driveInfoUsedSpace')}</p>
                <p className="text-xs font-bold text-slate-800 dark:text-[#f4f4f5] mt-0.5">
                  {formatStorageGB(used)}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-white dark:bg-[#202024] border border-slate-200/60 dark:border-[#2b2b30]">
                <p className="text-[10px] text-slate-400 font-sans">{t('driveInfoFreeSpace')}</p>
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {formatStorageGB(freeGb)}
                </p>
              </div>
            </div>
          </div>

          {/* 4. Cloud / Network details if present */}
          {(isCloud || drive.mountPoint || drive.accountEmail || drive.cloudProvider) && (
            <div className="p-4 rounded-xl border border-slate-200 dark:border-[#27272b] bg-slate-50/50 dark:bg-[#18181c]/50 space-y-2.5">
              <h4 className="text-xs font-bold text-slate-800 dark:text-[#f4f4f5] flex items-center gap-1.5">
                <Cloud className="w-3.5 h-3.5 text-cyan-500" />
                <span>{t('driveInfoCloudDetails')}</span>
              </h4>

              <div className="space-y-2 text-xs">
                {drive.cloudProvider && (
                  <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-[#27272b]/60">
                    <span className="text-slate-500 dark:text-[#a1a1aa]">
                      {t('driveInfoCloudProvider')}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-[#f4f4f5]">
                      {drive.cloudProvider}
                    </span>
                  </div>
                )}

                {drive.mountPoint && (
                  <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-[#27272b]/60">
                    <span className="text-slate-500 dark:text-[#a1a1aa] flex items-center gap-1">
                      <FolderOpen className="w-3 h-3 text-slate-400" />
                      <span>{t('driveInfoMountPoint')}</span>
                    </span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-[#f4f4f5]">
                      {drive.mountPoint}
                    </span>
                  </div>
                )}

                {drive.accountEmail && (
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-500 dark:text-[#a1a1aa] flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-400" />
                      <span>{t('driveInfoAccountEmail')}</span>
                    </span>
                    <span className="font-mono text-slate-800 dark:text-[#f4f4f5] truncate max-w-[200px]">
                      {drive.accountEmail}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 5. Tags */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-[#27272b] bg-slate-50/50 dark:bg-[#18181c]/50">
            <h4 className="text-xs font-bold text-slate-800 dark:text-[#f4f4f5] flex items-center gap-1.5 mb-2.5">
              <Tag className="w-3.5 h-3.5 text-purple-500" />
              <span>{t('driveInfoTags')}</span>
            </h4>
            {drive.tags && drive.tags.length > 0 ? (
              <div className="flex items-center gap-1.5 flex-wrap">
                {drive.tags.map((tg) => (
                  <span
                    key={tg}
                    className="px-2.5 py-1 rounded-md text-xs bg-white dark:bg-[#202024] text-purple-700 dark:text-purple-300 border border-slate-200/80 dark:border-[#2b2b30] font-mono font-medium shadow-2xs"
                  >
                    #{tg}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                {t('driveInfoNoTags')}
              </p>
            )}
          </div>

          {/* 6. Additional Notes (Crucial requested section) */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-[#27272b] bg-slate-50/50 dark:bg-[#18181c]/50 space-y-2">
            <h4 className="text-xs font-bold text-slate-800 dark:text-[#f4f4f5] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-purple-500" />
              <span>{t('driveInfoNotes')}</span>
            </h4>
            {drive.notes && drive.notes.trim() ? (
              <div className="p-3.5 rounded-xl bg-white dark:bg-[#202024] border border-slate-200/80 dark:border-[#2b2b30] text-xs leading-relaxed text-slate-700 dark:text-[#d4d4d8] whitespace-pre-wrap break-words">
                {drive.notes}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                {t('driveInfoNoNotes')}
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
              onEdit(drive);
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 border border-purple-200 dark:border-purple-800/80 rounded-xl transition-colors cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{t('driveInfoEditBtn')}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-700 dark:text-[#d4d4d8] bg-slate-200/80 dark:bg-[#27272b] hover:bg-slate-300 dark:hover:bg-[#323238] rounded-xl transition-colors cursor-pointer"
          >
            {t('driveInfoCloseBtn')}
          </button>
        </div>
      </div>
    </div>
  );
};
