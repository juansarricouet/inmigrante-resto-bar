import { getInvitationByToken } from "@/server/services/business";
import { getCurrentUser } from "@/server/auth";
import { Logo, LogoMark } from "@/components/Logo";
import { AcceptInviteForm } from "./AcceptInviteForm";

export const dynamic = "force-dynamic";

export default async function InvitePage(props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params;
  const invitation = getInvitationByToken(token);
  const user = await getCurrentUser();

  if (!invitation) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-6 text-center">
        <LogoMark size={40} />
        <h1 className="mt-6 text-xl font-semibold tracking-tight text-ink-950">Invitación no válida</h1>
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-ink-500">
          El enlace venció o ya fue utilizado. Pedile al administrador del comercio que te envíe uno nuevo.
        </p>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-dvh flex-col items-center bg-canvas px-6 py-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-hero-glow" />
      <Logo className="relative" />
      <div className="relative flex w-full flex-1 items-center justify-center py-10">
        <div className="w-full max-w-sm animate-fade-up">
          <div className="mb-7 text-center">
            <h1 className="text-balance text-[24px] font-semibold tracking-tight text-ink-950">
              Te invitaron a <span className="text-brand-700">{invitation.business_name}</span>
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-500">
              Vas a entrar como{" "}
              <span className="font-medium text-ink-700">
                {invitation.role === "admin" ? "administrador" : "miembro"}
              </span>{" "}
              del equipo con el email {invitation.email}.
            </p>
          </div>
          <AcceptInviteForm
            token={token}
            needsAccount={!user}
            emailMatches={user?.email === invitation.email}
          />
        </div>
      </div>
    </main>
  );
}
