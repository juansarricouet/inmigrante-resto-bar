import { redirect } from "next/navigation";
import { getCurrentUser, getTenant } from "@/server/auth";
import { listForms } from "@/server/services/forms";
import { ToastProvider } from "@/components/ui/Toast";
import { AppShell } from "@/components/shell/AppShell";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const tenant = await getTenant();
  if (!tenant) redirect("/onboarding");

  const forms = listForms(tenant.business.id);
  const mainFormSlug = forms.find((f) => f.status === "active" && !f.is_template)?.slug ?? null;

  return (
    <ToastProvider>
      <AppShell
        user={tenant.user}
        business={tenant.business}
        role={tenant.role}
        memberships={tenant.memberships}
        mainFormSlug={mainFormSlug}
      >
        {children}
      </AppShell>
    </ToastProvider>
  );
}
