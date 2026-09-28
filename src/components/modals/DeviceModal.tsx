import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Gamepad2,
  Laptop,
  Image,
  Check,
  Trash2,
  Plus,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { Device } from '../../types';
import { useStorage } from '../../context/StorageContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { EMULATION_SYSTEMS, EMULATION_GROUPS } from '../../data/emulationCatalog';
import { StarRatingInput } from '../common/StarRatingInput';
import { getSafeRating } from '../../utils/ratingColors';

interface DeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  deviceToEdit?: Device | null;
}

export const DeviceModal: React.FC<DeviceModalProps> = ({
  isOpen,
  onClose,
  deviceToEdit,
}) => {
  const { devices, settings, saveDevice, addOption } = useStorage();
  const { t } = useLanguage();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [isAddingNewCat, setIsAddingNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  const [system, setSystem] = useState('');
  const [cpu, setCpu] = useState('');
  const [rating, setRating] = useState<number>(5);
  const [imageUrl, setImageUrl] = useState('');
  const [imgError, setImgError] = useState(false);

  const [isGamingDevice, setIsGamingDevice] = useState(true);
  const [emulationOverview, setEmulationOverview] = useState('');
  const [emulationScores, setEmulationScores] = useState<Record<string, number>>({});
  const [selectedSystemToAdd, setSelectedSystemToAdd] = useState('');

  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-sync available categories
  const availableCategories = useMemo(() => {
    return Array.from(
      new Set(
        [
          ...(settings.deviceCategories || []),
          ...devices.map((d) => d.category),
          category,
        ].filter(Boolean)
      )
    );
  }, [settings.deviceCategories, devices, category]);

  // Normalized image URL helper
  const normalizedImageUrl = useMemo(() => {
    const trimmed = imageUrl.trim();
    if (!trimmed) return '';
    if (/^(https?:\/\/|data:|\/)/i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  }, [imageUrl]);

  const hasInitializedRef = useRef(false);
  const lastEditIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      hasInitializedRef.current = false;
      lastEditIdRef.current = null;
      return;
    }

    const currentEditId = deviceToEdit?.id || null;
    if (hasInitializedRef.current && lastEditIdRef.current === currentEditId) {
      // Form already initialized for this modal session; keep user input intact
      return;
    }

    hasInitializedRef.current = true;
    lastEditIdRef.current = currentEditId;

    if (deviceToEdit) {
      setName(deviceToEdit.name);
      setCategory(deviceToEdit.category || settings.deviceCategories?.[0] || '');
      setSystem(deviceToEdit.system);
      setCpu(deviceToEdit.cpu || '');
      setRating(getSafeRating(deviceToEdit.rating, 5));
      setImageUrl(deviceToEdit.imageUrl || '');
      setImgError(false);
      setIsGamingDevice(deviceToEdit.isGamingDevice ?? true);
      setEmulationOverview(deviceToEdit.emulationOverview || '');
      setEmulationScores(deviceToEdit.emulationScores ? { ...deviceToEdit.emulationScores } : {});
      setNotes(deviceToEdit.notes || '');
    } else {
      setName('');
      setCategory(settings.deviceCategories?.[0] || '');
      setSystem('');
      setCpu('');
      setRating(5);
      setImageUrl('');
      setImgError(false);
      setIsGamingDevice(true);
      setEmulationOverview('');
      setEmulationScores({});
      setNotes('');
    }
    setIsAddingNewCat(false);
    setNewCatName('');
    setSelectedSystemToAdd('');
  }, [isOpen, deviceToEdit, settings.deviceCategories]);

  if (!isOpen) return null;

  const handleAddNewCategory = async () => {
    const clean = newCatName.trim();
    if (!clean) return;
    try {
      await addOption('category', clean);
      setCategory(clean);
      setNewCatName('');
      setIsAddingNewCat(false);
      showToast(`Categoría "${clean}" añadida.`, 'success');
    } catch {
      showToast('Error al añadir categoría', 'error');
    }
  };

  const handleAddSystem = (systemId: string) => {
    if (!systemId) return;
    setEmulationScores((prev) => ({
      ...prev,
      [systemId]: prev[systemId] || 5, // Default 5 stars
    }));
    setSelectedSystemToAdd('');
  };

  const handleRemoveSystem = (systemId: string) => {
    setEmulationScores((prev) => {
      const next = { ...prev };
      delete next[systemId];
      return next;
    });
  };

  const handleScoreChange = (systemId: string, score: number) => {
    setEmulationScores((prev) => ({
      ...prev,
      [systemId]: score,
    }));
  };

  const handleClearAllScores = () => {
    setEmulationScores({});
  };

  // Quick group presets
  const handleAddQuickGroup = (groupType: 'retro' | 'mid' | 'high' | 'arcade') => {
    const targetMap: Record<string, number> = { ...emulationScores };

    if (groupType === 'retro') {
      // 8/16-Bit: NES, SNES, Genesis, Game Boy, Atari 2600, Master System, PC Engine, GBC
      const retroIds = [
        'NES',
        'SNES',
        'Genesis / Mega Drive',
        'Game Boy',
        'Game Boy Color',
        'Master System / Mark III',
        'PC Engine / TurboGrafx-16',
        'Atari 2600',
        'Game Gear',
      ];
      retroIds.forEach((id) => {
        if (targetMap[id] === undefined) targetMap[id] = 5;
      });
    } else if (groupType === 'mid') {
      // 32/64-Bit & PSP: PS1, N64, Saturn, Dreamcast, GBA, PSP
      const midIds = [
        'PlayStation',
        'Nintendo 64',
        'Sega Saturn',
        'Dreamcast',
        'Game Boy Advance',
        'PlayStation Portable (PSP)',
        'Nintendo DS',
      ];
      midIds.forEach((id) => {
        if (targetMap[id] === undefined) targetMap[id] = 5;
      });
    } else if (groupType === 'high') {
      // High-End: PS2, GameCube, Wii, 3DS, Switch, PS Vita
      const highIds = [
        'PlayStation 2',
        'Nintendo GameCube',
        'Nintendo Wii',
        'Nintendo 3DS',
        'PlayStation Vita',
        'Nintendo Switch',
      ];
      highIds.forEach((id) => {
        if (targetMap[id] === undefined) targetMap[id] = 3;
      });
    } else if (groupType === 'arcade') {
      // Arcade & Engines
      const arcadeIds = [
        'Arcade (MAME / FBNeo)',
        'SNK Neo Geo AES / MVS',
        'Capcom CPS-1 / CPS-2 / CPS-3',
        'ScummVM',
      ];
      arcadeIds.forEach((id) => {
        if (targetMap[id] === undefined) targetMap[id] = 5;
      });
    }

    setEmulationScores(targetMap);
  };

  const getGroupBadgeInfo = (groupId?: string) => {
    switch (groupId) {
      case 'gen2':
        return { label: '2da Gen', color: 'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300' };
      case 'gen3':
        return { label: '8-Bit', color: 'bg-orange-100 text-orange-900 dark:bg-orange-950/80 dark:text-orange-300' };
      case 'gen4':
        return { label: '16-Bit', color: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300' };
      case 'gen5':
        return { label: '32/64-Bit', color: 'bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-200' };
      case 'gen6':
        return { label: '128-Bit & GBA', color: 'bg-sky-100 text-sky-900 dark:bg-sky-950/80 dark:text-sky-300' };
      case 'gen7':
        return { label: 'HD 2000s / PSP', color: 'bg-purple-100 text-purple-900 dark:bg-purple-950/80 dark:text-purple-300' };
      case 'modern':
        return { label: 'Modernas', color: 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950/80 dark:text-indigo-300' };
      case 'arcade_ports':
        return { label: 'Arcade', color: 'bg-teal-100 text-teal-900 dark:bg-teal-950/80 dark:text-teal-300' };
      default:
        return { label: 'Retro', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' };
    }
  };

  const ratedCount = Object.keys(emulationScores).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast(t('toastEnterDeviceName'), 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await saveDevice({
        id: deviceToEdit?.id,
        name: name.trim(),
        category,
        system: system.trim() || 'Desconocido',
        cpu: cpu.trim() || undefined,
        rating: getSafeRating(rating, 5),
        imageUrl: normalizedImageUrl || undefined,
        isGamingDevice,
        emulationOverview: isGamingDevice ? emulationOverview.trim() || undefined : undefined,
        emulationScores: isGamingDevice ? emulationScores : undefined,
        notes: notes.trim() || undefined,
      });

      showToast(t('toastDeviceSaved'), 'success');
      onClose();
    } catch (err: any) {
      showToast(err?.message || 'Error al guardar dispositivo', 'error');
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
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800/60">
              {isGamingDevice ? (
                <Gamepad2 className="w-5 h-5" />
              ) : (
                <Laptop className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-[#f4f4f5]">
                {deviceToEdit ? t('deviceModalTitleEdit') : t('deviceModalTitleNew')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#a1a1aa]">
                {t('deviceSubtitleModal')}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[78vh] overflow-y-auto">
          {/* Device Name & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#d4d4d8]">
                  {t('deviceFieldName')} *
                </label>
                <span className={`text-[10px] font-mono ${name.length >= 60 ? 'text-amber-500 font-bold' : 'text-slate-400 dark:text-[#71717a]'}`}>
                  {name.length}/60
                </span>
              </div>
              <input
                type="text"
                maxLength={60}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('deviceFieldNamePlaceholder')}
                required
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#202024] border border-slate-300 dark:border-[#27272b] rounded-xl text-sm text-slate-900 dark:text-[#f4f4f5] focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#d4d4d8]">
                  {t('deviceFieldCategory')} *
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddingNewCat(!isAddingNewCat)}
                  className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isAddingNewCat ? t('deviceCancelCat') : 'Nueva'}</span>
                </button>
              </div>

              {isAddingNewCat ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    maxLength={40}
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder={t('deviceNewCatPlaceholder')}
                    className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-[#202024] border border-purple-400 rounded-xl text-xs text-slate-900 dark:text-[#f4f4f5] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddNewCategory}
                    className="px-2.5 py-1.5 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition-colors"
                  >
                    OK
                  </button>
                </div>
              ) : (
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#202024] border border-slate-300 dark:border-[#27272b] rounded-xl text-sm text-slate-900 dark:text-[#f4f4f5] focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  {availableCategories.length === 0 ? (
                    <option value="">{t('settingsEmptyList')}</option>
                  ) : (
                    availableCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))
                  )}
                </select>
              )}
            </div>
          </div>

          {/* System (OS) & CPU */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#d4d4d8]">
                  {t('deviceFieldSystem')} *
                </label>
                <span className={`text-[10px] font-mono ${system.length >= 50 ? 'text-amber-500 font-bold' : 'text-slate-400 dark:text-[#71717a]'}`}>
                  {system.length}/50
                </span>
              </div>
              <input
                type="text"
                maxLength={50}
                value={system}
                onChange={(e) => setSystem(e.target.value)}
                placeholder={t('deviceFieldSystemPlaceholder')}
                required
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#202024] border border-slate-300 dark:border-[#27272b] rounded-xl text-sm text-slate-900 dark:text-[#f4f4f5] focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#d4d4d8]">
                  {t('deviceFieldCpu')}
                </label>
                <span className={`text-[10px] font-mono ${cpu.length >= 60 ? 'text-amber-500 font-bold' : 'text-slate-400 dark:text-[#71717a]'}`}>
                  {cpu.length}/60
                </span>
              </div>
              <input
                type="text"
                maxLength={60}
                value={cpu}
                onChange={(e) => setCpu(e.target.value)}
                placeholder={t('deviceFieldCpuPlaceholder')}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#202024] border border-slate-300 dark:border-[#27272b] rounded-xl text-sm text-slate-900 dark:text-[#f4f4f5] focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Physical Condition Star Rating (Interactive Stars only, top-right meaning) */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#27272b] bg-slate-50/60 dark:bg-[#202024]/40">
            <StarRatingInput
              value={rating}
              onChange={setRating}
              label={t('devicesConditionRating')}
              size="md"
            />
          </div>

          {/* Image URL with Flexible Non-blocking Validation and Preview */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#d4d4d8]">
                {t('deviceFieldImageUrl')}
              </label>
              {imageUrl.length > 0 && (
                <span className={`text-[10px] font-mono ${imageUrl.length >= 500 ? 'text-amber-500 font-bold' : 'text-slate-400 dark:text-[#71717a]'}`}>
                  {imageUrl.length}/500
                </span>
              )}
            </div>
            <div className="relative">
              <Image className="w-4 h-4 absolute left-3 top-3 text-slate-400 dark:text-[#71717a]" />
              <input
                type="text"
                maxLength={500}
                value={imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value);
                  setImgError(false);
                }}
                placeholder={t('deviceFieldImageUrlPlaceholder')}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#202024] border border-slate-300 dark:border-[#27272b] rounded-xl text-sm text-slate-900 dark:text-[#f4f4f5] focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            {/* Live Preview / Friendly Error Indicator */}
            {normalizedImageUrl && (
              <div className="mt-2.5 p-3 rounded-xl border border-slate-200 dark:border-[#27272b] bg-slate-50/50 dark:bg-[#202024]/60">
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-slate-900 border border-slate-300 dark:border-[#333338] shrink-0">
                    <img
                      src={normalizedImageUrl}
                      alt={name || 'Device'}
                      className={`w-full h-full object-cover transition-opacity ${
                        imgError ? 'opacity-20' : 'opacity-100'
                      }`}
                      onError={() => setImgError(true)}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    {imgError ? (
                      <div className="flex items-start gap-1.5 text-amber-600 dark:text-amber-400">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <p className="text-xs">
                          {t('deviceImgLoadError')}
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs">
                        <Check className="w-4 h-4 shrink-0" />
                        <span className="font-medium truncate">{t('deviceImgSuccess')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Gaming Device Toggle & Emulation Section */}
          <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-900/40 bg-purple-50/40 dark:bg-purple-950/20 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-purple-600 text-white shadow-xs">
                  <Gamepad2 className="w-4 h-4" />
                </div>
                <div>
                  <label className="font-bold text-xs text-purple-950 dark:text-purple-200 cursor-pointer">
                    {t('deviceFieldIsGaming')}
                  </label>
                  <p className="text-[11px] text-purple-700/80 dark:text-purple-300/80">
                    {t('deviceFieldIsGamingDesc')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsGamingDevice(!isGamingDevice)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  isGamingDevice ? 'bg-purple-600' : 'bg-slate-300 dark:bg-[#26262b]'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    isGamingDevice ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* If Gaming Device: Show Overview and Full Interactive Star Ratings Section */}
            {isGamingDevice && (
              <div className="pt-3 border-t border-purple-200/80 dark:border-purple-900/50 space-y-4">
                {/* Emulation Performance Overview */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-purple-950 dark:text-purple-200">
                      {t('deviceFieldEmulationOverview')}
                    </label>
                    <span className={`text-[10px] font-mono ${emulationOverview.length >= 300 ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-purple-700/70 dark:text-purple-300/70'}`}>
                      {emulationOverview.length}/300
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    maxLength={300}
                    value={emulationOverview}
                    onChange={(e) => setEmulationOverview(e.target.value)}
                    placeholder={t('deviceFieldEmulationOverviewPlaceholder')}
                    className="w-full px-3 py-2 bg-white dark:bg-[#18181c] border border-purple-200 dark:border-purple-800/80 rounded-xl text-sm text-slate-900 dark:text-[#f4f4f5] focus:ring-2 focus:ring-purple-500 focus:outline-none placeholder:text-slate-400"
                  />
                </div>

                {/* Calificaciones de Emulación Section */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-purple-950 dark:text-purple-200">
                        {t('deviceEmulationRatingsTitle')}
                      </h4>
                      <p className="text-[11px] text-purple-700/80 dark:text-purple-300/80">
                        {t('deviceEmulationRatingsSubtitle')}
                      </p>
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
                      {t('deviceEvaluatedCountBadge', { rated: ratedCount, total: EMULATION_SYSTEMS.length })}
                    </span>
                  </div>

                  {/* Add Platform Select + Clear All Button */}
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedSystemToAdd}
                      onChange={(e) => handleAddSystem(e.target.value)}
                      className="flex-1 px-3 py-2 bg-white dark:bg-[#18181c] border border-purple-200 dark:border-purple-800/80 rounded-xl text-xs font-semibold text-slate-800 dark:text-[#d4d4d8] focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">{t('deviceAddSystemPlaceholder')}</option>
                      {EMULATION_SYSTEMS.filter((s) => emulationScores[s.id] === undefined).map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.year})
                        </option>
                      ))}
                    </select>

                    {ratedCount > 0 && (
                      <button
                        type="button"
                        onClick={handleClearAllScores}
                        className="px-3 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl border border-red-200 dark:border-red-900/60 transition-colors"
                      >
                        {t('deviceClearScores')}
                      </button>
                    )}
                  </div>

                  {/* Quick Group Presets */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-[#a1a1aa]">
                      {t('deviceQuickGroupTitle')}
                    </span>
                    <div className="flex flex-wrap gap-1.5 text-xs">
                      <button
                        type="button"
                        onClick={() => handleAddQuickGroup('retro')}
                        className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#18181c] border border-purple-200 dark:border-purple-800/60 text-purple-700 dark:text-purple-300 hover:border-purple-400 text-[11px] font-semibold transition-colors"
                      >
                        {t('deviceQuickGroupRetro')}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddQuickGroup('mid')}
                        className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#18181c] border border-purple-200 dark:border-purple-800/60 text-purple-700 dark:text-purple-300 hover:border-purple-400 text-[11px] font-semibold transition-colors"
                      >
                        {t('deviceQuickGroupMid')}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddQuickGroup('high')}
                        className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#18181c] border border-purple-200 dark:border-purple-800/60 text-purple-700 dark:text-purple-300 hover:border-purple-400 text-[11px] font-semibold transition-colors"
                      >
                        {t('deviceQuickGroupHigh')}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddQuickGroup('arcade')}
                        className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#18181c] border border-purple-200 dark:border-purple-800/60 text-purple-700 dark:text-purple-300 hover:border-purple-400 text-[11px] font-semibold transition-colors"
                      >
                        {t('deviceQuickGroupArcade')}
                      </button>
                    </div>
                  </div>

                  {/* Rated Systems Cards Grid - Single column to display full console names cleanly */}
                  {ratedCount > 0 ? (
                    <div className="grid grid-cols-1 gap-2 pt-2 max-h-72 overflow-y-auto pr-1">
                      {Object.entries(emulationScores).map(([sysId, currentScore]) => {
                        const sysDef = EMULATION_SYSTEMS.find((s) => s.id === sysId);
                        const groupBadge = getGroupBadgeInfo(sysDef?.groupId);
                        return (
                          <div
                            key={sysId}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-white dark:bg-[#18181c] border border-purple-100 dark:border-purple-900/60 shadow-xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 border ${groupBadge.color}`}
                              >
                                {groupBadge.label}
                              </span>
                              <div className="min-w-0">
                                <p
                                  className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-[#f4f4f5] truncate"
                                  title={sysDef?.name || sysId}
                                >
                                  {sysDef?.name || sysDef?.shortName || sysId}
                                </p>
                                {sysDef?.shortName && sysDef?.shortName !== sysDef?.name && (
                                  <p className="text-[10px] text-slate-400 dark:text-[#71717a] truncate font-mono">
                                    {sysDef.shortName} • {sysDef.year}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                              <select
                                value={currentScore}
                                onChange={(e) => handleScoreChange(sysId, Number(e.target.value))}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${
                                  currentScore === 5
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                                    : currentScore === 4
                                    ? 'bg-lime-50 text-lime-700 border-lime-300 dark:bg-lime-950/60 dark:text-lime-300 dark:border-lime-800'
                                    : currentScore === 3
                                    ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                                    : currentScore === 2
                                    ? 'bg-orange-50 text-orange-700 border-orange-300 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800'
                                    : 'bg-red-50 text-red-700 border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800'
                                }`}
                              >
                                <option value={5}>{t('deviceScaleFullSpeed')}</option>
                                <option value={4}>{t('deviceScaleVeryGood')}</option>
                                <option value={3}>{t('deviceScalePlayable')}</option>
                                <option value={2}>{t('deviceScaleSlow')}</option>
                                <option value={1}>{t('deviceScaleUnplayable')}</option>
                              </select>

                              <button
                                type="button"
                                onClick={() => handleRemoveSystem(sysId)}
                                className="p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                                title={t('deviceRemoveRating')}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-3 text-center rounded-xl bg-white/70 dark:bg-[#18181c]/60 border border-purple-100 dark:border-purple-900/40 text-xs text-slate-500 dark:text-[#a1a1aa]">
                      {t('deviceNoScoresYet')}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* General Notes */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#d4d4d8]">
                {t('deviceFieldNotes')}
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
              placeholder={t('deviceFieldNotesPlaceholder')}
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
              {t('deviceBtnCancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs disabled:opacity-50 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? t('deviceBtnSaving') : t('deviceBtnSave')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
