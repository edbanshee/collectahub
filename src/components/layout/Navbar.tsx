import React from 'react';
import {
  Cpu,
  Package,
  HardDrive,
  Gamepad2,
  Sliders,
  BarChart3,
  ArrowUpDown,
  ShieldAlert,
  Sun,
  Moon,
  LogOut,
  Cloud,
  CloudCheck,
  Info,
  Terminal,
} from 'lucide-react';
import { ActiveView } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useStorage } from '../../context/StorageContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';

interface NavbarProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  showStats: boolean;
  onToggleStats: () => void;
  onOpenSettings: () => void;
  onOpenImportExport: () => void;
  onOpenAtomicWipe: () => void;
  onOpenPortfolioInfo: () => void;
  onOpenDiagnostic: () => void;
  onExitGuest?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeView,
  setActiveView,
  showStats,
  onToggleStats,
  onOpenSettings,
  onOpenImportExport,
  onOpenAtomicWipe,
  onOpenPortfolioInfo,
  onOpenDiagnostic,
  onExitGuest,
}) => {
  const { user, isSigningIn, signInWithGoogle, signOut } = useAuth();
  const { devices, drives, accessories } = useStorage();
  const { t, language, setLanguage } = useLanguage();
  const { resolvedTheme, toggleTheme } = useTheme();

  const gamingDevicesCount = devices.filter((d) => d.isGamingDevice).length;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-[#27272b] bg-white/90 dark:bg-[#121214]/90 backdrop-blur-md transition-colors duration-150">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
          {/* Brand Logo & Name (Devices Hub) */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-sm">
              <Cpu className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900 dark:text-[#f4f4f5]">
              {t('appBrand')}
            </span>
          </div>

          {/* Center Navigation Tabs with Count Badges */}
          <nav className="flex items-center p-1 bg-slate-100 dark:bg-[#18181c] rounded-xl border border-slate-200 dark:border-[#27272b]">
            {/* Devices Tab */}
            <button
              type="button"
              onClick={() => setActiveView('devices')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeView === 'devices'
                  ? 'bg-white dark:bg-[#222226] text-purple-600 dark:text-purple-300 border border-slate-200/80 dark:border-[#323238] shadow-xs'
                  : 'text-slate-600 dark:text-[#a1a1aa] hover:text-slate-900 dark:hover:text-[#f4f4f5]'
              }`}
            >
              <Cpu className="w-4 h-4" />
              <span className="hidden md:inline">{t('navDevices')}</span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  activeView === 'devices'
                    ? 'bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300'
                    : 'bg-slate-200 dark:bg-[#2a2a30] text-slate-600 dark:text-[#a1a1aa]'
                }`}
              >
                {devices.length}
              </span>
            </button>

            {/* Accessories Tab */}
            <button
              type="button"
              onClick={() => setActiveView('accessories')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeView === 'accessories'
                  ? 'bg-white dark:bg-[#222226] text-purple-600 dark:text-purple-300 border border-slate-200/80 dark:border-[#323238] shadow-xs'
                  : 'text-slate-600 dark:text-[#a1a1aa] hover:text-slate-900 dark:hover:text-[#f4f4f5]'
              }`}
            >
              <Package className="w-4 h-4" />
              <span className="hidden md:inline">{t('navAccessories')}</span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  activeView === 'accessories'
                    ? 'bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300'
                    : 'bg-slate-200 dark:bg-[#2a2a30] text-slate-600 dark:text-[#a1a1aa]'
                }`}
              >
                {accessories.length}
              </span>
            </button>

            {/* Drives Tab */}
            <button
              type="button"
              onClick={() => setActiveView('drives')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeView === 'drives'
                  ? 'bg-white dark:bg-[#222226] text-purple-600 dark:text-purple-300 border border-slate-200/80 dark:border-[#323238] shadow-xs'
                  : 'text-slate-600 dark:text-[#a1a1aa] hover:text-slate-900 dark:hover:text-[#f4f4f5]'
              }`}
            >
              <HardDrive className="w-4 h-4" />
              <span className="hidden md:inline">{t('navDrives')}</span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  activeView === 'drives'
                    ? 'bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300'
                    : 'bg-slate-200 dark:bg-[#2a2a30] text-slate-600 dark:text-[#a1a1aa]'
                }`}
              >
                {drives.length}
              </span>
            </button>

            {/* Emulation Matrix Tab */}
            <button
              type="button"
              onClick={() => setActiveView('matrix')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeView === 'matrix'
                  ? 'bg-white dark:bg-[#222226] text-purple-600 dark:text-purple-300 border border-slate-200/80 dark:border-[#323238] shadow-xs'
                  : 'text-slate-600 dark:text-[#a1a1aa] hover:text-slate-900 dark:hover:text-[#f4f4f5]'
              }`}
            >
              <Gamepad2 className="w-4 h-4" />
              <span className="hidden md:inline">{t('navMatrix')}</span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  activeView === 'matrix'
                    ? 'bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300'
                    : 'bg-slate-200 dark:bg-[#2a2a30] text-slate-600 dark:text-[#a1a1aa]'
                }`}
              >
                {gamingDevicesCount}
              </span>
            </button>
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* Language Switcher Chip (ES / EN) */}
            <button
              type="button"
              onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}
              title={t('actionLanguage')}
              className="flex items-center justify-center w-8 h-8 text-xs font-bold font-mono text-slate-700 dark:text-[#d4d4d8] bg-slate-100 dark:bg-[#18181c] hover:bg-slate-200 dark:hover:bg-[#222226] rounded-xl border border-slate-200 dark:border-[#27272b] transition-colors"
            >
              {language === 'es' ? 'ES' : 'EN'}
            </button>

            {/* Cloud Sync Icon Button (Only Icon, compact tooltip on hover) */}
            {user ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  title={t('authCloudSyncTooltip', { email: user.email || 'Google' })}
                  className="w-8 h-8 rounded-xl flex items-center justify-center bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300/80 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400"
                >
                  <CloudCheck className="w-4 h-4" />
                </button>

                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    title={user.email || user.displayName || (language === 'es' ? 'Usuario' : 'User')}
                    className="w-8 h-8 rounded-xl border border-slate-200 dark:border-[#27272b] object-cover"
                  />
                ) : (
                  <div
                    title={user.email || (language === 'es' ? 'Usuario' : 'User')}
                    className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-xs"
                  >
                    {user.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}

                <button
                  type="button"
                  onClick={async () => {
                    await signOut();
                    onExitGuest?.();
                  }}
                  title={t('authSignOut')}
                  className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-[#222226] rounded-xl transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => signInWithGoogle()}
                  disabled={isSigningIn}
                  title={t('authCloudConnectTooltip')}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                    isSigningIn
                      ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-[#18181c] text-purple-600'
                      : 'bg-slate-100 dark:bg-[#18181c] text-slate-600 dark:text-[#a1a1aa] hover:text-purple-600 dark:hover:text-purple-400 hover:bg-slate-200 dark:hover:bg-[#222226] border border-slate-200 dark:border-[#27272b] cursor-pointer'
                  }`}
                >
                  {isSigningIn ? (
                    <div className="w-3.5 h-3.5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Cloud className="w-4 h-4" />
                  )}
                </button>
                {onExitGuest && (
                  <button
                    type="button"
                    onClick={onExitGuest}
                    title={t('authExitWelcomeTooltip')}
                    className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-[#f4f4f5] hover:bg-slate-100 dark:hover:bg-[#222226] rounded-xl transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Manage Options (Settings / Sliders icon) */}
            <button
              type="button"
              onClick={onOpenSettings}
              title={t('navManageOptions')}
              aria-label={t('navManageOptions')}
              className="w-8 h-8 flex items-center justify-center text-slate-600 dark:text-[#a1a1aa] hover:text-purple-600 dark:hover:text-purple-400 bg-slate-100 dark:bg-[#18181c] hover:bg-slate-200 dark:hover:bg-[#222226] rounded-xl border border-slate-200 dark:border-[#27272b] transition-colors"
            >
              <Sliders className="w-4 h-4" />
            </button>

            {/* Metrics & Charts Button: Toggle Show/Hide Stats and Charts */}
            <button
              type="button"
              onClick={onToggleStats}
              title={showStats ? t('statsToggleHide') : t('statsToggleShow')}
              aria-label={showStats ? t('statsToggleHide') : t('statsToggleShow')}
              className={`w-8 h-8 flex items-center justify-center rounded-xl border transition-all ${
                showStats
                  ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800/80 shadow-xs'
                  : 'bg-slate-100 dark:bg-[#18181c] text-slate-400 dark:text-[#71717a] hover:text-slate-600 dark:hover:text-[#a1a1aa] border-slate-200 dark:border-[#27272b]'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
            </button>

            {/* Single Import / Export Button */}
            <button
              type="button"
              onClick={onOpenImportExport}
              title={t('actionImportExport')}
              aria-label={t('actionImportExport')}
              className="w-8 h-8 flex items-center justify-center text-slate-600 dark:text-[#a1a1aa] hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-[#18181c] hover:bg-slate-200 dark:hover:bg-[#222226] rounded-xl border border-slate-200 dark:border-[#27272b] transition-colors"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>

            {/* Danger Zone & Wipe (Shield Alert icon) */}
            <button
              type="button"
              onClick={onOpenAtomicWipe}
              title={t('dangerZoneTitle')}
              className="w-8 h-8 flex items-center justify-center text-rose-500 hover:text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-xl border border-rose-200 dark:border-rose-900/60 transition-colors"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
            </button>

            {/* Portfolio Architecture & Limits Info Button */}
            <button
              type="button"
              onClick={onOpenPortfolioInfo}
              title={language === 'es' ? 'Arquitectura y límites de uso libre' : 'Architecture & free-tier limits'}
              aria-label="Info"
              className="w-8 h-8 flex items-center justify-center text-slate-600 dark:text-[#a1a1aa] hover:text-purple-600 dark:hover:text-purple-400 bg-slate-100 dark:bg-[#18181c] hover:bg-slate-200 dark:hover:bg-[#222226] rounded-xl border border-slate-200 dark:border-[#27272b] transition-colors"
            >
              <Info className="w-4 h-4" />
            </button>

            {/* Diagnostic Console Button */}
            <button
              type="button"
              onClick={onOpenDiagnostic}
              title={language === 'es' ? 'Consola de diagnóstico y estado' : 'Diagnostic console & system status'}
              aria-label="Diagnostic"
              className="w-8 h-8 flex items-center justify-center text-slate-600 dark:text-[#a1a1aa] hover:text-emerald-500 dark:hover:text-emerald-400 bg-slate-100 dark:bg-[#18181c] hover:bg-slate-200 dark:hover:bg-[#222226] rounded-xl border border-slate-200 dark:border-[#27272b] transition-colors"
            >
              <Terminal className="w-4 h-4" />
            </button>

            {/* Theme Toggle (Sun / Moon) */}
            <button
              type="button"
              onClick={toggleTheme}
              title={resolvedTheme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              className="w-8 h-8 flex items-center justify-center text-slate-600 dark:text-[#a1a1aa] hover:text-amber-500 dark:hover:text-amber-300 bg-slate-100 dark:bg-[#18181c] hover:bg-slate-200 dark:hover:bg-[#222226] rounded-xl border border-slate-200 dark:border-[#27272b] transition-colors"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-purple-600" />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
