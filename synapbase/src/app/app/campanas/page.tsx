import { requireTenant } from "@/server/guard";
import { listCampaigns } from "@/server/services/campaigns";
import { listSegments } from "@/server/services/segments";
import { PageHeader } from "@/components/shell/PageHeader";
import { CampaignsView } from "./CampaignsView";

export const dynamic = "force-dynamic";

export default async function CampaignsPage(props: { searchParams: Promise<{ segmento?: string }> }) {
  const { segmento } = await props.searchParams;
  const tenant = await requireTenant();
  const campaigns = listCampaigns(tenant.business.id);
  const segments = listSegments(tenant.business.id);

  return (
    <div>
      <PageHeader
        title="Campañas"
        description="Mensajes segmentados para que tus clientes vuelvan. Guardá borradores, programá y llevá el historial."
      />
      <CampaignsView campaigns={campaigns} segments={segments} presetSegmentId={segmento ?? null} />
    </div>
  );
}
