/** Cliente HTTP mínimo para hablar con la API interna. */

export class ApiClientError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function api<T = unknown>(
  path: string,
  options?: { method?: string; body?: unknown },
): Promise<T> {
  const res = await fetch(path, {
    method: options?.method ?? (options?.body !== undefined ? "POST" : "GET"),
    headers: options?.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* respuestas vacías */
  }
  if (!res.ok) {
    const message =
      data && typeof data === "object" && "error" in data
        ? String((data as { error: unknown }).error)
        : `Error ${res.status}`;
    throw new ApiClientError(res.status, message);
  }
  return data as T;
}
