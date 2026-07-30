"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  wide,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  wide?: boolean;
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div
        className="absolute inset-0 bg-ink-950/30 backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-modal animate-scale-in sm:rounded-2xl",
          wide ? "sm:max-w-3xl" : "sm:max-w-lg",
        )}
      >
        {(title || description) && (
          <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
            <div>
              {title && <h2 className="text-[15px] font-semibold tracking-tight text-ink-950">{title}</h2>}
              {description && <p className="mt-0.5 text-[13px] text-ink-500">{description}</p>}
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
              aria-label="Cerrar"
            >
              <X className="size-4" />
            </button>
          </div>
        )}
        <div className="overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2.5 border-t border-line bg-ink-50/50 px-6 py-3.5">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Eliminar",
  danger = true,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm leading-relaxed text-ink-600">{description}</p>
      <div className="mt-5 flex justify-end gap-2.5">
        <button
          onClick={onClose}
          className="h-9 rounded-[10px] border border-line-strong bg-white px-4 text-sm font-medium text-ink-700 transition hover:bg-ink-50"
        >
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={cn(
            "h-9 rounded-[10px] px-4 text-sm font-medium text-white transition disabled:opacity-50",
            danger ? "bg-danger-600 hover:bg-red-700" : "bg-ink-950 hover:bg-ink-800",
          )}
        >
          {loading ? "…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
