import React from 'react';
import { Cloud, CloudUpload, Sparkles, Cpu, HardDrive, Package, ShieldCheck } from 'lucide-react';
import { useStorage } from '../../context/StorageContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export const CloudOnboardingModal: React.FC = () => {
  const {
    showOnboardingModal,
    closeOnboardingModal,
    confirmCloudImport,
    confirmCloudFresh,
    pendingImportCounts,
  } = useStorage();
  const { user } = useAuth();
  const { t } = useLanguage();

  // Clean up any lingering legacy keys from older versions
  React.useEffect(() => {
    try {
      [
        'collectahub_guest_devices',
        'collectahub_guest_drives',
        'collectahub_guest_accessories',
        'collectahub_guest_settings',
      ].forEach((k) => localStorage.removeItem(k));
    } catch {}
  }, []);

  if (!showOnboardingModal) return null;

  const counts = pendingImportCounts || { devices: 0, drives: 0, accessories: 0 };
  const hasLocalData = counts.devices > 0 || counts.drives > 0 || counts.accessories > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#161619] rounded-3xl shadow-2xl border border-purple-200/80 dark:border-[#27272d] overflow-hidden animate-in fade-in zoom-in-95 duration-200 transition-colors">
        {/* Header with CollectaHub Ambient Gradient */}
        <div className="relative p-7 bg-gradient-to-tr from-purple-700 via-indigo-600 to-violet-600 text-white text-center overflow-hidden">
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 shadow-lg shadow-purple-950/20 flex items-center justify-center mb-3.5">
              <Cloud className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-extrabold tracking-tight drop-shadow-xs">
              {t('onboardingTitle')}
            </h3>
            <p className="text-xs text-purple-100/90 mt-1.5 max-w-md leading-relaxed">
              {hasLocalData
                ? t('onboardingSubtitle', { email: user?.email || 'tu cuenta de Google' })
                : t('onboardingCleanSubtitle', { email: user?.email || 'tu cuenta de Google' })}
            </p>

            {/* Quick Summary Pill Badges only if there is actual local data */}
            {hasLocalData && (
              <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-bold border border-white/20">
                  <Cpu className="w-3.5 h-3.5" />
                  <span>{counts.devices} {t('conflictTargetDevice')}</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-bold border border-white/20">
                  <Package className="w-3.5 h-3.5" />
                  <span>{counts.accessories} {t('conflictTargetAccessory')}</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-bold border border-white/20">
                  <HardDrive className="w-3.5 h-3.5" />
                  <span>{counts.drives} {t('conflictTargetDrive')}</span>
                </div>
              </div>
            )}
          </div>

          {/* Background Ambient Glow Circles */}
          <div className="absolute -top-12 -right-12 w-44 h-44 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-44 h-44 bg-purple-400/20 rounded-full blur-2xl pointer-events-none" />
        </div>

        {/* Question & Options */}
        <div className="p-6 sm:p-7 space-y-4">
          <p className="text-sm font-bold text-slate-800 dark:text-[#f4f4f5]">
            {hasLocalData ? t('onboardingQuestion') : t('onboardingOptionFreshTitle')}
          </p>

          <div className="space-y-3">
            {/* Option A: Import local data - ONLY if there are actually local items */}
            {hasLocalData && (
              <button
                type="button"
                onClick={confirmCloudImport}
                className="w-full text-left p-4.5 rounded-2xl border border-purple-200/90 dark:border-purple-900/60 bg-purple-50/60 dark:bg-purple-950/25 hover:border-purple-500 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-all group cursor-pointer shadow-xs"
              >
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30 mt-0.5 group-hover:scale-105 transition-transform shrink-0">
                    <CloudUpload className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-[#f4f4f5] group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                        {t('onboardingOptionSyncTitle')}
                      </span>
                      <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/80 dark:text-purple-200 shrink-0">
                        {t('onboardingBadgeRecommended')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-[#a1a1aa] mt-1 leading-relaxed">
                      {t('onboardingOptionSyncDesc', {
                        deviceCount: counts.devices,
                        accessoryCount: counts.accessories,
                        driveCount: counts.drives,
                      })}
                    </p>
                  </div>
                </div>
              </button>
            )}

            {/* Option B: Start clean */}
            <button
              type="button"
              onClick={confirmCloudFresh}
              className={`w-full text-left p-4.5 rounded-2xl transition-all group cursor-pointer shadow-xs ${
                hasLocalData
                  ? 'border border-slate-200 dark:border-[#27272d] bg-slate-50/70 dark:bg-[#1a1a1e] hover:border-slate-300 dark:hover:border-[#383842] hover:bg-slate-100/70 dark:hover:bg-[#202026]'
                  : 'border border-purple-300 dark:border-purple-800/80 bg-purple-50/70 dark:bg-purple-950/30 hover:border-purple-500 hover:bg-purple-100/70'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`p-2.5 rounded-xl shadow-sm mt-0.5 group-hover:scale-105 transition-transform shrink-0 ${
                    hasLocalData
                      ? 'bg-slate-200 dark:bg-[#282830] text-slate-700 dark:text-[#d4d4d8]'
                      : 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-purple-600/30'
                  }`}
                >
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-sm text-slate-900 dark:text-[#f4f4f5]">
                    {hasLocalData ? t('onboardingOptionFreshTitle') : t('onboardingCleanAction')}
                  </span>
                  <p className="text-xs text-slate-500 dark:text-[#a1a1aa] mt-1 leading-relaxed">
                    {t('onboardingOptionFreshDesc')}
                  </p>
                </div>
              </div>
            </button>
          </div>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={closeOnboardingModal}
              className="text-xs font-semibold text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 underline transition-colors cursor-pointer"
            >
              {t('onboardingDecideLater')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
