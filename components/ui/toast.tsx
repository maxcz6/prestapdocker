"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { Check, X, Info } from "lucide-react";


type ToastVariant = "success" | "error" | "info" | "warning";

type Toast = {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
};

type ToastContextType = {
  toasts: Toast[];
  toast: (t: Omit<Toast, "id">) => void;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((t: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((prev) => [...prev, { ...t, id }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext value={{ toasts, toast, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </ToastContext>
  );
}

function ToastContainer({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: string) => void }) {
  return (
    <div
      aria-live={toasts.some(t => t.variant === "error") ? "assertive" : "polite"}
      aria-label="Notificaciones"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast: t, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [isHovered, setIsHovered] = useState(false);
  useEffect(() => {
    if (isHovered) return;
    const timer = setTimeout(onDismiss, 4500);
    return () => clearTimeout(timer);
  }, [onDismiss, isHovered]);

  const variantStyles: Record<ToastVariant, { border: string; iconBg: string; text: string }> = {
    success: {
      border: "border-emerald-500/30 bg-emerald-500/10",
      iconBg: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
      text: "text-emerald-700 dark:text-emerald-300",
    },
    error: {
      border: "border-rose-500/30 bg-rose-500/10",
      iconBg: "bg-rose-500/20 text-rose-600 dark:text-rose-400",
      text: "text-rose-700 dark:text-rose-300",
    },
    info: {
      border: "border-indigo-500/30 bg-indigo-500/10",
      iconBg: "bg-indigo-500/20 text-indigo-600 dark:text-indigo-400",
      text: "text-indigo-700 dark:text-indigo-300",
    },
    warning: {
      border: "border-amber-500/30 bg-amber-500/10",
      iconBg: "bg-amber-500/20 text-amber-600 dark:text-amber-400",
      text: "text-amber-700 dark:text-amber-300",
    },
  };

  const icons: Record<ToastVariant, React.ReactNode> = {
    success: <Check className="h-3.5 w-3.5" aria-hidden="true" />,
    error: <X className="h-3.5 w-3.5" aria-hidden="true" />,
    info: <Info className="h-3.5 w-3.5" aria-hidden="true" />,
    warning: <Info className="h-3.5 w-3.5" aria-hidden="true" />,
  };

  const style = variantStyles[t.variant];

  return (
    <div
      role="alert"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative overflow-hidden pointer-events-auto rounded-2xl p-4 shadow-xl liquid-glass border ${style.border} transition-all duration-300 animate-in fade-in slide-in-from-bottom-3`}
    >
      <div className="flex items-start gap-3">
        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${style.iconBg}`} aria-hidden="true">
          {icons[t.variant]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-text-primary">{t.title}</p>
          {t.description && <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">{t.description}</p>}
        </div>
        <button
          onClick={onDismiss}
          className="shrink-0 rounded-lg p-1 text-text-muted hover:bg-bg-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
          aria-label="Cerrar notificación"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
      <div 
        className="absolute bottom-0 left-0 h-1 bg-current opacity-20" 
        style={{ 
          animation: isHovered ? "none" : "toastProgress 4.5s linear forwards",
          color: "inherit"
        }} 
      />
    </div>
  );
}
