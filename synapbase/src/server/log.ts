/** Logging estructurado y liviano para el backend. */

type Level = "info" | "warn" | "error";

function write(level: Level, event: string, data?: Record<string, unknown>) {
  const entry = {
    t: new Date().toISOString(),
    level,
    event,
    ...data,
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const log = {
  info: (event: string, data?: Record<string, unknown>) => write("info", event, data),
  warn: (event: string, data?: Record<string, unknown>) => write("warn", event, data),
  error: (event: string, data?: Record<string, unknown>) => write("error", event, data),
};
