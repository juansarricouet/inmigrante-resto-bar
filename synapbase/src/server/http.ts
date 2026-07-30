import "server-only";
import { NextResponse } from "next/server";
import { ZodSchema } from "zod";
import { getTenant, type Tenant } from "./auth";
import { log } from "./log";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data as unknown as Record<string, unknown>, init);
}

/**
 * Envuelve un handler autenticado: resuelve el tenant, captura errores y
 * devuelve JSON consistente. El aislamiento multi-tenant nace acá.
 */
export function withTenant<Args extends unknown[]>(
  handler: (tenant: Tenant, req: Request, ...args: Args) => Promise<Response> | Response,
) {
  return async (req: Request, ...args: Args): Promise<Response> => {
    try {
      const tenant = await getTenant();
      if (!tenant) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
      return await handler(tenant, req, ...args);
    } catch (err) {
      return handleError(err, req);
    }
  };
}

export function withPublic<Args extends unknown[]>(
  handler: (req: Request, ...args: Args) => Promise<Response> | Response,
) {
  return async (req: Request, ...args: Args): Promise<Response> => {
    try {
      return await handler(req, ...args);
    } catch (err) {
      return handleError(err, req);
    }
  };
}

function handleError(err: unknown, req: Request): Response {
  if (err instanceof ApiError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  log.error("api.unhandled", {
    url: req.url,
    message: err instanceof Error ? err.message : String(err),
  });
  return NextResponse.json(
    { error: "Ocurrió un error inesperado. Probá de nuevo." },
    { status: 500 },
  );
}

export async function parseBody<T>(req: Request, schema: ZodSchema<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ApiError(400, "El cuerpo de la petición no es JSON válido");
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue?.path?.length ? ` (${issue.path.join(".")})` : "";
    throw new ApiError(400, `${issue?.message ?? "Datos inválidos"}${path}`);
  }
  return result.data;
}

/** Verificación simple de rol para acciones administrativas. */
export function requireRole(tenant: Tenant, roles: string[]) {
  if (!roles.includes(tenant.role)) {
    throw new ApiError(403, "No tenés permisos para esta acción");
  }
}
