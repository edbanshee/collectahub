import React, { useState, useEffect } from 'react';
import { X, Terminal, CheckCircle2, AlertTriangle, RefreshCw, Copy, Check, Server, Shield, Database, Globe } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useStorage } from '../../context/StorageContext';

interface DiagnosticConsoleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DiagnosticConsoleModal: React.FC<DiagnosticConsoleModalProps> = ({ isOpen, onClose }) => {
  const { language } = useLanguage();
  const { user, authError } = useAuth();
  const { devices, drives, accessories, syncStatus } = useStorage();

  const [copied, setCopied] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [backendLatency, setBackendLatency] = useState<number | null>(null);
  const [backendDetails, setBackendDetails] = useState<string>('');

  const checkBackend = async () => {
    setBackendStatus('checking');
    const start = performance.now();
    try {
      const apiBase = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${apiBase}/api/health`, { method: 'GET' });
      const latency = Math.round(performance.now() - start);
      setBackendLatency(latency);
      if (res.ok) {
        const data = await res.json();
        setBackendStatus('online');
        setBackendDetails(JSON.stringify(data));
      } else {
        setBackendStatus('offline');
        setBackendDetails(`HTTP ${res.status}: ${res.statusText}`);
      }
    } catch (err: any) {
      setBackendStatus('offline');
      setBackendDetails(err?.message || 'Network error');
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkBackend();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const logs = (typeof window !== 'undefined' && window.__BOOT_LOGS__) || [];

  const handleCopy = () => {
    const report = `=== COLLECTAHUB DIAGNOSTIC REPORT ===
Date: ${new Date().toISOString()}
URL: ${window.location.href}
Hostname: ${window.location.hostname}
User Agent: ${navigator.userAgent}
Backend URL: ${import.meta.env.VITE_API_URL || '(same-origin / relative)'}
Backend Status: ${backendStatus} (${backendLatency || 0}ms)
Backend Details: ${backendDetails}
Auth User: ${user ? `${user.email} (${user.uid})` : 'Anonymous / Guest'}
Auth Error: ${authError || 'None'}
Sync Status: ${syncStatus}
Counts: ${devices.length} devices, ${drives.length} drives, ${accessories.length} accessories

=== BOOT LOGS ===
${logs.join('\n')}
`;
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        className="w-full max-w-2xl bg-[#141416] border border-[#27272b] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#27272b] bg-[#1a1a1e]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                {language === 'es' ? 'Consola de Diagnóstico del Sistema' : 'System Diagnostic Console'}
              </h2>
              <p className="text-xs text-slate-400">
                {language === 'es' ? 'Estado del entorno, backend y sincronización' : 'Environment, backend and sync status'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#27272b] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* Status Matrix */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Backend status */}
            <div className="p-3.5 rounded-xl border border-[#27272b] bg-[#1a1a1e] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Server className="w-4 h-4 text-purple-400" />
                <div>
                  <div className="font-bold text-slate-200">
                    {language === 'es' ? 'Backend API (Render)' : 'Backend API (Render)'}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {backendStatus === 'online'
                      ? `Online (${backendLatency}ms)`
                      : backendStatus === 'checking'
                      ? 'Comprobando...'
                      : 'Sin conexión directa'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={checkBackend}
                className="p-1.5 rounded-lg hover:bg-[#27272b] text-slate-400 hover:text-white transition-colors"
                title="Recomprobar"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${backendStatus === 'checking' ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Firebase Auth */}
            <div className="p-3.5 rounded-xl border border-[#27272b] bg-[#1a1a1e] flex items-center gap-2.5">
              <Shield className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="font-bold text-slate-200">
                  {language === 'es' ? 'Autenticación' : 'Authentication'}
                </div>
                <div className="text-[11px] text-slate-400 truncate max-w-[200px]">
                  {user ? user.email : (language === 'es' ? 'Modo Local / Invitado' : 'Local / Guest Mode')}
                </div>
              </div>
            </div>

            {/* Hosting Domain */}
            <div className="p-3.5 rounded-xl border border-[#27272b] bg-[#1a1a1e] flex items-center gap-2.5">
              <Globe className="w-4 h-4 text-blue-400" />
              <div>
                <div className="font-bold text-slate-200">
                  {language === 'es' ? 'Host / Dominio' : 'Host / Domain'}
                </div>
                <div className="text-[11px] text-slate-400 truncate max-w-[200px]">
                  {window.location.hostname}
                </div>
              </div>
            </div>

            {/* Local Storage Items */}
            <div className="p-3.5 rounded-xl border border-[#27272b] bg-[#1a1a1e] flex items-center gap-2.5">
              <Database className="w-4 h-4 text-amber-400" />
              <div>
                <div className="font-bold text-slate-200">
                  {language === 'es' ? 'Registros Locales' : 'Local Records'}
                </div>
                <div className="text-[11px] text-slate-400">
                  {devices.length} dev, {drives.length} drv, {accessories.length} acc
                </div>
              </div>
            </div>
          </div>

          {/* Logs Window */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-300">
                {language === 'es' ? 'Registro de Eventos y Carga' : 'Event and Boot Log'}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#27272b] hover:bg-[#323238] text-slate-200 text-[11px] font-semibold transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? (language === 'es' ? 'Copiado' : 'Copied') : (language === 'es' ? 'Copiar Informe' : 'Copy Report')}</span>
              </button>
            </div>
            <pre className="p-3 bg-[#0a0a0c] border border-[#27272a] rounded-xl font-mono text-[11px] text-slate-300 h-44 overflow-y-auto whitespace-pre-wrap word-break-all leading-relaxed">
              {logs.length > 0 ? logs.join('\n') : '[info] No errors registered in memory.'}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-[#27272b] bg-[#1a1a1e]">
          <span className="text-[11px] text-slate-500">CollectaHub Diagnostics v1.0</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white transition-colors cursor-pointer"
          >
            {language === 'es' ? 'Cerrar' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
