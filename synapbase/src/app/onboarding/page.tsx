import { redirect } from "next/navigation";
import { getCurrentUser, getTenant } from "@/server/auth";
import { OnboardingForm } from "./OnboardingForm";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const tenant = await getTenant();
  if (tenant) redirect("/app");

  return (
    <div className="relative flex min-h-dvh flex-col items-center bg-canvas px-6 py-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-hero-glow" />
      <Logo className="relative" />
      <div className="relative flex w-full flex-1 items-center justify-center py-10">
        <div className="w-full max-w-md animate-fade-up">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex w-fit items-center gap-2 rounded-full border border-line bg-white px-3.5 py-1.5 text-xs font-medium text-ink-500 shadow-card">
              <span className="flex size-4.5 items-center justify-center rounded-full bg-success-100 text-[10px] text-green-700">✓</span>
              Cuenta creada
              <span className="mx-1 h-3 w-px bg-line-strong" />
              <span className="flex size-4.5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-semibold text-white">2</span>
              Tu comercio
            </div>
            <h1 className="text-[26px] font-semibold tracking-tight text-ink-950">
              Contanos sobre tu comercio
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-500">
              Con esto creamos tu panel y tu primer formulario con QR, listo para personalizar.
            </p>
          </div>
          <OnboardingForm userName={user.name} />
        </div>
      </div>
    </div>
  );
}
