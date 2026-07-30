import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { SCHEMA } from "./schema.mjs";

const DB_PATH =
  process.env.SYNAPBASE_DB || path.join(process.cwd(), "data", "synapbase.db");

declare global {
  // eslint-disable-next-line no-var
  var __synapbase_db: DatabaseSync | undefined;
}

/** Conexión singleton (sobrevive el HMR de Next en desarrollo). */
export function getDb(): DatabaseSync {
  if (globalThis.__synapbase_db) return globalThis.__synapbase_db;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(SCHEMA);
  globalThis.__synapbase_db = db;
  return db;
}

/** SQLite no acepta undefined: normaliza a null y booleanos a 0/1. */
export function sv(v: unknown): string | number | null {
  if (v === undefined || v === null) return null;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "number" || typeof v === "string") return v;
  return JSON.stringify(v);
}

export function tx<T>(fn: () => T): T {
  const db = getDb();
  db.exec("BEGIN");
  try {
    const out = fn();
    db.exec("COMMIT");
    return out;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function uid(): string {
  return crypto.randomUUID();
}

const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
/** Código corto legible (slugs públicos, códigos de descuento). */
export function shortCode(len = 6): string {
  const bytes = crypto.randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i]! % ALPHABET.length];
  return out;
}

export function parseJson<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== "string" || raw === "") return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/* ————— Fechas en la zona horaria del comercio ————— */

const AR_TZ = "America/Argentina/Buenos_Aires";

export function monthKey(iso: string, timeZone = AR_TZ): string {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value ?? "0000";
  const m = parts.find((p) => p.type === "month")?.value ?? "00";
  return `${y}-${m}`;
}

export function localHour(date: Date, timeZone = AR_TZ): number {
  return Number(
    new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hour12: false, }).format(date),
  ) % 24;
}

export function localWeekday(date: Date, timeZone = AR_TZ): number {
  const wd = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(date);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(wd);
}

/** Clave de mes actual y de hace N meses (TZ AR). */
export function monthKeyNow(offsetMonths = 0, timeZone = AR_TZ): string {
  const now = new Date();
  const key = monthKey(now.toISOString(), timeZone);
  if (offsetMonths === 0) return key;
  const [y, m] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y!, m! - 1 + offsetMonths, 15));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
