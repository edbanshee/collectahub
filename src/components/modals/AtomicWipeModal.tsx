import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Download,
  Trash2,
  Cloud,
  RotateCcw,
  X,
  HardDrive,
} from 'lucide-react';
import { useStorage } from '../../context/StorageContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';

interface AtomicWipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenExport?: () => void;
}

export const AtomicWipeModal: React.FC<AtomicWipeModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { atomicWipe, exportBackup, devices, drives } = useStorage();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'local' | 'cloud' | 'factory'>(
    user ? 'cloud' : 'local'
  );
  const [typedConfirm, setTypedConfirm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Sync activeTab when modal opens or user session state changes
  useEffect(() => {
    if (isOpen) {
      setActiveTab(user ? 'cloud' : 'local');
      setTypedConfirm('');
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const requiredWipeWord = language === 'es' ? 'ELIMINAR' : 'DELETE';
  const isWipeConfirmed = typedConfirm.trim().toUpperCase() === requiredWipeWord;
  const isDemoConfirmed = typedConfirm.trim().toUpperCase() === 'DEMO';

  const handleExport = () => {
    try {
      const data = exportBackup();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `storage_tracker_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(t('toastExportComplete'), 'success');
    } catch (err: any) {
      showToast(err?.message || 'Error al exportar', 'error');
    }
  };

  const handleWipeLocal = async () => {
    if (!isWipeConfirmed) return;
    if (user) {
      showToast(
        language === 'es'
          ? 'No puedes vaciar datos locales mientras tengas una sesión activa.'
          : 'You cannot wipe local data while a session is active.',
        'warning'
      );
      return;
    }
    try {
      setIsProcessing(true);
      await atomicWipe('all');
      showToast(
        language === 'es'
          ? 'Espacio local vaciado con éxito.'
          : 'Local data wiped successfully.',
        'success'
      );
      setTypedConfirm('');
      onClose();
    } catch (err: any) {
      showToast(err?.message || 'Error al vaciar local', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWipeCloud = async () => {
    if (!isWipeConfirmed) return;
    if (!user) {
      showToast(
        language === 'es'
          ? 'Inicia sesión con tu cuenta de Google para gestionar tus datos en la nube.'
          : 'Sign in with your Google account to manage your data.',
        'warning'
      );
      return;
    }
    try {
      setIsProcessing(true);
      await atomicWipe('all');
      showToast(
        language === 'es'
          ? 'Datos en tu cuenta de Google vaciados con éxito.'
          : 'Data in your Google account wiped successfully.',
        'success'
      );
      setTypedConfirm('');
      onClose();
    } catch (err: any) {
      showToast(err?.message || 'Error al vaciar cuenta', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestoreFactory = async () => {
    if (!isDemoConfirmed) return;
    try {
      setIsProcessing(true);
      await atomicWipe('reset_sample');
      showToast(
        language === 'es'
          ? 'Datos de demostración restaurados con éxito.'
          : 'Demo data restored successfully.',
        'success'
      );
      setTypedConfirm('');
      onClose();
    } catch (err: any) {
      showToast(
        err?.message ||
          (language === 'es'
            ? 'Error al restaurar datos de demostración'
            : 'Error restoring demo data'),
        'error'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white dark:bg-[#18181c] rounded-2xl shadow-2xl border border-rose-400 dark:border-rose-900/60 my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header with Red Shield Alert Badge */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-[#27272b] bg-slate-50 dark:bg-[#202024]/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-800/60 shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-[#f4f4f5] tracking-tight">
                {t('dangerZoneTitle')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#a1a1aa]">
                {t('dangerZoneSubtitle')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-[#f4f4f5] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          {/* Amber Warning & Backup Banner */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-300 gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                {t('dangerZoneMemoryNotice', {
                  devices: devices.length,
                  drives: drives.length,
                })}
              </span>
            </div>
            <button
              type="button"
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 dark:text-amber-300 font-bold border border-amber-500/40 transition-colors shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar JSON</span>
            </button>
          </div>

          {/* Active Session / Local Context Banner */}
          {user ? (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-800 dark:text-cyan-300">
              <Cloud className="w-4 h-4 text-cyan-500 shrink-0" />
              <span>
                {t('dangerSessionNoticeCloud', { email: user.email || 'Google' })}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs text-blue-800 dark:text-blue-300">
              <HardDrive className="w-4 h-4 text-blue-500 shrink-0" />
              <span>{t('dangerSessionNoticeLocal')}</span>
            </div>
          )}

          {/* Context-Aware Tabs: Only show Local Wipe if working locally; only show Cloud Wipe if session active */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-[#202024] rounded-xl border border-slate-200 dark:border-[#27272b] text-xs font-semibold">
            {!user ? (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('local');
                  setTypedConfirm('');
                }}
                className={`flex-1 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'local'
                    ? 'bg-white dark:bg-[#18181c] text-slate-900 dark:text-[#f4f4f5] shadow-xs border border-slate-200/60 dark:border-[#2f2f36]'
                    : 'text-slate-500 dark:text-[#a1a1aa] hover:text-slate-900 dark:hover:text-[#f4f4f5]'
                }`}
              >
                <HardDrive className="w-3.5 h-3.5 text-blue-500" />
                <span>{t('dangerTabLocal')}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('cloud');
                  setTypedConfirm('');
                }}
                className={`flex-1 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'cloud'
                    ? 'bg-white dark:bg-[#18181c] text-slate-900 dark:text-[#f4f4f5] shadow-xs border border-slate-200/60 dark:border-[#2f2f36]'
                    : 'text-slate-500 dark:text-[#a1a1aa] hover:text-slate-900 dark:hover:text-[#f4f4f5]'
                }`}
              >
                <Cloud className="w-3.5 h-3.5 text-cyan-500" />
                <span>{t('dangerTabCloud')}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setActiveTab('factory');
                setTypedConfirm('');
              }}
              className={`flex-1 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'factory'
                  ? 'bg-white dark:bg-[#18181c] text-slate-900 dark:text-[#f4f4f5] shadow-xs border border-slate-200/60 dark:border-[#2f2f36]'
                  : 'text-slate-500 dark:text-[#a1a1aa] hover:text-slate-900 dark:hover:text-[#f4f4f5]'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5 text-purple-500" />
              <span>{t('dangerTabFactory')}</span>
            </button>
          </div>

          {/* TAB 1: Borrar Local (Only shown when not logged in) */}
          {activeTab === 'local' && !user && (
            <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20 space-y-3">
              <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-extrabold text-sm">
                <Trash2 className="w-4 h-4" />
                <span>
                  {t('dangerWipeLocalTitle', {
                    count: devices.length + drives.length,
                  })}
                </span>
              </div>

              <p className="text-xs text-slate-600 dark:text-[#a1a1aa] leading-relaxed">
                {t('dangerWipeLocalDesc')}
              </p>

              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#d4d4d8] mb-1">
                  {language === 'es' ? (
                    <>
                      Escribe <span className="font-mono font-bold text-rose-600">{requiredWipeWord}</span> para confirmar:
                    </>
                  ) : (
                    <>
                      Type <span className="font-mono font-bold text-rose-600">{requiredWipeWord}</span> to confirm:
                    </>
                  )}
                </label>
                <input
                  type="text"
                  maxLength={20}
                  value={typedConfirm}
                  onChange={(e) => setTypedConfirm(e.target.value)}
                  placeholder={requiredWipeWord}
                  className="w-full px-3 py-2 bg-white dark:bg-[#202024] border border-slate-300 dark:border-[#27272b] rounded-xl text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-900 dark:text-[#f4f4f5]"
                />
              </div>

              <button
                type="button"
                disabled={!isWipeConfirmed || isProcessing}
                onClick={handleWipeLocal}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  isWipeConfirmed && !isProcessing
                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer'
                    : 'bg-slate-200 dark:bg-[#26262b] text-slate-400 cursor-not-allowed'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t('dangerBtnWipeLocal')}</span>
              </button>
            </div>
          )}

          {/* TAB 2: Borrar en tu Cuenta de Google (Only shown when logged in with active session) */}
          {activeTab === 'cloud' && user && (
            <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20 space-y-3">
              <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-extrabold text-sm">
                <Cloud className="w-4 h-4" />
                <span>{t('dangerWipeCloudTitle', { email: user.email || 'Google' })}</span>
              </div>

              <p className="text-xs text-slate-600 dark:text-[#a1a1aa] leading-relaxed">
                {t('dangerWipeCloudDesc')}
              </p>

              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#d4d4d8] mb-1">
                  {language === 'es' ? (
                    <>
                      Escribe <span className="font-mono font-bold text-rose-600">{requiredWipeWord}</span> para confirmar:
                    </>
                  ) : (
                    <>
                      Type <span className="font-mono font-bold text-rose-600">{requiredWipeWord}</span> to confirm:
                    </>
                  )}
                </label>
                <input
                  type="text"
                  maxLength={20}
                  value={typedConfirm}
                  onChange={(e) => setTypedConfirm(e.target.value)}
                  placeholder={requiredWipeWord}
                  className="w-full px-3 py-2 bg-white dark:bg-[#202024] border border-slate-300 dark:border-[#27272b] rounded-xl text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-900 dark:text-[#f4f4f5]"
                />
              </div>

              <button
                type="button"
                disabled={!isWipeConfirmed || isProcessing}
                onClick={handleWipeCloud}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  isWipeConfirmed && !isProcessing
                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer'
                    : 'bg-slate-200 dark:bg-[#26262b] text-slate-400 cursor-not-allowed'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t('dangerBtnWipeCloud')}</span>
              </button>
            </div>
          )}

          {/* TAB 3: Datos de Demostración (With extra verification step) */}
          {activeTab === 'factory' && (
            <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-900/40 bg-purple-50/40 dark:bg-purple-950/20 space-y-3">
              <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400 font-extrabold text-sm">
                <RotateCcw className="w-4 h-4" />
                <span>{t('dangerFactoryTitle')}</span>
              </div>

              <p className="text-xs text-slate-600 dark:text-[#a1a1aa] leading-relaxed">
                {t('dangerFactoryDesc')}
              </p>

              {/* Extra Notice */}
              <div className="p-2.5 rounded-lg bg-purple-100/60 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800/60 text-[11px] text-purple-800 dark:text-purple-300">
                {user ? (
                  <span>
                    {language === 'es'
                      ? 'Atención: Esta acción reemplazará los datos en la nube vinculada a tu cuenta de Google con los 2 dispositivos y 3 discos de demostración.'
                      : 'Notice: This action will replace data stored in the cloud linked to your Google account with the 2 demo devices and 3 sample drives.'}
                  </span>
                ) : (
                  <span>
                    {language === 'es'
                      ? 'Atención: Esta acción reemplazará los datos del almacenamiento local de este navegador con los 2 dispositivos y 3 discos de demostración.'
                      : 'Notice: This action will replace local browser data with the 2 demo devices and 3 sample drives.'}
                  </span>
                )}
              </div>

              {/* Extra Verification Input: Require typing DEMO */}
              <div className="pt-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#d4d4d8] mb-1">
                  {language === 'es' ? (
                    <>
                      Escribe <span className="font-mono font-bold text-purple-600">DEMO</span> para confirmar:
                    </>
                  ) : (
                    <>
                      Type <span className="font-mono font-bold text-purple-600">DEMO</span> to confirm:
                    </>
                  )}
                </label>
                <input
                  type="text"
                  maxLength={20}
                  value={typedConfirm}
                  onChange={(e) => setTypedConfirm(e.target.value)}
                  placeholder="DEMO"
                  className="w-full px-3 py-2 bg-white dark:bg-[#202024] border border-slate-300 dark:border-[#27272b] rounded-xl text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 dark:text-[#f4f4f5]"
                />
              </div>

              <button
                type="button"
                disabled={!isDemoConfirmed || isProcessing}
                onClick={handleRestoreFactory}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  isDemoConfirmed && !isProcessing
                    ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-xs cursor-pointer'
                    : 'bg-slate-200 dark:bg-[#26262b] text-slate-400 cursor-not-allowed'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t('dangerBtnFactory')}</span>
              </button>
            </div>
          )}
        </div>

        {/* Bottom Bar with Close Button */}
        <div className="p-4 border-t border-slate-200 dark:border-[#27272b] bg-slate-50/50 dark:bg-[#202024]/40 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-[#26262b] text-slate-700 dark:text-[#d4d4d8] hover:bg-slate-300 dark:hover:bg-[#2e2e33] transition-colors cursor-pointer"
          >
            {t('btnClose')}
          </button>
        </div>
      </div>
    </div>
  );
};
