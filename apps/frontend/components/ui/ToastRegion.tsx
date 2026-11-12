'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
} from 'lucide-react';
import { ApiError, extractErrorMessage } from '@/lib/api';

function resolveUnknownErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    return err.message || extractErrorMessage(err.rawMessage, err.statusCode);
  }
  if (err instanceof Error && err.message.trim().length > 0) {
    return err.message;
  }
  if (typeof err === 'string' && err.trim().length > 0) {
    return err;
  }
  return fallback;
}

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  durationMs: number;
}

export interface ToastInput {
  variant?: ToastVariant;
  title: string;
  description?: string;
  durationMs?: number;
}

export interface ToastContextValue {
  toasts: ToastItem[];
  showToast: (input: ToastInput) => string;
  dismissToast: (id: string) => void;
  clearToasts: () => void;
  success: (title: string, description?: string, durationMs?: number) => string;
  error: (title: string, description?: string, durationMs?: number) => string;
  warning: (title: string, description?: string, durationMs?: number) => string;
  info: (title: string, description?: string, durationMs?: number) => string;
  apiError: (err: unknown, fallback?: string) => string;
}

const DEFAULT_DURATION_MS = 4500;
const MAX_VISIBLE_TOASTS = 5;

const ToastContext = createContext<ToastContextValue | null>(null);

let toastSequence = 0;

function createToastId(): string {
  toastSequence += 1;
  return `cc-toast-${toastSequence}-${Math.random().toString(36).slice(2, 7)}`;
}

function subscribeToOpenModal(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  const handleChange = () => {
    onStoreChange();
  };

  window.addEventListener('cc-dialog-change', handleChange);

  const observer = new MutationObserver(() => {
    onStoreChange();
  });

  if (document.body) {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['open'],
    });
  }

  return () => {
    window.removeEventListener('cc-dialog-change', handleChange);
    observer.disconnect();
  };
}

function getModalOpenSnapshot(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }
  return Boolean(document.querySelector('dialog[open]'));
}

function getModalServerSnapshot(): boolean {
  return false;
}

export function ToastProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const dismissToast = useCallback((id: string) => {
    const existingTimer = timersRef.current.get(id);
    if (existingTimer) {
      clearTimeout(existingTimer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    for (const timer of timersRef.current.values()) {
      clearTimeout(timer);
    }
    timersRef.current.clear();
    setToasts([]);
  }, []);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }
      timers.clear();
    };
  }, []);

  const showToast = useCallback(
    ({
      variant = 'info',
      title,
      description,
      durationMs = DEFAULT_DURATION_MS,
    }: ToastInput): string => {
      const id = createToastId();
      const nextToast: ToastItem = {
        id,
        variant,
        title,
        description,
        durationMs,
      };

      setToasts((prev) => {
        const updated = [...prev, nextToast];
        if (updated.length > MAX_VISIBLE_TOASTS) {
          const evicted = updated.slice(0, updated.length - MAX_VISIBLE_TOASTS);
          for (const item of evicted) {
            const timer = timersRef.current.get(item.id);
            if (timer) {
              clearTimeout(timer);
              timersRef.current.delete(item.id);
            }
          }
          return updated.slice(-MAX_VISIBLE_TOASTS);
        }
        return updated;
      });

      if (durationMs > 0) {
        const timer = setTimeout(() => {
          dismissToast(id);
        }, durationMs);
        timersRef.current.set(id, timer);
      }

      return id;
    },
    [dismissToast],
  );

  const success = useCallback(
    (title: string, description?: string, durationMs?: number) =>
      showToast({ variant: 'success', title, description, durationMs }),
    [showToast],
  );

  const error = useCallback(
    (title: string, description?: string, durationMs?: number) =>
      showToast({
        variant: 'error',
        title,
        description,
        durationMs: durationMs ?? 6000,
      }),
    [showToast],
  );

  const warning = useCallback(
    (title: string, description?: string, durationMs?: number) =>
      showToast({ variant: 'warning', title, description, durationMs }),
    [showToast],
  );

  const info = useCallback(
    (title: string, description?: string, durationMs?: number) =>
      showToast({ variant: 'info', title, description, durationMs }),
    [showToast],
  );

  const apiError = useCallback(
    (err: unknown, fallback = 'No pudimos completar la solicitud.') =>
      showToast({
        variant: 'error',
        title: 'Ocurrió un problema',
        description: resolveUnknownErrorMessage(err, fallback),
        durationMs: 6000,
      }),
    [showToast],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toasts,
      showToast,
      dismissToast,
      clearToasts,
      success,
      error,
      warning,
      info,
      apiError,
    }),
    [
      toasts,
      showToast,
      dismissToast,
      clearToasts,
      success,
      error,
      warning,
      info,
      apiError,
    ],
  );

  return (
    <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast debe utilizarse dentro de un ToastProvider.');
  }
  return context;
}

const VARIANT_CONFIG: Record<
  ToastVariant,
  {
    accentBorder: string;
    iconBg: string;
    iconColor: string;
    Icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  }
> = {
  success: {
    accentBorder: 'border-l-4 border-l-emerald-600',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    Icon: CheckCircle2,
  },
  error: {
    accentBorder: 'border-l-4 border-l-rose-600',
    iconBg: 'bg-rose-50',
    iconColor: 'text-rose-600',
    Icon: AlertCircle,
  },
  warning: {
    accentBorder: 'border-l-4 border-l-amber-600',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    Icon: AlertTriangle,
  },
  info: {
    accentBorder: 'border-l-4 border-l-teal-600',
    iconBg: 'bg-teal-50',
    iconColor: 'text-teal-600',
    Icon: Info,
  },
};

export function ToastRegion() {
  const { toasts, dismissToast } = useToast();
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const isModalOpen = useSyncExternalStore(
    subscribeToOpenModal,
    getModalOpenSnapshot,
    getModalServerSnapshot,
  );

  const shouldDisplay = toasts.length > 0 && !isModalOpen;

  useEffect(() => {
    const el = popoverRef.current;
    if (!el) {
      return;
    }

    const supportsPopover =
      typeof el.showPopover === 'function' &&
      typeof el.hidePopover === 'function';

    if (!supportsPopover) {
      return;
    }

    try {
      const isOpen = el.matches(':popover-open');
      if (shouldDisplay && !isOpen) {
        el.showPopover();
      } else if (!shouldDisplay && isOpen) {
        el.hidePopover();
      }
    } catch {
      // Ignorar errores transitorios del top layer al desmontar o ocultar Activity
    }

    return () => {
      try {
        if (el.matches(':popover-open')) {
          el.hidePopover();
        }
      } catch {
        // Ignorar si ya fue removido del DOM
      }
    };
  }, [shouldDisplay]);

  return (
    <div
      ref={popoverRef}
      popover="manual"
      role="status"
      aria-live="polite"
      aria-atomic="false"
      aria-label="Notificaciones"
      className="cc-toast-popover"
    >
      {shouldDisplay
        ? toasts.map((toast) => {
            const config = VARIANT_CONFIG[toast.variant];
            const Icon = config.Icon;

            return (
              <div
                key={toast.id}
                className={`pointer-events-auto flex w-full items-start gap-3 rounded-[12px] border border-slate-200 bg-white p-4 shadow-lg ${config.accentBorder}`}
              >
                <span
                  className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${config.iconBg} ${config.iconColor}`}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">
                    {toast.title}
                  </p>
                  {toast.description ? (
                    <p className="mt-0.5 text-sm leading-5 text-slate-600">
                      {toast.description}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => dismissToast(toast.id)}
                  aria-label="Cerrar notificación"
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
            );
          })
        : null}
    </div>
  );
}
