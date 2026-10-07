import React, { useState } from 'react';
import { ActiveView, Device, StorageDrive, Accessory } from './types';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { StorageProvider, useStorage } from './context/StorageContext';
import { Navbar } from './components/layout/Navbar';
import { StatsBanner } from './components/layout/StatsBanner';
import { DevicesView } from './components/devices/DevicesView';
import { AccessoriesView } from './components/accessories/AccessoriesView';
import { DrivesView } from './components/drives/DrivesView';
import { EmulationMatrixView } from './components/matrix/EmulationMatrixView';
import { DeviceModal } from './components/modals/DeviceModal';
import { DriveModal } from './components/modals/DriveModal';
import { AttachDriveModal } from './components/modals/AttachDriveModal';
import { AccessoryModal } from './components/modals/AccessoryModal';
import { AttachAccessoryModal } from './components/modals/AttachAccessoryModal';
import { SettingsModal } from './components/modals/SettingsModal';
import { ImportExportModal } from './components/modals/ImportExportModal';
import { AtomicWipeModal } from './components/modals/AtomicWipeModal';
import { CloudOnboardingModal } from './components/modals/CloudOnboardingModal';
import { DeviceDeleteConfirmModal } from './components/modals/DeviceDeleteConfirmModal';
import { PortfolioInfoModal } from './components/modals/PortfolioInfoModal';
import { DiagnosticConsoleModal } from './components/modals/DiagnosticConsoleModal';
import { WelcomeView } from './components/welcome/WelcomeView';
import { AlertCircle, Trash2, X, ExternalLink, ShieldAlert } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { isLoading, deleteDrive, deleteAccessory, quotaWarning, clearQuotaWarning } = useStorage();
  const { user, loading: authLoading, authError, clearAuthError } = useAuth();
  const { showToast } = useToast();
  const { t, language } = useLanguage();

  const [activeView, setActiveView] = useState<ActiveView>('devices');
  const [guestModeEntered, setGuestModeEntered] = useState<boolean>(() => {
    return localStorage.getItem('collectahub_guest_entered') === 'true';
  });

  const handleEnterGuest = () => {
    localStorage.setItem('collectahub_guest_entered', 'true');
    setGuestModeEntered(true);
  };

  const handleExitGuest = () => {
    localStorage.removeItem('collectahub_guest_entered');
    setGuestModeEntered(false);
  };

  // Modal states
  const [deviceModal, setDeviceModal] = useState<{ isOpen: boolean; deviceToEdit: Device | null }>({
    isOpen: false,
    deviceToEdit: null,
  });

  const [accessoryModal, setAccessoryModal] = useState<{
    isOpen: boolean;
    accessoryToEdit: Accessory | null;
    preselectedDeviceName?: string;
  }>({
    isOpen: false,
    accessoryToEdit: null,
  });

  const [attachAccessoryModal, setAttachAccessoryModal] = useState<{
    isOpen: boolean;
    targetDeviceName: string | null;
  }>({
    isOpen: false,
    targetDeviceName: null,
  });

  const [driveModal, setDriveModal] = useState<{
    isOpen: boolean;
    driveToEdit: StorageDrive | null;
    preselectedDeviceName?: string;
  }>({
    isOpen: false,
    driveToEdit: null,
  });

  const [attachDriveModal, setAttachDriveModal] = useState<{
    isOpen: boolean;
    targetDeviceName: string | null;
  }>({
    isOpen: false,
    targetDeviceName: null,
  });

  const [deviceDeleteModal, setDeviceDeleteModal] = useState<{
    isOpen: boolean;
    device: Device | null;
  }>({
    isOpen: false,
    device: null,
  });

  const [driveToDelete, setDriveToDelete] = useState<StorageDrive | null>(null);
  const [accessoryToDelete, setAccessoryToDelete] = useState<Accessory | null>(null);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [importExportModalOpen, setImportExportModalOpen] = useState(false);
  const [atomicWipeModalOpen, setAtomicWipeModalOpen] = useState(false);
  const [portfolioInfoModalOpen, setPortfolioInfoModalOpen] = useState(false);
  const [diagnosticConsoleOpen, setDiagnosticConsoleOpen] = useState(false);
  const [matrixTargetDeviceId, setMatrixTargetDeviceId] = useState<string | null>(null);

  const handleNavigateToMatrix = (deviceId?: string) => {
    setMatrixTargetDeviceId(deviceId || null);
    setActiveView('matrix');
  };

  const handleSetActiveView = (view: ActiveView) => {
    if (view === 'matrix' && activeView !== 'matrix') {
      setMatrixTargetDeviceId(null);
    }
    setActiveView(view);
  };

  // Toggle for showing/hiding stats and charts (connected to the chip button)
  const [showStats, setShowStats] = useState<boolean>(() => {
    const saved = localStorage.getItem('storage_tracker_show_stats');
    return saved !== 'false';
  });

  const toggleStats = () => {
    setShowStats((prev) => {
      const next = !prev;
      localStorage.setItem('storage_tracker_show_stats', String(next));
      return next;
    });
  };

  const handleDeleteDriveConfirm = async () => {
    if (!driveToDelete) return;
    try {
      await deleteDrive(driveToDelete.id);
      showToast(`Unidad "${driveToDelete.drive}" eliminada.`, 'success');
      setDriveToDelete(null);
    } catch (err: any) {
      showToast(err?.message || 'Error al eliminar unidad', 'error');
    }
  };

  // If Firebase is verifying a known logged-in session, show an elegant branded loader
  const hasKnownSession = typeof window !== 'undefined' && localStorage.getItem('collectahub_has_session') === 'true';
  if (authLoading && hasKnownSession) {
    return (
      <div className="min-h-screen bg-[#f8f9fb] dark:bg-[#0e0e10] flex flex-col items-center justify-center p-4 transition-colors">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-xl shadow-purple-600/30 animate-pulse mb-4">
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
        <h2 className="text-base font-extrabold text-slate-900 dark:text-[#f4f4f5] tracking-tight">{t('appName')}</h2>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">{t('authSyncing')}</p>
      </div>
    );
  }

  // If user is not logged in and hasn't explicitly entered guest mode yet, show WelcomeView immediately without flicker
  if (!user && !guestModeEntered) {
    return <WelcomeView onEnterGuest={handleEnterGuest} />;
  }

  return (
    <div className="min-h-screen bg-[#f4f5f7] dark:bg-[#121214] text-slate-900 dark:text-[#f4f4f5] flex flex-col transition-colors duration-150 selection:bg-purple-600 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        activeView={activeView}
        setActiveView={handleSetActiveView}
        showStats={showStats}
        onToggleStats={toggleStats}
        onOpenSettings={() => setSettingsModalOpen(true)}
        onOpenImportExport={() => setImportExportModalOpen(true)}
        onOpenAtomicWipe={() => setAtomicWipeModalOpen(true)}
        onOpenPortfolioInfo={() => setPortfolioInfoModalOpen(true)}
        onOpenDiagnostic={() => setDiagnosticConsoleOpen(true)}
        onExitGuest={handleExitGuest}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        {/* Auth Error Banner (e.g. Unauthorized Domain on GitHub Pages) */}
        {authError && (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-950 dark:text-amber-200">
                  {authError.startsWith('auth/unauthorized-domain')
                    ? t('authUnauthorizedDomainTitle')
                    : 'Error de Autenticación'}
                </h4>
                <p className="text-xs text-amber-800 dark:text-amber-300/90 mt-0.5 max-w-2xl leading-relaxed">
                  {authError.startsWith('auth/unauthorized-domain:')
                    ? t('authUnauthorizedDomainDesc', { domain: authError.split(':')[1] || window.location.hostname })
                    : authError}
                </p>
                {authError.startsWith('auth/unauthorized-domain') && (
                  <div className="mt-2 text-xs text-amber-900 dark:text-amber-200/80 space-y-1">
                    <p className="font-semibold">
                      1. {t('authUnauthorizedDomainStep1')}
                    </p>
                    <p className="font-semibold">
                      2. {t('authUnauthorizedDomainStep2', { domain: authError.split(':')[1] || window.location.hostname })}
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              {authError.startsWith('auth/unauthorized-domain') && (
                <a
                  href="https://console.firebase.google.com/project/devices-hub-12a3d/authentication/settings"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-900 dark:text-amber-100 bg-amber-200/80 dark:bg-amber-900/60 hover:bg-amber-300 dark:hover:bg-amber-800/80 rounded-xl transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{t('authUnauthorizedDomainBtn')}</span>
                </a>
              )}
              <button
                type="button"
                onClick={clearAuthError}
                className="p-1.5 text-amber-700 dark:text-amber-400 hover:text-amber-950 dark:hover:text-amber-200 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Free Quota Notice Banner (Firestore / Storage / AI limits reached) */}
        {quotaWarning && (
          <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-indigo-950 dark:text-indigo-200">
                  {language === 'es' ? 'Aviso de Límite de Cuota Gratuita' : 'Free Tier Limit Notice'}
                </h4>
                <p className="text-xs text-indigo-900/80 dark:text-indigo-200/90 mt-0.5 max-w-2xl leading-relaxed">
                  {quotaWarning}
                </p>
                <p className="text-[11px] text-indigo-700/80 dark:text-indigo-300/70 mt-1">
                  {language === 'es'
                    ? 'Tus datos continúan seguros en tu navegador. Puedes exportar una copia de seguridad JSON cuando lo desees.'
                    : 'Your data remains safe in your browser. You can export a JSON backup anytime.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button
                type="button"
                onClick={() => setImportExportModalOpen(true)}
                className="px-3 py-1.5 text-xs font-bold text-indigo-900 dark:text-indigo-100 bg-indigo-200/70 dark:bg-indigo-900/60 hover:bg-indigo-300 dark:hover:bg-indigo-800/80 rounded-xl transition-colors cursor-pointer"
              >
                {language === 'es' ? 'Exportar Copia JSON' : 'Export JSON Backup'}
              </button>
              <button
                type="button"
                onClick={clearQuotaWarning}
                className="p-1.5 text-indigo-700 dark:text-indigo-400 hover:text-indigo-950 dark:hover:text-indigo-200 rounded-lg cursor-pointer"
                title="Cerrar aviso"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* KPI Stats Banner (Toggled by Chip Button) */}
        {showStats && <StatsBanner activeView={activeView} />}

        {/* View Router */}
        {isLoading ? (
          <div className="py-24 text-center">
            <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-400 font-medium">{t('appLoading')}</p>
          </div>
        ) : (
          <>
            {activeView === 'devices' && (
              <DevicesView
                onOpenAddDevice={() => setDeviceModal({ isOpen: true, deviceToEdit: null })}
                onEditDevice={(device) => setDeviceModal({ isOpen: true, deviceToEdit: device })}
                onDeleteDevice={(device) => setDeviceDeleteModal({ isOpen: true, device })}
                onAddDriveToDevice={(deviceName) =>
                  setAttachDriveModal({
                    isOpen: true,
                    targetDeviceName: deviceName,
                  })
                }
                onAddAccessoryToDevice={(deviceName) =>
                  setAttachAccessoryModal({
                    isOpen: true,
                    targetDeviceName: deviceName,
                  })
                }
                onEditAccessory={(accessory) =>
                  setAccessoryModal({
                    isOpen: true,
                    accessoryToEdit: accessory,
                    preselectedDeviceName: accessory.device,
                  })
                }
                onNavigateToMatrix={handleNavigateToMatrix}
              />
            )}

            {activeView === 'accessories' && (
              <AccessoriesView
                onOpenAddAccessory={() =>
                  setAccessoryModal({
                    isOpen: true,
                    accessoryToEdit: null,
                  })
                }
                onEditAccessory={(acc) =>
                  setAccessoryModal({
                    isOpen: true,
                    accessoryToEdit: acc,
                    preselectedDeviceName: acc.device,
                  })
                }
                onDeleteAccessory={(acc) => setAccessoryToDelete(acc)}
              />
            )}

            {activeView === 'drives' && (
              <DrivesView
                onOpenAddDrive={(deviceName) => {
                  if (deviceName) {
                    setAttachDriveModal({
                      isOpen: true,
                      targetDeviceName: deviceName,
                    });
                  } else {
                    setDriveModal({
                      isOpen: true,
                      driveToEdit: null,
                      preselectedDeviceName: undefined,
                    });
                  }
                }}
                onEditDrive={(drive) => setDriveModal({ isOpen: true, driveToEdit: drive })}
                onDeleteDrive={(drive) => setDriveToDelete(drive)}
              />
            )}

            {activeView === 'matrix' && (
              <EmulationMatrixView initialSelectedDeviceId={matrixTargetDeviceId} />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-[#27272b] py-5 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>{t('appFooterTitle')}</span>
          <span className="font-mono text-[11px]">{t('appFooterSync')}</span>
        </div>
      </footer>

      {/* All Application Modals */}
      <DeviceModal
        isOpen={deviceModal.isOpen}
        deviceToEdit={deviceModal.deviceToEdit}
        onClose={() => setDeviceModal({ isOpen: false, deviceToEdit: null })}
      />

      <AttachDriveModal
        isOpen={attachDriveModal.isOpen}
        targetDeviceName={attachDriveModal.targetDeviceName}
        onClose={() => setAttachDriveModal({ isOpen: false, targetDeviceName: null })}
        onOpenCreateNewDrive={(deviceName) => {
          setAttachDriveModal({ isOpen: false, targetDeviceName: null });
          setDriveModal({
            isOpen: true,
            driveToEdit: null,
            preselectedDeviceName: deviceName,
          });
        }}
      />

      <DriveModal
        isOpen={driveModal.isOpen}
        driveToEdit={driveModal.driveToEdit}
        preselectedDeviceName={driveModal.preselectedDeviceName}
        onClose={() =>
          setDriveModal({ isOpen: false, driveToEdit: null, preselectedDeviceName: undefined })
        }
      />

      <AttachAccessoryModal
        isOpen={attachAccessoryModal.isOpen}
        targetDeviceName={attachAccessoryModal.targetDeviceName}
        onClose={() => setAttachAccessoryModal({ isOpen: false, targetDeviceName: null })}
        onOpenCreateNewAccessory={(deviceName) => {
          setAttachAccessoryModal({ isOpen: false, targetDeviceName: null });
          setAccessoryModal({
            isOpen: true,
            accessoryToEdit: null,
            preselectedDeviceName: deviceName,
          });
        }}
      />

      <AccessoryModal
        isOpen={accessoryModal.isOpen}
        accessoryToEdit={accessoryModal.accessoryToEdit}
        preselectedDeviceName={accessoryModal.preselectedDeviceName}
        onClose={() =>
          setAccessoryModal({ isOpen: false, accessoryToEdit: null, preselectedDeviceName: undefined })
        }
      />

      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
      />

      <ImportExportModal
        isOpen={importExportModalOpen}
        onClose={() => setImportExportModalOpen(false)}
      />

      <AtomicWipeModal
        isOpen={atomicWipeModalOpen}
        onClose={() => setAtomicWipeModalOpen(false)}
        onOpenExport={() => setImportExportModalOpen(true)}
      />

      <DeviceDeleteConfirmModal
        isOpen={deviceDeleteModal.isOpen}
        device={deviceDeleteModal.device}
        onClose={() => setDeviceDeleteModal({ isOpen: false, device: null })}
      />

      <CloudOnboardingModal />

      <PortfolioInfoModal
        isOpen={portfolioInfoModalOpen}
        onClose={() => setPortfolioInfoModalOpen(false)}
      />

      <DiagnosticConsoleModal
        isOpen={diagnosticConsoleOpen}
        onClose={() => setDiagnosticConsoleOpen(false)}
      />

      {/* Simple Drive Delete Confirmation Modal */}
      {driveToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-sm bg-white dark:bg-[#18181c] rounded-2xl shadow-2xl border border-rose-300 dark:border-rose-900/60 p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#27272b]">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <Trash2 className="w-4 h-4" />
                <h4 className="text-sm font-bold">{t('deleteDriveTitle')}</h4>
              </div>
              <button
                type="button"
                onClick={() => setDriveToDelete(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-[#f4f4f5] rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600 dark:text-[#a1a1aa]">
              {driveToDelete.device &&
              driveToDelete.device !== 'Sin Dispositivo / Unassigned' &&
              driveToDelete.device !== '__unassigned__'
                ? t('deleteDriveConfirmText', {
                    drive: driveToDelete.drive,
                    device: driveToDelete.device,
                  })
                : t('deleteDriveConfirmTextUnassigned', {
                    drive: driveToDelete.drive,
                  })}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDriveToDelete(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-[#d4d4d8] hover:bg-slate-100 dark:hover:bg-[#222226] rounded-lg cursor-pointer"
              >
                {t('deleteDriveBtnCancel')}
              </button>
              <button
                type="button"
                onClick={handleDeleteDriveConfirm}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs cursor-pointer"
              >
                {t('deleteDriveBtnConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Simple Accessory Delete Confirmation Modal */}
      {accessoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-sm bg-white dark:bg-[#18181c] rounded-2xl shadow-2xl border border-rose-300 dark:border-rose-900/60 p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#27272b]">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <Trash2 className="w-4 h-4" />
                <h4 className="text-sm font-bold">{t('deleteAccessoryTitle')}</h4>
              </div>
              <button
                type="button"
                onClick={() => setAccessoryToDelete(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-[#f4f4f5] rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600 dark:text-[#a1a1aa]">
              {accessoryToDelete.device
                ? t('deleteAccessoryConfirmText', {
                    name: accessoryToDelete.name,
                    device: accessoryToDelete.device,
                  })
                : t('deleteAccessoryConfirmTextUnassigned', {
                    name: accessoryToDelete.name,
                  })}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAccessoryToDelete(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-[#d4d4d8] hover:bg-slate-100 dark:hover:bg-[#222226] rounded-lg cursor-pointer"
              >
                {t('actionCancel')}
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await deleteAccessory(accessoryToDelete.id);
                    showToast(`Accesorio "${accessoryToDelete.name}" eliminado.`, 'success');
                    setAccessoryToDelete(null);
                  } catch (err: any) {
                    showToast(err?.message || 'Error al eliminar accesorio', 'error');
                  }
                }}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs cursor-pointer"
              >
                {t('actionDelete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <StorageProvider>
              <MainAppContent />
            </StorageProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}
