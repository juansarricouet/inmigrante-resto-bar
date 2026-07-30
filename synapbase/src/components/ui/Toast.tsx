"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastKind = "success" | "error" | "info";
interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
  leaving?: boolean;
}

const ToastContext = createContext<(kind: ToastKind, message: string) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

const icons: Record<ToastKind, React.ReactNode> = {
  success: <CheckCircle2 className="size-4 text-success-600" />,
  error: <AlertCircle className="size-4 text-danger-600" />,
  info: <Info className="size-4 text-brand-600" />,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => {
      setToasts((t) => t.map((x) => (x.id === id ? { ...x, leaving: true } : x)));
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 250);
    }, 3200);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      {typeof document !== "undefined" &&
        createPortal(
          <div className="pointer-events-none fixed bottom-5 left-1/2 z-[100] flex w-full max-w-sm -translate-x-1/2 flex-col items-center gap-2 px-4">
            {toasts.map((t) => (
              <div
                key={t.id}
                className={cn(
                  "pointer-events-auto flex w-auto items-center gap-2.5 rounded-xl border border-line bg-white/95 py-2.5 pl-3.5 pr-4 text-sm font-medium text-ink-800 shadow-pop backdrop-blur transition-all duration-250",
                  t.leaving ? "translate-y-2 opacity-0" : "animate-fade-up",
                )}
              >
                {icons[t.kind]}
                {t.message}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}
