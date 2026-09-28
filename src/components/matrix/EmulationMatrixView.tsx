import React, { useState, useMemo, useEffect } from 'react';
import {
  Gamepad2,
  Search,
  Star,
  Sparkles,
  Info,
  Filter,
  CheckCircle2,
  Check,
  RotateCcw,
  X,
  Layers,
  LayoutGrid,
  Table as TableIcon,
  HelpCircle,
  Laptop,
} from 'lucide-react';
import { Device, EmulationSystem } from '../../types';
import { useStorage } from '../../context/StorageContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import {
  EMULATION_SYSTEMS,
  EMULATION_GROUPS,
  RATING_DESCRIPTIONS,
} from '../../data/emulationCatalog';

interface EmulationMatrixViewProps {
  initialSelectedDeviceId?: string | null;
}

export const EmulationMatrixView: React.FC<EmulationMatrixViewProps> = ({
  initialSelectedDeviceId,
}) => {
  const { devices, updateEmulationScore, clearEmulationScore } = useStorage();
  const { t, language } = useLanguage();
  const { showToast } = useToast();

  const [searchPlatform, setSearchPlatform] = useState('');
  const [searchConsole, setSearchConsole] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [onlyEvaluated, setOnlyEvaluated] = useState(false);
  const [matrixViewMode, setMatrixViewMode] = useState<'detailed' | 'horizontal'>('detailed');

  // Multi-device filter state (Array of device IDs, empty array means ALL devices)
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>(() => {
    if (initialSelectedDeviceId) {
      return [initialSelectedDeviceId];
    }
    return [];
  });

  // Sync when initialSelectedDeviceId prop changes
  useEffect(() => {
    if (initialSelectedDeviceId) {
      setSelectedDeviceIds([initialSelectedDeviceId]);
    }
  }, [initialSelectedDeviceId]);

  // Active rating popover
  const [activeCell, setActiveCell] = useState<{
    deviceId: string;
    systemId: string;
    currentScore: number;
    systemName: string;
    deviceName: string;
  } | null>(null);

  // All gaming devices registered
  const allGamingDevices = useMemo(() => {
    return devices.filter((d) => d.isGamingDevice);
  }, [devices]);

  // Filtered gaming devices based on selectedDeviceIds and text search
  const gamingDevices = useMemo(() => {
    return allGamingDevices.filter((d) => {
      // If user selected specific devices, filter by that list
      if (selectedDeviceIds.length > 0 && !selectedDeviceIds.includes(d.id)) {
        return false;
      }
      if (searchConsole.trim()) {
        const q = searchConsole.toLowerCase();
        const matchName = d.name.toLowerCase().includes(q);
        const matchSys = d.system.toLowerCase().includes(q);
        const matchCpu = (d.cpu || '').toLowerCase().includes(q);
        if (!matchName && !matchSys && !matchCpu) return false;
      }
      return true;
    });
  }, [allGamingDevices, selectedDeviceIds, searchConsole]);

  const toggleDeviceSelection = (deviceId: string) => {
    setSelectedDeviceIds((prev) => {
      if (prev.includes(deviceId)) {
        const next = prev.filter((id) => id !== deviceId);
        return next;
      } else {
        return [...prev, deviceId];
      }
    });
  };

  const clearDeviceFilter = () => {
    setSelectedDeviceIds([]);
  };

  // Filtered systems list
  const filteredSystems = useMemo(() => {
    return EMULATION_SYSTEMS.filter((sys) => {
      // Group filter
      if (selectedGroup !== 'all' && sys.groupId !== selectedGroup) return false;

      // Text search
      if (searchPlatform.trim()) {
        const q = searchPlatform.toLowerCase();
        const matchName = sys.name.toLowerCase().includes(q);
        const matchAlt = sys.shortName?.toLowerCase().includes(q);
        const matchManufacturer = sys.manufacturer?.toLowerCase().includes(q);
        if (!matchName && !matchAlt && !matchManufacturer) return false;
      }

      // Only evaluated filter
      if (onlyEvaluated) {
        const hasAnyScore = gamingDevices.some(
          (d) => d.emulationScores && d.emulationScores[sys.id] !== undefined
        );
        if (!hasAnyScore) return false;
      }

      return true;
    });
  }, [selectedGroup, searchPlatform, onlyEvaluated, gamingDevices]);

  const handleRate = async (deviceId: string, systemId: string, rating: number) => {
    try {
      await updateEmulationScore(deviceId, systemId, rating);
      showToast(t('toastScoreUpdated'), 'success');
      setActiveCell(null);
    } catch (err: any) {
      showToast(err?.message || 'Error al actualizar calificación', 'error');
    }
  };

  const handleClear = async (deviceId: string, systemId: string) => {
    try {
      await clearEmulationScore(deviceId, systemId);
      showToast('Calificación eliminada.', 'info');
      setActiveCell(null);
    } catch (err: any) {
      showToast(err?.message || 'Error al eliminar calificación', 'error');
    }
  };

  // Group styling helper
  const getGroupBadgeColor = (groupId: string) => {
    switch (groupId) {
      case 'gen2':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-700/60';
      case 'gen3':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-950/80 dark:text-orange-300 border-orange-300 dark:border-orange-700/60';
      case 'gen4':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/60';
      case 'gen5':
        return 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700';
      case 'gen6':
        return 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border-sky-300 dark:border-sky-700/60';
      case 'gen7':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border-purple-300 dark:border-purple-700/60';
      case 'modern':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700/60';
      case 'arcade_ports':
        return 'bg-teal-100 text-teal-800 dark:bg-teal-950/80 dark:text-teal-300 border-teal-300 dark:border-teal-700/60';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200';
    }
  };

  const getScoreChip = (score?: number) => {
    if (!score) {
      return (
        <span className="inline-flex items-center justify-center w-8 h-6 rounded-md font-mono text-[11px] font-bold bg-slate-100 dark:bg-[#222226] text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-[#2f2f36]">
          -
        </span>
      );
    }
    const colorClasses =
      {
        5: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40',
        4: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/40',
        3: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40',
        2: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/40',
        1: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/40',
      }[score] || 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/40';

    return (
      <span
        className={`inline-flex items-center justify-center gap-1 px-2 h-6 rounded-md font-mono text-[11px] font-bold border ${colorClasses}`}
      >
        <Star className="w-3 h-3 fill-current shrink-0" />
        <span>{score}</span>
      </span>
    );
  };

  if (allGamingDevices.length === 0) {
    return (
      <div className="p-12 text-center bg-white dark:bg-[#0f172a] rounded-3xl border border-slate-200 dark:border-slate-800">
        <div className="w-16 h-16 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto mb-4">
          <Gamepad2 className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          {t('matrixNoGamingDevicesTitle')}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-md mx-auto leading-relaxed">
          {t('matrixNoGamingDevicesDesc')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* 1. Header with Title & Rating Scale Chips */}
      <div className="p-5 bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-200 dark:border-purple-800/60 shrink-0">
            <Gamepad2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
              {t('matrixGlobalTitle')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t('matrixGlobalSubtitle', { count: gamingDevices.length })}
            </p>
          </div>
        </div>

        {/* Rating Scale Legend Chips directly on header */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs font-mono">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            <Star className="w-3 h-3 fill-current" />
            <span>5 = {t('matrixScaleFullSpeed')}</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg font-bold bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30">
            <Star className="w-3 h-3 fill-current" />
            <span>4 = {t('matrixScaleVeryGood')}</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            <Star className="w-3 h-3 fill-current" />
            <span>3 = {t('matrixScalePlayable')}</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg font-bold bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30">
            <Star className="w-3 h-3 fill-current" />
            <span>2 = {t('matrixScaleSlow')}</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
            <Star className="w-3 h-3 fill-current" />
            <span>1 = {t('matrixScaleUnplayable')}</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg font-bold bg-slate-100 dark:bg-[#222226] text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-[#2f2f36]">
            <span>- = {t('matrixScaleUntested')}</span>
          </span>
        </div>
      </div>

      {/* 2. Multi-Device Filter Bar (Choose one, multiple, or all devices) */}
      <div className="p-3.5 bg-white dark:bg-[#18181c] rounded-2xl border border-slate-200 dark:border-[#27272b] shadow-xs space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Laptop className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="text-xs font-bold text-slate-800 dark:text-[#f4f4f5]">
              {t('matrixFilterDevicesTitle')}
            </span>
            {selectedDeviceIds.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                {t('matrixShowingFilteredDevices', {
                  filtered: gamingDevices.length,
                  total: allGamingDevices.length,
                })}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {selectedDeviceIds.length > 0 && (
              <button
                type="button"
                onClick={clearDeviceFilter}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-lg transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>{t('matrixClearDeviceFilter')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Device Toggle Pills / Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* All Devices Pill */}
          <button
            type="button"
            onClick={clearDeviceFilter}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              selectedDeviceIds.length === 0
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-[#222226] text-slate-700 dark:text-[#d4d4d8] hover:bg-slate-200 dark:hover:bg-[#2b2b31] border border-slate-200 dark:border-[#2f2f36]'
            }`}
          >
            <CheckCircle2 className={`w-3.5 h-3.5 ${selectedDeviceIds.length === 0 ? 'opacity-100' : 'opacity-40'}`} />
            <span>{t('matrixFilterAllDevices')} ({allGamingDevices.length})</span>
          </button>

          {/* Individual Device Pills */}
          {allGamingDevices.map((dev) => {
            const isSelected = selectedDeviceIds.includes(dev.id);
            return (
              <button
                key={dev.id}
                type="button"
                onClick={() => toggleDeviceSelection(dev.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-[#222226] text-slate-700 dark:text-[#d4d4d8] hover:bg-slate-200 dark:hover:bg-[#2b2b31] border border-slate-200 dark:border-[#2f2f36]'
                }`}
                title={`${dev.name} (${dev.cpu || dev.system})`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-[10px] ${
                    isSelected
                      ? 'bg-white text-purple-600 border-white'
                      : 'border-slate-400 dark:border-slate-500'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <span>{dev.name}</span>
                {dev.cpu && (
                  <span
                    className={`text-[10px] truncate max-w-[90px] opacity-75 ${
                      isSelected ? 'text-purple-100' : 'text-slate-500 dark:text-[#a1a1aa]'
                    }`}
                  >
                    {dev.cpu}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Generation Filter Card (Adaptive wrap pills instead of horizontal scrollbar) */}
      <div className="p-3.5 bg-white dark:bg-[#18181c] rounded-2xl border border-slate-200 dark:border-[#27272b] shadow-xs space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="text-xs font-bold text-slate-800 dark:text-[#f4f4f5]">
              {t('matrixFilterGenerationsTitle')}
            </span>
            {selectedGroup !== 'all' && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                {EMULATION_GROUPS.find((g) => g.id === selectedGroup)
                  ? typeof EMULATION_GROUPS.find((g) => g.id === selectedGroup)!.name === 'string'
                    ? EMULATION_GROUPS.find((g) => g.id === selectedGroup)!.name
                    : (EMULATION_GROUPS.find((g) => g.id === selectedGroup)!.name as any)[language] ||
                      (EMULATION_GROUPS.find((g) => g.id === selectedGroup)!.name as any).es
                  : selectedGroup}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {selectedGroup !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedGroup('all')}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-lg transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>{t('matrixClearGenerationFilter')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Generation Pills - Wrapped layout without scrollbar */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* All Generations Pill */}
          <button
            type="button"
            onClick={() => setSelectedGroup('all')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              selectedGroup === 'all'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-[#222226] text-slate-700 dark:text-[#d4d4d8] hover:bg-slate-200 dark:hover:bg-[#2b2b31] border border-slate-200 dark:border-[#2f2f36]'
            }`}
          >
            <CheckCircle2
              className={`w-3.5 h-3.5 ${selectedGroup === 'all' ? 'opacity-100' : 'opacity-40'}`}
            />
            <span>
              {t('matrixTabAllGenerations')} ({EMULATION_SYSTEMS.length})
            </span>
          </button>

          {/* Individual Generation Pills */}
          {EMULATION_GROUPS.map((grp) => {
            const count = EMULATION_SYSTEMS.filter((s) => s.groupId === grp.id).length;
            const isSelected = selectedGroup === grp.id;
            const groupName =
              typeof grp.name === 'string'
                ? grp.name
                : (grp.name as any)[language] || (grp.name as any).es;

            return (
              <button
                key={grp.id}
                type="button"
                onClick={() => setSelectedGroup(grp.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-[#222226] text-slate-700 dark:text-[#d4d4d8] hover:bg-slate-200 dark:hover:bg-[#2b2b31] border border-slate-200 dark:border-[#2f2f36]'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-[10px] ${
                    isSelected
                      ? 'bg-white text-purple-600 border-white'
                      : 'border-slate-400 dark:border-slate-500'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <span>{groupName}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                    isSelected
                      ? 'bg-purple-700/60 text-white font-bold'
                      : 'bg-slate-200/80 dark:bg-[#2a2a30] text-slate-500 dark:text-[#a1a1aa]'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Search & View Mode Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-xl">
          {/* Console search */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400 dark:text-[#71717a]" />
            <input
              type="text"
              maxLength={60}
              value={searchConsole}
              onChange={(e) => setSearchConsole(e.target.value)}
              placeholder={t('matrixSearchPlaceholder')}
              className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-[#18181c] border border-slate-200 dark:border-[#27272b] rounded-xl text-xs text-slate-900 dark:text-[#f4f4f5] placeholder:text-slate-400 dark:placeholder:text-[#71717a] focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-xs"
            />
          </div>

          {/* Platform filter */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400 dark:text-[#71717a]" />
            <input
              type="text"
              maxLength={60}
              value={searchPlatform}
              onChange={(e) => setSearchPlatform(e.target.value)}
              placeholder={t('matrixFilterPlatformPlaceholder')}
              className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-[#18181c] border border-slate-200 dark:border-[#27272b] rounded-xl text-xs text-slate-900 dark:text-[#f4f4f5] placeholder:text-slate-400 dark:placeholder:text-[#71717a] focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-xs"
            />
          </div>
        </div>

        {/* View mode toggle & only evaluated */}
        <div className="flex items-center gap-2 justify-end">
          <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#18181c] border border-slate-200 dark:border-[#27272b] rounded-xl text-xs font-medium text-slate-700 dark:text-[#d4d4d8] cursor-pointer shadow-xs">
            <input
              type="checkbox"
              checked={onlyEvaluated}
              onChange={(e) => setOnlyEvaluated(e.target.checked)}
              className="rounded text-purple-600 focus:ring-purple-500"
            />
            <span>{t('matrixOnlyEvaluated')}</span>
          </label>

          <div className="flex items-center p-1 bg-slate-100 dark:bg-[#18181c] rounded-xl border border-slate-200 dark:border-[#27272b] text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMatrixViewMode('detailed')}
              className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1.5 ${
                matrixViewMode === 'detailed'
                  ? 'bg-white dark:bg-[#222226] text-purple-600 dark:text-purple-300 shadow-xs border border-slate-200/60 dark:border-[#323238]'
                  : 'text-slate-600 dark:text-[#a1a1aa] hover:text-slate-900 dark:hover:text-[#f4f4f5]'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('matrixViewDetailed')}</span>
            </button>
            <button
              type="button"
              onClick={() => setMatrixViewMode('horizontal')}
              className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1.5 ${
                matrixViewMode === 'horizontal'
                  ? 'bg-white dark:bg-[#222226] text-purple-600 dark:text-purple-300 shadow-xs border border-slate-200/60 dark:border-[#323238]'
                  : 'text-slate-600 dark:text-[#a1a1aa] hover:text-slate-900 dark:hover:text-[#f4f4f5]'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('matrixViewHorizontal')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5. Main Matrix Rendering or Empty State if no device selected */}
      {gamingDevices.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-[#18181c] rounded-2xl border border-slate-200 dark:border-[#27272b] p-8">
          <Gamepad2 className="w-12 h-12 text-slate-300 dark:text-[#3f3f46] mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-[#d4d4d8]">
            {t('matrixNoDevicesMatchedFilter')}
          </h3>
          <p className="text-xs text-slate-400 dark:text-[#71717a] mt-1 max-w-sm mx-auto">
            {t('matrixSelectAtLeastOneDevice')}
          </p>
          <button
            type="button"
            onClick={clearDeviceFilter}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{t('matrixClearDeviceFilter')}</span>
          </button>
        </div>
      ) : matrixViewMode === 'detailed' ? (
        /* Detailed Catalog View (Platform metadata & console scores) */
        <div className="bg-white dark:bg-[#18181c] rounded-2xl border border-slate-200 dark:border-[#27272b] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4 sm:px-6 w-56">Plataforma / Sistema</th>
                  <th className="py-3 px-4 w-32">Generación</th>
                  <th className="py-3 px-4 w-32">Fabricante</th>
                  <th className="py-3 px-4 w-24">Año</th>
                  {gamingDevices.map((dev) => (
                    <th key={dev.id} className="py-3 px-4 text-center min-w-[140px]">
                      <div className="font-extrabold font-mono text-purple-600 dark:text-purple-400 truncate">
                        {dev.name}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate font-normal">
                        {dev.cpu || '-'}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredSystems.map((sys) => {
                  const grp = EMULATION_GROUPS.find((g) => g.id === sys.groupId);
                  const groupName = grp
                    ? typeof grp.name === 'string'
                    ? grp.name
                    : (grp.name as any)[language] || (grp.name as any).es
                    : sys.groupId;

                  return (
                    <tr
                      key={sys.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Platform info */}
                      <td className="py-3 px-4 sm:px-6">
                        <div className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                          {sys.name}
                        </div>
                        {sys.shortName && sys.shortName !== sys.name && (
                          <div className="text-[10px] text-slate-400">
                            aka {sys.shortName}
                          </div>
                        )}
                      </td>

                      {/* Generation badge */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border ${getGroupBadgeColor(
                            sys.groupId
                          )}`}
                        >
                          {groupName}
                        </span>
                      </td>

                      {/* Manufacturer */}
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-medium">
                        {sys.manufacturer || '-'}
                      </td>

                      {/* Year */}
                      <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400">
                        {sys.year || '-'}
                      </td>

                      {/* Console Ratings */}
                      {gamingDevices.map((dev) => {
                        const score = dev.emulationScores?.[sys.id];
                        return (
                          <td key={dev.id} className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() =>
                                setActiveCell({
                                  deviceId: dev.id,
                                  systemId: sys.id,
                                  currentScore: score || 0,
                                  systemName: sys.name,
                                  deviceName: dev.name,
                                })
                              }
                              className="group/btn inline-flex items-center justify-center p-1.5 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/50 transition-colors cursor-pointer"
                              title={`Calificar ${sys.name} en ${dev.name}`}
                            >
                              {getScoreChip(score)}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Horizontal Matrix (Consoles on rows, Platforms on columns) */
        <div className="bg-white dark:bg-[#18181c] rounded-2xl border border-slate-200 dark:border-[#27272b] shadow-xs overflow-hidden">
          <div className="overflow-x-auto max-w-full scrollbar-thin">
            <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-200 dark:border-[#27272b] bg-slate-50/70 dark:bg-[#1f1f23]/60 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-[#a1a1aa]">
                  <th className="py-3 px-4 sm:px-6 sticky left-0 bg-slate-100 dark:bg-[#1f1f23] z-10 w-48 shadow-xs">
                    {t('matrixColConsole')}
                  </th>
                  <th className="py-3 px-4 w-40">{t('matrixColOS')}</th>
                  <th className="py-3 px-4 w-48">{t('matrixColCpu')}</th>
                  {filteredSystems.map((sys) => (
                    <th key={sys.id} className="py-3 px-2 text-center min-w-[50px]">
                      <span
                        title={sys.name}
                        className="font-mono text-[10px] text-slate-700 dark:text-[#d4d4d8] font-bold block truncate max-w-[70px]"
                      >
                        {sys.shortName || sys.name.slice(0, 8)}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#27272b]">
                {gamingDevices.map((dev) => (
                  <tr
                    key={dev.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-[#222226]/50 transition-colors"
                  >
                    <td className="py-3 px-4 sm:px-6 sticky left-0 bg-white dark:bg-[#18181c] z-10 font-bold font-mono text-purple-600 dark:text-purple-400 shadow-xs border-r border-slate-200 dark:border-[#27272b]">
                      {dev.name}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-[#a1a1aa]">
                      {dev.system}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500 dark:text-[#a1a1aa] truncate max-w-[200px]">
                      {dev.cpu || '-'}
                    </td>
                    {filteredSystems.map((sys) => {
                      const score = dev.emulationScores?.[sys.id];
                      return (
                        <td key={sys.id} className="py-3 px-2 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              setActiveCell({
                                deviceId: dev.id,
                                systemId: sys.id,
                                currentScore: score || 0,
                                systemName: sys.name,
                                deviceName: dev.name,
                              })
                            }
                            className="inline-flex items-center justify-center hover:scale-110 transition-transform cursor-pointer"
                          >
                            {getScoreChip(score)}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. Rating Modal / Popover */}
      {activeCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white dark:bg-[#18181c] rounded-2xl border border-slate-200 dark:border-[#27272b] shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#27272b]">
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-[#f4f4f5]">
                  {activeCell.systemName}
                </h4>
                <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                  {activeCell.deviceName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveCell(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-[#f4f4f5] rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-600 dark:text-[#a1a1aa] block">
                {t('matrixRatePrompt')}
              </span>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((stars) => (
                  <button
                    key={stars}
                    type="button"
                    onClick={() =>
                      handleRate(activeCell.deviceId, activeCell.systemId, stars)
                    }
                    className={`py-2.5 rounded-xl flex flex-col items-center justify-center gap-1 border font-mono font-bold text-xs transition-all cursor-pointer ${
                      activeCell.currentScore === stars
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-[#222226] text-slate-700 dark:text-[#d4d4d8] border-slate-200 dark:border-[#2f2f36] hover:border-purple-400'
                    }`}
                  >
                    <Star
                      className={`w-4 h-4 ${
                        activeCell.currentScore >= stars
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-400'
                      }`}
                    />
                    <span>{stars}★</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-[#27272b]">
              {activeCell.currentScore > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    handleClear(activeCell.deviceId, activeCell.systemId)
                  }
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 transition-colors cursor-pointer"
                >
                  {t('matrixClearRating')}
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveCell(null)}
                className="ml-auto px-4 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-[#222226] text-slate-700 dark:text-[#d4d4d8] hover:bg-slate-200 dark:hover:bg-[#2a2a30] transition-colors cursor-pointer"
              >
                {t('btnClose')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
