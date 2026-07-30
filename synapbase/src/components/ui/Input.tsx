"use client";

import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const base =
  "w-full rounded-[10px] border border-line-strong/80 bg-white px-3.5 text-sm text-ink-950 shadow-[0_1px_2px_rgb(23_23_28/0.04)] outline-none transition-all duration-150 placeholder:text-ink-400 hover:border-ink-300 focus:border-brand-500 focus:ring-[3px] focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-500";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(base, "h-9.5", className)} {...props} />;
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn(base, "min-h-20 py-2.5 leading-relaxed", className)} {...props} />;
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <div className="relative">
        <select ref={ref} className={cn(base, "h-9.5 appearance-none pr-9", className)} {...props}>
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
      </div>
    );
  },
);

export function Field({
  label,
  hint,
  error,
  children,
  className,
  optional,
}: {
  label?: string;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
  className?: string;
  optional?: boolean;
}) {
  return (
    <label className={cn("block", className)}>
      {label && (
        <span className="mb-1.5 flex items-baseline gap-2 text-[13px] font-medium text-ink-800">
          {label}
          {optional && <span className="text-xs font-normal text-ink-400">Opcional</span>}
        </span>
      )}
      {children}
      {hint && !error && <span className="mt-1.5 block text-xs leading-relaxed text-ink-400">{hint}</span>}
      {error && <span className="mt-1.5 block text-xs text-danger-600">{error}</span>}
    </label>
  );
}
