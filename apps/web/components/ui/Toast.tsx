'use client';

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

export type ToastFn = (message: string, type?: ToastType) => void;

// ── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastFn>(() => {});

// ── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback<ToastFn>((message, type = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    // Keep max 3 visible
    setToasts((prev) => [...prev.slice(-2), { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </ToastContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useToast(): ToastFn {
  return useContext(ToastContext);
}

// ── Toast UI ─────────────────────────────────────────────────────────────────

const TYPE_STYLES: Record<ToastType, string> = {
  success: 'bg-[#25D366]',
  error: 'bg-red-600',
  info: 'bg-gray-800',
};

const TYPE_ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
};

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium pointer-events-auto min-w-[260px] max-w-sm animate-in slide-in-from-right-4 fade-in ${TYPE_STYLES[t.type]}`}
        >
          <span className="text-base leading-none">{TYPE_ICONS[t.type]}</span>
          <span className="flex-1 leading-snug">{t.message}</span>
          <button
            onClick={() => onDismiss(t.id)}
            className="opacity-70 hover:opacity-100 transition-opacity flex-shrink-0 text-xs"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
