import React from 'react';
import { X, Info, Cloud, Cpu, Database, Image, ShieldCheck, Heart, Github, ExternalLink } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface PortfolioInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PortfolioInfoModal: React.FC<PortfolioInfoModalProps> = ({ isOpen, onClose }) => {
  const { language } = useLanguage();

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        className="w-full max-w-xl bg-white dark:bg-[#18181c] border border-slate-200 dark:border-[#27272b] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-[#27272b] bg-slate-50/70 dark:bg-[#1c1c20]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-600/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {language === 'es' ? 'Arquitectura & Límites Gratuitos' : 'Architecture & Free-Tier Info'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-[#a1a1aa]">
                {language === 'es' ? 'Proyecto de Portafolio Personal' : 'Personal Portfolio Project'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#27272b] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Overview Banner */}
          <div className="p-4 rounded-xl border border-purple-200/80 dark:border-purple-900/50 bg-purple-50/50 dark:bg-purple-950/20 text-purple-900 dark:text-purple-200 leading-relaxed text-xs">
            {language === 'es' ? (
              <p>
                <strong>CollectaHub</strong> fue concebido como una herramienta de uso personal y proyecto de portafolio en GitHub. Opera 100% sobre capas gratuitas de servicios en la nube. Está diseñado para degradar elegantemente si alguna cuota libre se agota, garantizando que tus datos nunca se pierdan ni se rompa la aplicación.
              </p>
            ) : (
              <p>
                <strong>CollectaHub</strong> is a personal portfolio and open-source project hosted on GitHub. It operates entirely on free tiers of modern cloud services. It is engineered with graceful degradation: if any free quota is reached, the app continues functioning smoothly without data loss.
              </p>
            )}
          </div>

          {/* Service Cards */}
          <div className="space-y-3">
            {/* Firestore */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#27272b] bg-slate-50/40 dark:bg-[#202024]/40 flex gap-3.5">
              <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 shrink-0 h-fit">
                <Database className="w-4 h-4" />
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Google Cloud Firestore (Base de Datos)
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                    50k reads / día
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-[#a1a1aa] leading-relaxed">
                  {language === 'es'
                    ? 'Si se alcanza el límite diario de operaciones gratuitas de Google Cloud, tus datos quedan protegidos localmente en el navegador y puedes descargar una copia de seguridad en JSON desde Ajustes.'
                    : 'If the daily free database operations limit is reached, your data remains safely stored in local browser memory and you can export a full JSON backup from Settings.'}
                </p>
              </div>
            </div>

            {/* Gemini AI */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#27272b] bg-slate-50/40 dark:bg-[#202024]/40 flex gap-3.5">
              <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 shrink-0 h-fit">
                <Cpu className="w-4 h-4" />
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Google Gemini AI (Autocompletado & Visión)
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400">
                    Rate Limited
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-[#a1a1aa] leading-relaxed">
                  {language === 'es'
                    ? 'Autocompleta especificaciones técnicas y modera fotos. Si se alcanza el límite de peticiones por minuto/día, la app muestra un aviso amable y te permite rellenar los datos manualmente.'
                    : 'Autofills technical specs and moderates photo safety. If temporary quota is reached, a friendly notice is shown and manual entry remains fully functional.'}
                </p>
              </div>
            </div>

            {/* Cloudinary */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#27272b] bg-slate-50/40 dark:bg-[#202024]/40 flex gap-3.5">
              <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 shrink-0 h-fit">
                <Image className="w-4 h-4" />
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Cloudinary (Almacenamiento de Fotos)
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                    25 GB / mes
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-[#a1a1aa] leading-relaxed">
                  {language === 'es'
                    ? 'Protegido con filtro IA contra contenido explícito y límite de 15 subidas/hora por usuario. Si se agota el plan gratuito, siempre puedes enlazar imágenes públicas por URL.'
                    : 'Protected with AI safety filters and 15 uploads/hour per user. If monthly cloud quota is exhausted, you can still link public images via direct URLs.'}
                </p>
              </div>
            </div>

            {/* Privacy */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#27272b] bg-slate-50/40 dark:bg-[#202024]/40 flex gap-3.5">
              <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shrink-0 h-fit">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="space-y-1 min-w-0">
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {language === 'es' ? 'Privacidad y Aislamiento por Cuenta' : 'Privacy & Account Isolation'}
                </h3>
                <p className="text-xs text-slate-600 dark:text-[#a1a1aa] leading-relaxed">
                  {language === 'es'
                    ? 'Cada usuario con cuenta de Google tiene sus datos, consolas, accesorios y carpetas de fotos estrictamente aislados. Ningún usuario puede ver ni modificar los registros de otro.'
                    : 'Each user logging in with Google has their consoles, drives, accessories and photo directories strictly isolated. No user can view or modify another user\'s catalog.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-200 dark:border-[#27272b] bg-slate-50 dark:bg-[#1a1a1e]">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-[#a1a1aa]">
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
            <span>Open Source Portfolio</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white transition-colors cursor-pointer"
          >
            {language === 'es' ? 'Entendido' : 'Understood'}
          </button>
        </div>
      </div>
    </div>
  );
};
