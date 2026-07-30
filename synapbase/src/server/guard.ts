import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser, getTenant, type Tenant } from "./auth";

/**
 * Guard de páginas del panel. Los layouts y las páginas se renderizan en
 * paralelo en Next, así que cada página resuelve su propio contexto.
 */
export async function requireTenant(): Promise<Tenant> {
  const tenant = await getTenant();
  if (tenant) return tenant;
  const user = await getCurrentUser();
  redirect(user ? "/onboarding" : "/login");
}
