import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, HardDrive, Cloud, Tag, Plus, Check, AlertTriangle } from 'lucide-react';
import { StorageDrive, StorageMedium, CloudProvider } from '../../types';
import { useStorage } from '../../context/StorageContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { DEFAULT_CLOUD_PROVIDERS } from '../../data/initialData';

interface DriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  driveToEdit?: StorageDrive | null;
  preselectedDeviceName?: string;
}

const COMMON_SIZES = [
  { label: '64 GB', value: 64 },
  { label: '128 GB', value: 128 },
  { label: '256 GB', value: 256 },
  { label: '512 GB', value: 512 },
  { label: '1 TB', value: 1000 },
  { label: '2 TB', value: 2000 },
  { label: '4 TB', value: 4000 },
  { label: '8 TB', value: 8000 },
  { label: '16 TB', value: 16000 },
];

export const DriveModal: React.FC<DriveModalProps> = ({
  isOpen,
  onClose,
  driveToEdit,
  preselectedDeviceName,
}) => {
  const { devices, drives, settings, saveDrive, addOption } = useStorage();
  const { t } = useLanguage();
  const { showToast } = useToast();

  const [device, setDevice] = useState('');
  const [drive, setDrive] = useState('');
  const [driveType, setDriveType] = useState('');
  const [isAddingNewType, setIsAddingNewType] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');

  const [label, setLabel] = useState('');
  const [capacity, setCapacity] = useState<number | ''>(1000);
  const [used, setUsed] = useState<number | ''>(500);
  const [free, setFree] = useState<number | ''>(500);
  const [format, setFormat] = useState('NTFS');
  const [isAddingNewFormat, setIsAddingNewFormat] = useState(false);
  const [newFormatName, setNewFormatName] = useState('');

  const [storageMedium, setStorageMedium] = useState<StorageMedium>('physical');
  const [cloudProvider, setCloudProvider] = useState<string>('Google Drive');
  const [isAddingNewProvider, setIsAddingNewProvider] = useState(false);
  const [newProviderName, setNewProviderName] = useState('');

  const [mountPoint, setMountPoint] = useState('');
  const [accountEmail, setAccountEmail] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-sync available options with drives and settings
  const availableDriveTypes = useMemo(() => {
    return Array.from(
      new Set([...(settings.driveTypes || []), ...drives.map((d) => d.driveType), driveType].filter(Boolean))
    );
  }, [settings.driveTypes, drives, driveType]);

  const availableFormats = useMemo(() => {
    return Array.from(
      new Set([...(settings.formatOptions || []), ...drives.map((d) => d.format), format].filter(Boolean))
    );
  }, [settings.formatOptions, drives, format]);

  const availableCloudProviders = useMemo(() => {
    return Array.from(
      new Set([
        ...(settings.cloudProviders || []),
        ...drives.map((d) => d.cloudProvider).filter(Boolean),
        cloudProvider,
      ].filter(Boolean) as string[])
    );
  }, [settings.cloudProviders, drives, cloudProvider]);

  const hasInitializedRef = useRef(false);
  const lastEditIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      hasInitializedRef.current = false;
      lastEditIdRef.current = null;
      return;
    }

    const currentEditId = driveToEdit?.id || null;
    if (hasInitializedRef.current && lastEditIdRef.current === currentEditId) {
      // Form already initialized for this modal session; keep user input intact
      return;
    }

    hasInitializedRef.current = true;
    lastEditIdRef.current = currentEditId;

    if (driveToEdit) {
      setDevice(driveToEdit.device || '');
      setDrive(driveToEdit.drive);
      setDriveType(driveToEdit.driveType);
      setLabel(driveToEdit.label);
      setCapacity(driveToEdit.capacity);
      setUsed(driveToEdit.used);
      setFree(driveToEdit.free);
      setFormat(driveToEdit.format);
      setStorageMedium(driveToEdit.storageMedium || 'physical');
      setCloudProvider(driveToEdit.cloudProvider || 'Google Drive');
      setMountPoint(driveToEdit.mountPoint || '');
      setAccountEmail(driveToEdit.accountEmail || '');
      setTags(driveToEdit.tags || []);
      setNotes(driveToEdit.notes || '');
    } else {
      const defaultDevice =
        preselectedDeviceName !== undefined
          ? preselectedDeviceName === '__unassigned__'
            ? ''
            : preselectedDeviceName
          : devices.length > 0
          ? devices[0].name
          : '';
      setDevice(defaultDevice);
      setDrive('');
      setDriveType(settings.driveTypes?.[0] || '');
      setLabel('');
      setCapacity(1000);
      setUsed(400);
      setFree(600);
      setFormat(settings.formatOptions?.[0] || '');
      setStorageMedium('physical');
      setCloudProvider(
        settings.cloudProviders && settings.cloudProviders.length > 0
          ? settings.cloudProviders[0]
          : 'Google Drive'
      );
      setMountPoint('');
      setAccountEmail('');
      setTags(['storage']);
      setNotes('');
    }

    setIsAddingNewType(false);
    setNewTypeName('');
    setIsAddingNewFormat(false);
    setNewFormatName('');
    setIsAddingNewProvider(false);
    setNewProviderName('');
  }, [isOpen, driveToEdit, preselectedDeviceName, devices, settings]);

  const handleAddNewDriveType = async () => {
    const clean = newTypeName.trim();
    if (!clean) return;
    try {
      await addOption('driveType', clean);
      setDriveType(clean);
      setNewTypeName('');
      setIsAddingNewType(false);
      showToast(`Tipo "${clean}" añadido.`, 'success');
    } catch {
      showToast('Error al añadir tipo de disco', 'error');
    }
  };

  const handleAddNewFormat = async () => {
    const clean = newFormatName.trim();
    if (!clean) return;
    try {
      await addOption('format', clean);
      setFormat(clean);
      setNewFormatName('');
      setIsAddingNewFormat(false);
      showToast(`Formato "${clean}" añadido.`, 'success');
    } catch {
      showToast('Error al añadir formato', 'error');
    }
  };

  const handleAddNewProvider = async () => {
    const clean = newProviderName.trim();
    if (!clean) return;
    try {
      await addOption('cloudProvider', clean);
      setCloudProvider(clean);
      setNewProviderName('');
      setIsAddingNewProvider(false);
      showToast(`Proveedor "${clean}" añadido.`, 'success');
    } catch {
      showToast('Error al añadir proveedor de nube', 'error');
    }
  };

  if (!isOpen) return null;

  // Reactivity handlers with strict constraints
  const handleCapacityChange = (valOrStr: number | string) => {
    if (valOrStr === '') {
      setCapacity('');
      return;
    }
    const val = Math.max(0, typeof valOrStr === 'number' ? valOrStr : parseFloat(valOrStr) || 0);
    setCapacity(val);

    if (typeof used === 'number') {
      const clampedUsed = Math.min(val, Math.max(0, used));
      setUsed(clampedUsed);
      setFree(Math.max(0, +(val - clampedUsed).toFixed(2)));
    } else if (typeof free === 'number') {
      const clampedFree = Math.min(val, Math.max(0, free));
      setFree(clampedFree);
      setUsed(Math.max(0, +(val - clampedFree).toFixed(2)));
    }
  };

  const handleUsedChange = (valOrStr: number | string) => {
    if (valOrStr === '') {
      setUsed('');
      return;
    }
    const rawVal = Math.max(0, typeof valOrStr === 'number' ? valOrStr : parseFloat(valOrStr) || 0);
    const maxCap = typeof capacity === 'number' && capacity >= 0 ? capacity : rawVal;
    const clampedUsed = Math.min(rawVal, maxCap);
    setUsed(clampedUsed);

    if (typeof capacity === 'number') {
      setFree(Math.max(0, +(capacity - clampedUsed).toFixed(2)));
    }
  };

  const handleFreeChange = (valOrStr: number | string) => {
    if (valOrStr === '') {
      setFree('');
      return;
    }
    const rawVal = Math.max(0, typeof valOrStr === 'number' ? valOrStr : parseFloat(valOrStr) || 0);
    const maxCap = typeof capacity === 'number' && capacity >= 0 ? capacity : rawVal;
    const clampedFree = Math.min(rawVal, maxCap);
    setFree(clampedFree);

    if (typeof capacity === 'number') {
      setUsed(Math.max(0, +(capacity - clampedFree).toFixed(2)));
    }
  };

  const handleMediumToggle = (medium: StorageMedium) => {
    setStorageMedium(medium);
    if (medium === 'cloud_network') {
      if (settings.formatOptions.includes('Cloud VFS / WebDAV')) {
        setFormat('Cloud VFS / WebDAV');
      }
      if (settings.driveTypes.some((t) => t.includes('Cloud'))) {
        const cloudType = settings.driveTypes.find((t) => t.includes('Cloud'));
        if (cloudType) setDriveType(cloudType);
      }
    } else {
      if (format === 'Cloud VFS / WebDAV') {
        setFormat(settings.formatOptions[0] || 'NTFS');
      }
      if (driveType.includes('Cloud')) {
        setDriveType(settings.driveTypes[0] || 'SSD (NVMe/PCIe)');
      }
    }
  };

  const handleAddTag = () => {
    const clean = tagInput.trim().toLowerCase();
    if (clean && !tags.includes(clean)) {
      setTags([...tags, clean]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const capNum = typeof capacity === 'number' ? capacity : parseFloat(String(capacity)) || 0;
    const usedNum = typeof used === 'number' ? used : parseFloat(String(used)) || 0;
    const freeNum = typeof free === 'number' ? free : parseFloat(String(free)) || 0;

    if (!drive.trim() || capNum <= 0) {
      showToast(t('driveValidationRequired'), 'warning');
      return;
    }

    if (capNum < 0 || usedNum < 0 || freeNum < 0) {
      showToast(t('driveValidationNegativeValues'), 'warning');
      return;
    }

    if (usedNum > capNum) {
      showToast(t('driveValidationUsedExceedsCapacity', { capacity: capNum }), 'warning');
      return;
    }

    if (freeNum > capNum) {
      showToast(t('driveValidationFreeExceedsCapacity', { capacity: capNum }), 'warning');
      return;
    }

    try {
      setIsSubmitting(true);
      await saveDrive({
        id: driveToEdit?.id,
        device: device.trim(),
        drive: drive.trim(),
        driveType,
        label,
        capacity: capNum,
        used: Math.min(capNum, usedNum),
        free: Math.min(capNum, freeNum),
        format,
        storageMedium,
        cloudProvider: storageMedium === 'cloud_network' ? cloudProvider : undefined,
        mountPoint: storageMedium === 'cloud_network' ? mountPoint : undefined,
        accountEmail: storageMedium === 'cloud_network' ? accountEmail : undefined,
        tags,
        notes,
      });

      showToast(t('toastDriveSaved'), 'success');
      onClose();
    } catch (err: any) {
      showToast(err?.message || 'Error al guardar unidad', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#18181c] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#27272b] my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-[#27272b] bg-slate-50/50 dark:bg-[#202024]/40">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl border ${
                storageMedium === 'physical'
                  ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/60'
                  : 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800/60'
              }`}
            >
              {storageMedium === 'physical' ? (
                <HardDrive className="w-5 h-5" />
              ) : (
                <Cloud className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-[#f4f4f5]">
                {driveToEdit ? t('driveModalTitleEdit') : t('driveModalTitleNew')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#a1a1aa]">
                {storageMedium === 'physical'
                  ? t('driveSubtitlePhysical')
                  : t('driveSubtitleCloud')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-[#f4f4f5] rounded-lg hover:bg-slate-100 dark:hover:bg-[#222226] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Medium Selection Tabs */}
        <div className="px-6 pt-5">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#a1a1aa] mb-2">
            {t('driveFieldMedium')}
          </label>
          <div className="grid grid-cols-2 gap-3 p-1 bg-slate-100 dark:bg-[#202024] rounded-xl border border-slate-200 dark:border-[#27272b]">
            <button
              type="button"
              onClick={() => handleMediumToggle('physical')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                storageMedium === 'physical'
                  ? 'bg-white dark:bg-[#18181c] text-purple-600 dark:text-purple-400 shadow-xs border border-slate-200 dark:border-[#2f2f36]'
                  : 'text-slate-600 dark:text-[#a1a1aa] hover:text-slate-900 dark:hover:text-[#f4f4f5]'
              }`}
            >
              <HardDrive className="w-4 h-4" />
              <span>{t('driveTabPhysical')}</span>
            </button>
            <button
              type="button"
              onClick={() => handleMediumToggle('cloud_network')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                storageMedium === 'cloud_network'
                  ? 'bg-white dark:bg-[#18181c] text-sky-600 dark:text-sky-400 shadow-xs border border-slate-200 dark:border-[#2f2f36]'
                  : 'text-slate-600 dark:text-[#a1a1aa] hover:text-slate-900 dark:hover:text-[#f4f4f5]'
              }`}
            >
              <Cloud className="w-4 h-4" />
              <span>{t('driveTabCloud')}</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Assigned Device & Drive Identifier */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#d4d4d8]">
                  {t('driveFieldDevice')}
                </label>
                <span className="text-[11px] text-slate-400 dark:text-[#71717a]">
                  {t('driveDeviceOptionalTip')}
                </span>
              </div>
              <select
                value={device}
                onChange={(e) => setDevice(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#202024] border border-slate-300 dark:border-[#27272b] rounded-xl text-sm text-slate-900 dark:text-[#f4f4f5] focus:ring-2 focus:ring-purple-500 focus:outline-none cursor-pointer"
              >
                <option value="">{t('driveDeviceUnassignedOption')}</option>
                {devices.map((dev) => (
                  <option key={dev.id} value={dev.name}>
                    {dev.name} ({dev.category})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#d4d4d8]">
                  {t('driveFieldIdentifier')} *
                </label>
                <span className={`text-[10px] font-mono ${drive.length >= 50 ? 'text-amber-500 font-bold' : 'text-slate-400 dark:text-[#71717a]'}`}>
                  {drive.length}/50
                </span>
              </div>
              <input
                type="text"
                maxLength={50}
                value={drive}
                onChange={(e) => setDrive(e.target.value)}
                placeholder={t('driveFieldIdentifierPlaceholder')}
                required
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#202024] border border-slate-300 dark:border-[#27272b] rounded-xl text-sm text-slate-900 dark:text-[#f4f4f5] focus:ring-2 focus:ring-purple-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* Label & Drive Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#d4d4d8]">
                  {t('driveFieldLabel')}
                </label>
                {label.length > 0 && (
                  <span className={`text-[10px] font-mono ${label.length >= 50 ? 'text-amber-500 font-bold' : 'text-slate-400 dark:text-[#71717a]'}`}>
                    {label.length}/50
                  </span>
                )}
              </div>
              <input
                type="text"
                maxLength={50}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={t('driveFieldLabelPlaceholder')}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#202024] border border-slate-300 dark:border-[#27272b] rounded-xl text-sm text-slate-900 dark:text-[#f4f4f5] focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#d4d4d8]">
                  {t('driveFieldType')}
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddingNewType(!isAddingNewType)}
                  className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline font-semibold"
                >
                  {isAddingNewType ? t('driveCancelType') : t('driveNewType')}
                </button>
              </div>

              {isAddingNewType ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    maxLength={40}
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    placeholder={t('driveNewTypePlaceholder')}
                    className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-[#202024] border border-purple-400 rounded-xl text-xs text-slate-900 dark:text-[#f4f4f5] focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddNewDriveType();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddNewDriveType}
                    className="px-2.5 py-1.5 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition-colors"
                  >
                    OK
                  </button>
                </div>
              ) : (
                <select
                  value={driveType}
                  onChange={(e) => setDriveType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#202024] border border-slate-300 dark:border-[#27272b] rounded-xl text-sm text-slate-900 dark:text-[#f4f4f5] focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  {availableDriveTypes.length === 0 ? (
                    <option value="">{t('settingsEmptyList')}</option>
                  ) : (
                    availableDriveTypes.map((dt) => (
                      <option key={dt} value={dt}>
                        {dt}
                      </option>
                    ))
                  )}
                </select>
              )}
            </div>
          </div>

          {/* Quick Sizes Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-[#d4d4d8] mb-1.5">
              {t('driveQuickSizes')}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_SIZES.map((sz) => (
                <button
                  key={sz.label}
                  type="button"
                  onClick={() => handleCapacityChange(sz.value)}
                  className={`px-2.5 py-1 text-xs rounded-lg font-mono border transition-all ${
                    capacity === sz.value
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs font-semibold'
                      : 'bg-slate-100 dark:bg-[#202024] text-slate-700 dark:text-[#d4d4d8] border-slate-200 dark:border-[#27272b] hover:bg-slate-200 dark:hover:bg-[#26262b]'
                  }`}
                >
                  {sz.label}
                </button>
              ))}
            </div>
          </div>

          {/* Smart Reactivity Storage Fields: Capacity, Used, Free */}
          <div className="p-3.5 bg-slate-50 dark:bg-[#202024]/60 rounded-xl border border-slate-200 dark:border-[#27272b] space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-[#d4d4d8] mb-1">
                  {t('driveFieldCapacity')} *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={capacity}
                    onChange={(e) => handleCapacityChange(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white dark:bg-[#18181c] border border-slate-300 dark:border-[#27272b] rounded-lg text-sm text-slate-900 dark:text-[#f4f4f5] font-mono focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                  <span className="absolute right-3 top-2 text-xs text-slate-400 font-mono">GB</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-amber-600 dark:text-amber-400">
                    {t('driveFieldUsed')}
                  </label>
                  {typeof capacity === 'number' && capacity > 0 && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      Máx: {capacity} GB
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max={typeof capacity === 'number' && capacity > 0 ? capacity : undefined}
                    step="any"
                    value={used}
                    onChange={(e) => handleUsedChange(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-[#18181c] border border-amber-300 dark:border-amber-700/60 rounded-lg text-sm text-slate-900 dark:text-[#f4f4f5] font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <span className="absolute right-3 top-2 text-xs text-slate-400 font-mono">GB</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {t('driveFieldFree')}
                  </label>
                  {typeof capacity === 'number' && capacity > 0 && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      Máx: {capacity} GB
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max={typeof capacity === 'number' && capacity > 0 ? capacity : undefined}
                    step="any"
                    value={free}
                    onChange={(e) => handleFreeChange(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-[#18181c] border border-emerald-300 dark:border-emerald-700/60 rounded-lg text-sm text-slate-900 dark:text-[#f4f4f5] font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <span className="absolute right-3 top-2 text-xs text-slate-400 font-mono">GB</span>
                </div>
              </div>
            </div>

            {/* Visual ratio & capacity validation banner */}
            {typeof capacity === 'number' && capacity > 0 && (
              <div className="pt-2 border-t border-slate-200 dark:border-[#2f2f35]">
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-[#a1a1aa] mb-1.5 font-mono">
                  <span>
                    {typeof used === 'number' ? used : 0} GB ocupado (
                    {Math.min(100, Math.round(((Number(used) || 0) / capacity) * 100))}%)
                  </span>
                  <span>
                    {typeof free === 'number' ? free : 0} GB libre (
                    {Math.min(100, Math.round(((Number(free) || 0) / capacity) * 100))}%)
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-[#2a2a30] overflow-hidden flex">
                  <div
                    className="h-full bg-amber-500 transition-all duration-200"
                    style={{ width: `${Math.min(100, Math.max(0, ((Number(used) || 0) / capacity) * 100))}%` }}
                  />
                  <div
                    className="h-full bg-emerald-500 transition-all duration-200"
                    style={{ width: `${Math.min(100, Math.max(0, ((Number(free) || 0) / capacity) * 100))}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 dark:text-[#71717a] mt-1.5 flex items-center gap-1">
                  <span>🔒</span> {t('driveCapacityConstraintHint')}
                </p>
              </div>
            )}

            {typeof capacity === 'number' && (Number(used) > capacity || Number(free) > capacity) && (
              <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{t('driveValidationUsedExceedsCapacity', { capacity })}</span>
              </div>
            )}
          </div>

          {/* Filesystem Format */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#d4d4d8]">
                  {t('driveFieldFormat')}
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddingNewFormat(!isAddingNewFormat)}
                  className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline font-semibold"
                >
                  {isAddingNewFormat ? t('driveCancelFormat') : t('driveNewFormat')}
                </button>
              </div>

              {isAddingNewFormat ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    maxLength={25}
                    value={newFormatName}
                    onChange={(e) => setNewFormatName(e.target.value)}
                    placeholder={t('driveNewFormatPlaceholder')}
                    className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-[#202024] border border-purple-400 rounded-xl text-xs text-slate-900 dark:text-[#f4f4f5] focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddNewFormat();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddNewFormat}
                    className="px-2.5 py-1.5 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition-colors"
                  >
                    OK
                  </button>
                </div>
              ) : (
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#202024] border border-slate-300 dark:border-[#27272b] rounded-xl text-sm text-slate-900 dark:text-[#f4f4f5] focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  {availableFormats.length === 0 ? (
                    <option value="">{t('settingsEmptyList')}</option>
                  ) : (
                    availableFormats.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))
                  )}
                </select>
              )}
            </div>

            {/* Cloud Provider if Cloud Medium */}
            {storageMedium === 'cloud_network' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-[#d4d4d8]">
                    {t('driveFieldCloudProvider')}
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAddingNewProvider(!isAddingNewProvider)}
                    className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline font-semibold"
                  >
                    {isAddingNewProvider ? t('driveCancelProvider') : t('driveNewProvider')}
                  </button>
                </div>

                {isAddingNewProvider ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      maxLength={40}
                      value={newProviderName}
                      onChange={(e) => setNewProviderName(e.target.value)}
                      placeholder={t('driveNewProviderPlaceholder')}
                      className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-[#202024] border border-purple-400 rounded-xl text-xs text-slate-900 dark:text-[#f4f4f5] focus:outline-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddNewProvider();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddNewProvider}
                      className="px-2.5 py-1.5 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition-colors"
                    >
                      OK
                    </button>
                  </div>
                ) : (
                  <select
                    value={cloudProvider}
                    onChange={(e) => setCloudProvider(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#202024] border border-slate-300 dark:border-[#27272b] rounded-xl text-sm text-slate-900 dark:text-[#f4f4f5] focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  >
                    {availableCloudProviders.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>

          {/* Cloud Specific Fields */}
          {storageMedium === 'cloud_network' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-sky-50/60 dark:bg-sky-950/20 rounded-xl border border-sky-200 dark:border-sky-800/40">
              <div>
                <label className="block text-xs font-semibold text-sky-900 dark:text-sky-300 mb-1">
                  {t('driveFieldMountPoint')}
                </label>
                <input
                  type="text"
                  maxLength={100}
                  value={mountPoint}
                  onChange={(e) => setMountPoint(e.target.value)}
                  placeholder={t('driveFieldMountPointPlaceholder')}
                  className="w-full px-3 py-1.5 bg-white dark:bg-[#18181c] border border-sky-300 dark:border-sky-700 rounded-lg text-sm text-slate-900 dark:text-[#f4f4f5] font-mono focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-sky-900 dark:text-sky-300 mb-1">
                  {t('driveFieldAccountEmail')}
                </label>
                <input
                  type="email"
                  maxLength={100}
                  value={accountEmail}
                  onChange={(e) => setAccountEmail(e.target.value)}
                  placeholder={t('driveFieldAccountPlaceholder')}
                  className="w-full px-3 py-1.5 bg-white dark:bg-[#18181c] border border-sky-300 dark:border-sky-700 rounded-lg text-sm text-slate-900 dark:text-[#f4f4f5] focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-[#d4d4d8] mb-1.5 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-slate-400" />
              <span>{t('driveFieldTags')}</span>
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                maxLength={25}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder={t('driveTagInputPlaceholder')}
                className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-[#202024] border border-slate-300 dark:border-[#27272b] rounded-lg text-sm text-slate-900 dark:text-[#f4f4f5] focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3 py-1.5 bg-slate-200 dark:bg-[#26262b] hover:bg-slate-300 dark:hover:bg-[#2e2e33] text-slate-800 dark:text-[#f4f4f5] text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('settingsBtnAdd')}</span>
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tg) => (
                  <span
                    key={tg}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-[#202024] text-slate-700 dark:text-[#d4d4d8] border border-slate-200 dark:border-[#27272b]"
                  >
                    #{tg}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tg)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-[#f4f4f5]"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#d4d4d8]">
                {t('driveFieldNotes')}
              </label>
              <span className={`text-[10px] font-mono ${notes.length >= 500 ? 'text-amber-500 font-bold' : 'text-slate-400 dark:text-[#71717a]'}`}>
                {notes.length}/500
              </span>
            </div>
            <textarea
              rows={2}
              maxLength={500}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('driveFieldNotesPlaceholder')}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#202024] border border-slate-300 dark:border-[#27272b] rounded-xl text-sm text-slate-900 dark:text-[#f4f4f5] focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-[#27272b]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-[#d4d4d8] hover:bg-slate-100 dark:hover:bg-[#222226] rounded-xl transition-colors"
            >
              {t('driveBtnCancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs disabled:opacity-50 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? t('driveBtnSaving') : t('driveBtnSave')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
