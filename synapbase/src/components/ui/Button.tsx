"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "brand";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-ink-950 text-white hover:bg-ink-800 active:scale-[0.98] shadow-[inset_0_1px_0_rgb(255_255_255/0.12),0_1px_2px_rgb(23_23_28/0.24)]",
  brand:
    "bg-brand-600 text-white hover:bg-brand-700 active:scale-[0.98] shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_1px_2px_rgb(31_31_69/0.3)]",
  secondary:
    "bg-white text-ink-800 border border-line-strong/80 hover:bg-ink-50 hover:border-ink-300 active:scale-[0.98] shadow-[0_1px_2px_rgb(23_23_28/0.05)]",
  ghost: "text-ink-600 hover:bg-ink-100/70 hover:text-ink-900",
  danger: "bg-danger-600 text-white hover:bg-red-700 active:scale-[0.98]",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-lg",
  md: "h-9.5 px-4 text-sm gap-2 rounded-[10px]",
  lg: "h-11 px-5 text-[15px] gap-2 rounded-xl",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", loading, disabled, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex select-none items-center justify-center font-medium outline-none transition-all duration-150",
        "focus-visible:ring-[3px] focus-visible:ring-brand-200",
        "disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
});
