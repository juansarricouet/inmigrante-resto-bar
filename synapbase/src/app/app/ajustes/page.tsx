import { requireTenant } from "@/server/guard";
import { listInvitations, listMembers } from "@/server/services/business";
import { getDb } from "@/server/db";
import { PageHeader } from "@/components/shell/PageHeader";
import { SettingsView } from "./SettingsView";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const tenant = await requireTenant();
  const members = listMembers(tenant.business.id);
  const invitations = listInvitations(tenant.business.id);
  const db = getDb();
  const usage = {
    customers: (db.prepare("SELECT COUNT(*) c FROM customers WHERE business_id = ?").get(tenant.business.id) as { c: number }).c,
    forms: (db.prepare("SELECT COUNT(*) c FROM forms WHERE business_id = ? AND is_template = 0").get(tenant.business.id) as { c: number }).c,
    submissions: (db.prepare("SELECT COUNT(*) c FROM submissions WHERE business_id = ?").get(tenant.business.id) as { c: number }).c,
  };

  return (
    <div>
      <PageHeader
        title="Ajustes"
        description="El perfil de tu comercio, tu equipo y tu suscripción."
      />
      <SettingsView
        business={tenant.business}
        role={tenant.role}
        currentUserId={tenant.user.id}
        members={members}
        invitations={invitations}
        usage={usage}
      />
    </div>
  );
}
