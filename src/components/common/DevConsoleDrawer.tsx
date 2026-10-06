import React, { useState, useEffect } from 'react';
import { Terminal, ChevronUp, ChevronDown, Trash2, Copy, Check, AlertTriangle, XCircle, Globe, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { devLogger, LogEntry } from '../../utils/devLogger';

const ALLOWED_ADMIN_EMAILS = [
  'theneonspartan@gmail.com',
  'jsantoyo2297@gmail.com',
];

export const DevConsoleDrawer: React.FC = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [filter, setFilter] = useState<'all' | 'error' | 'network'>('all');

  // Strict access: Only visible for the designated admin emails
  const userEmail = user?.email?.toLowerCase().trim() || '';
  const isAdmin = ALLOWED_ADMIN_EMAILS.includes(userEmail);

  useEffect(() => {
    if (!isAdmin) return;
    devLogger.init();
    const unsubscribe = devLogger.subscribe((newLogs) => {
      setLogs([...newLogs]);
    });
    return () => unsubscribe();
  }, [isAdmin]);

  if (!isAdmin) {
    return null;
  }

  const errorCount = logs.filter((l) => l.type === 'error' || l.type === 'network').length;

  const filteredLogs = logs.filter((log) => {
    if (filter === 'error') return log.type === 'error';
    if (filter === 'network') return log.type === 'network';
    return true;
  });

  const handleCopySingle = (log: LogEntry) => {
    const text = `[${log.timestamp}] [${log.type.toUpperCase()}] ${log.message}\n${log.details ? typeof log.details === 'object' ? JSON.stringify(log.details, null, 2) : log.details : ''}`;
    navigator.clipboard.writeText(text);
    setCopiedId(log.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyAll = () => {
    if (logs.length === 0) return;
    const text = logs
      .map(
        (l) =>
          `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.message}\n${
            l.details ? (typeof l.details === 'object' ? JSON.stringify(l.details, null, 2) : l.details) : ''
          }`
      )
      .join('\n---\n');
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 font-mono text-xs select-text shadow-2xl transition-all">
      {/* Top Header Bar */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between px-4 py-2 bg-slate-950 text-slate-200 border-t border-purple-500/40 cursor-pointer hover:bg-slate-900 transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-5 h-5 rounded-md bg-purple-600/30 text-purple-400 flex items-center justify-center shrink-0">
            <Terminal className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-slate-100 flex items-center gap-1.5 truncate">
            <span>Debug Console</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800">
              {userEmail}
            </span>
          </span>

          {errorCount > 0 ? (
            <span className="px-2 py-0.5 rounded-full bg-rose-950/80 text-rose-300 border border-rose-800 text-[10px] font-bold animate-pulse">
              {errorCount} {errorCount === 1 ? 'error' : 'errores'}
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800 text-[10px]">
              0 errores
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {isOpen && (
            <>
              <button
                type="button"
                onClick={handleCopyAll}
                disabled={logs.length === 0}
                className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] disabled:opacity-40 transition-colors"
                title="Copiar todos los logs"
              >
                {copiedAll ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedAll ? 'Copiado' : 'Copiar todo'}</span>
              </button>

              <button
                type="button"
                onClick={() => devLogger.clear()}
                className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 text-[11px] transition-colors"
                title="Limpiar consola"
              >
                <Trash2 className="w-3 h-3" />
                <span>Limpiar</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title={isOpen ? 'Minimizar' : 'Expandir'}
          >
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Logs Panel */}
      {isOpen && (
        <div className="bg-[#0b0c10] border-t border-slate-800 max-h-72 flex flex-col">
          {/* Filter Bar */}
          <div className="flex items-center justify-between px-4 py-1.5 bg-slate-900/70 border-b border-slate-800 text-[11px]">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Filtrar:</span>
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`px-2 py-0.5 rounded ${
                  filter === 'all' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Todos ({logs.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('error')}
                className={`px-2 py-0.5 rounded ${
                  filter === 'error' ? 'bg-rose-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Errores ({logs.filter((l) => l.type === 'error').length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('network')}
                className={`px-2 py-0.5 rounded ${
                  filter === 'network' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Red API ({logs.filter((l) => l.type === 'network').length})
              </button>
            </div>
            <span className="text-slate-500 text-[10px]">
              {logs.length} eventos registrados
            </span>
          </div>

          {/* Log List */}
          <div className="p-3 overflow-y-auto space-y-2 flex-1 max-h-60">
            {filteredLogs.length === 0 ? (
              <div className="py-6 text-center text-slate-500">
                <p>No hay eventos registrados en este momento.</p>
                <p className="text-[10px] text-slate-600 mt-0.5">
                  Cualquier error en llamadas fetch, Cloudinary o renderizado aparecerá aquí automáticamente.
                </p>
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className={`p-2 rounded-lg border flex items-start justify-between gap-2.5 transition-colors ${
                    log.type === 'error'
                      ? 'bg-rose-950/20 border-rose-900/40 text-rose-200'
                      : log.type === 'network'
                      ? 'bg-blue-950/20 border-blue-900/40 text-blue-200'
                      : 'bg-amber-950/20 border-amber-900/40 text-amber-200'
                  }`}
                >
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    <div className="mt-0.5 shrink-0">
                      {log.type === 'error' && <XCircle className="w-3.5 h-3.5 text-rose-400" />}
                      {log.type === 'network' && <Globe className="w-3.5 h-3.5 text-blue-400" />}
                      {log.type === 'warn' && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 text-[10px]">{log.timestamp}</span>
                        <span className="font-bold text-xs break-all">{log.message}</span>
                      </div>
                      {log.details && (
                        <pre className="p-1.5 rounded bg-black/60 text-[10px] text-slate-300 overflow-x-auto whitespace-pre-wrap break-all border border-white/5">
                          {typeof log.details === 'object'
                            ? JSON.stringify(log.details, null, 2)
                            : log.details}
                        </pre>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopySingle(log)}
                    className="p-1 rounded bg-black/40 hover:bg-black/70 text-slate-400 hover:text-slate-100 transition-colors shrink-0"
                    title="Copiar este error"
                  >
                    {copiedId === log.id ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
