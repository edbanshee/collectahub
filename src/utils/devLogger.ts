/**
 * Developer logger interceptor for the admin debugging console.
 * Captures console.error, console.warn, unhandled exceptions, and API failure responses.
 */

export interface LogEntry {
  id: string;
  timestamp: string;
  type: 'error' | 'warn' | 'network';
  message: string;
  details?: string | Record<string, any>;
}

type Listener = (logs: LogEntry[]) => void;

class DevLogger {
  private logs: LogEntry[] = [];
  private listeners: Set<Listener> = new Set();
  private initialized = false;

  public init() {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;

    // Capture unhandled JS errors
    window.addEventListener('error', (event) => {
      this.addLog({
        type: 'error',
        message: event.message || 'Unhandled window error',
        details: event.error?.stack || `${event.filename}:${event.lineno}`,
      });
    });

    // Capture unhandled Promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;
      const msg = reason instanceof Error ? reason.message : String(reason || 'Unhandled Promise Rejection');
      // Skip noisy Vite WebSocket dev errors
      if (msg.includes('WebSocket')) return;

      this.addLog({
        type: 'error',
        message: msg,
        details: reason instanceof Error ? reason.stack : undefined,
      });
    });

    // Intercept console.error
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      originalConsoleError.apply(console, args);
      const msg = args
        .map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a)))
        .join(' ');
      if (!msg.includes('WebSocket')) {
        this.addLog({
          type: 'error',
          message: msg,
        });
      }
    };

    // Intercept console.warn
    const originalConsoleWarn = console.warn;
    console.warn = (...args: any[]) => {
      originalConsoleWarn.apply(console, args);
      const msg = args
        .map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a)))
        .join(' ');
      if (!msg.includes('WebSocket')) {
        this.addLog({
          type: 'warn',
          message: msg,
        });
      }
    };
  }

  public logNetwork(method: string, url: string, status: number, errorData?: any) {
    const errorMsg =
      typeof errorData === 'object'
        ? errorData?.message || errorData?.error || JSON.stringify(errorData)
        : String(errorData || 'HTTP Error');

    this.addLog({
      type: 'network',
      message: `[${method.toUpperCase()}] ${status} ${url}`,
      details: errorMsg,
    });
  }

  public addLog(entry: Omit<LogEntry, 'id' | 'timestamp'>) {
    const newEntry: LogEntry = {
      ...entry,
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString(),
    };

    // Keep up to 100 recent entries
    this.logs = [newEntry, ...this.logs.slice(0, 99)];
    this.notify();
  }

  public getLogs(): LogEntry[] {
    return this.logs;
  }

  public clear() {
    this.logs = [];
    this.notify();
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.logs);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => fn(this.logs));
  }
}

export const devLogger = new DevLogger();
