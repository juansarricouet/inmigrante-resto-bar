"use client";

import { useEffect, useRef, useState } from "react";
import { Search, type LucideIcon } from "lucide-react";
import { cn, initials, stringHue } from "@/lib/utils";

/* ————— Switch ————— */

export function Switch({
  checked,
  onChange,
  disabled,
  size = "md",
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  const dims = size === "sm" ? "h-4.5 w-8" : "h-5.5 w-10";
  const knob = size === "sm" ? "size-3.5" : "size-4.5";
  const shift = size === "sm" ? "translate-x-3.5" : "translate-x-4.5";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 focus-visible:ring-[3px] focus-visible:ring-brand-200 outline-none disabled:opacity-40",
        dims,
        checked ? "bg-brand-600" : "bg-ink-200 hover:bg-ink-300",
      )}
    >
      <span
        className={cn(
          "block rounded-full bg-white shadow-sm transition-transform duration-200",
          knob,
          checked ? shift : "translate-x-0",
        )}
      />
    </button>
  );
}

/* ————— Avatar ————— */

export function Avatar({ name, size = 32, className }: { name: string; size?: number; className?: string }) {
  const hue = stringHue(name || "?");
  return (
    <span
      className={cn("inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold", className)}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: `hsl(${hue} 65% 94%)`,
        color: `hsl(${hue} 45% 38%)`,
      }}
    >
      {initials(name || "?")}
    </span>
  );
}

/* ————— Search input ————— */

export function SearchInput({
  value,
  onChange,
  placeholder = "Buscar…",
  className,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
      <input
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9.5 w-full rounded-[10px] border border-line-strong/80 bg-white pl-9.5 pr-3.5 text-sm shadow-[0_1px_2px_rgb(23_23_28/0.04)] outline-none transition-all placeholder:text-ink-400 hover:border-ink-300 focus:border-brand-500 focus:ring-[3px] focus:ring-brand-100"
      />
    </div>
  );
}

/* ————— Empty state ————— */

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-16 text-center", className)}>
      {Icon && (
        <div className="mb-4 flex size-12 items-center justify-center rounded-2xl border border-line bg-white shadow-card">
          <Icon className="size-5.5 text-ink-400" strokeWidth={1.75} />
        </div>
      )}
      <h3 className="text-[15px] font-semibold tracking-tight text-ink-900">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-ink-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ————— Dropdown menu ————— */

export function Dropdown({
  trigger,
  children,
  align = "right",
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setOpen((v) => !v)}>{trigger}</div>
      {open && (
        <div
          onClick={() => setOpen(false)}
          className={cn(
            "absolute z-40 mt-1.5 min-w-44 overflow-hidden rounded-xl border border-line bg-white p-1 shadow-pop animate-scale-in",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({
  onClick,
  icon: Icon,
  children,
  danger,
}: {
  onClick?: () => void;
  icon?: LucideIcon;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium transition-colors",
        danger ? "text-danger-600 hover:bg-danger-50" : "text-ink-700 hover:bg-ink-50 hover:text-ink-950",
      )}
    >
      {Icon && <Icon className="size-4 opacity-70" strokeWidth={1.75} />}
      {children}
    </button>
  );
}

/* ————— Tabs (pill style) ————— */

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex items-center gap-0.5 rounded-xl border border-line bg-ink-50/80 p-1", className)}>
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            "rounded-[9px] px-3.5 py-1.5 text-[13px] font-medium transition-all duration-150",
            value === t.value
              ? "bg-white text-ink-950 shadow-[0_1px_3px_rgb(23_23_28/0.08),0_0_0_1px_rgb(23_23_28/0.04)]"
              : "text-ink-500 hover:text-ink-800",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/* ————— Skeleton ————— */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}
