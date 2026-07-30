import { cn } from "@/lib/utils";

/** Isotipo Synapse: tres nodos conectados (sinapsis). */
export function LogoMark({ className, size = 26 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden
    >
      <rect width="32" height="32" rx="9" fill="url(#sb-g)" />
      <path d="M10.5 21.5L16 13l5.5 4.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
      <circle cx="10.5" cy="21.5" r="2.6" fill="white" />
      <circle cx="16" cy="13" r="2.1" fill="white" opacity="0.95" />
      <circle cx="21.5" cy="17.5" r="3.1" fill="white" />
      <defs>
        <linearGradient id="sb-g" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6d6ae0" />
          <stop offset="1" stopColor="#4a48b5" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex select-none items-center gap-2.5", className)}>
      <LogoMark />
      {!compact && (
        <span className="text-[17px] font-semibold tracking-tight text-ink-950">
          Synap<span className="text-brand-600">Base</span>
        </span>
      )}
    </span>
  );
}
