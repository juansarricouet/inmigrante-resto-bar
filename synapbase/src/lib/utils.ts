import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/* ————— Formatting (es-AR) ————— */

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("es-AR").format(n);
}

export function formatMoney(n: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatPercent(n: number, decimals = 0): string {
  return `${n.toLocaleString("es-AR", { maximumFractionDigits: decimals })}%`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(d);
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(d);
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso).getTime();
  if (isNaN(d)) return "—";
  const diff = Date.now() - d;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "recién";
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "hace 1 día";
  if (days < 30) return `hace ${days} días`;
  const months = Math.floor(days / 30);
  if (months === 1) return "hace 1 mes";
  if (months < 12) return `hace ${months} meses`;
  const years = Math.floor(months / 12);
  return years === 1 ? "hace 1 año" : `hace ${years} años`;
}

export function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(iso).getTime();
  if (isNaN(d)) return null;
  return Math.floor((Date.now() - d) / 86400000);
}

const MONTHS_ES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

/** "2026-03" → "Mar 26" */
export function formatMonthKey(key: string): string {
  const [y, m] = key.split("-").map(Number);
  if (!y || !m) return key;
  return `${MONTHS_ES[m - 1]} ${String(y).slice(2)}`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

/** Deterministic soft color for avatars/tags from a string */
const AVATAR_HUES = [246, 210, 160, 28, 340, 262, 190, 88];
export function stringHue(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_HUES[h % AVATAR_HUES.length]!;
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Chart palette — coherent with Synapse brand */
export const CHART_COLORS = ["#5b5bd6", "#9b99ec", "#45b08c", "#f0a63c", "#e5646e", "#57a8e0", "#c2c1f5", "#8f8f99"];

export function downloadBlob(content: BlobPart, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
