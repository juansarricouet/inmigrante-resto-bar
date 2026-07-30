import { cn } from "@/lib/utils";

export type BadgeColor = "gray" | "violet" | "green" | "amber" | "red" | "sky" | "pink";

const colors: Record<BadgeColor, string> = {
  gray: "bg-ink-100 text-ink-600",
  violet: "bg-brand-100 text-brand-800",
  green: "bg-success-100 text-green-800",
  amber: "bg-warning-100 text-amber-800",
  red: "bg-danger-100 text-red-800",
  sky: "bg-sky-100 text-sky-800",
  pink: "bg-pink-100 text-pink-800",
};

export function Badge({
  color = "gray",
  children,
  className,
  dot,
}: {
  color?: BadgeColor;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        colors[color] ?? colors.gray,
        className,
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  );
}

/** Colores válidos para etiquetas creadas por el comercio */
export const TAG_COLORS: BadgeColor[] = ["violet", "green", "amber", "red", "sky", "pink", "gray"];
