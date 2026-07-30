import { requireTenant } from "@/server/guard";
import { listForms } from "@/server/services/forms";
import { PageHeader } from "@/components/shell/PageHeader";
import { FormsGrid } from "./FormsGrid";

export const dynamic = "force-dynamic";

export default async function FormsPage() {
  const tenant = await requireTenant();
  const forms = listForms(tenant.business.id);

  return (
    <div>
      <PageHeader
        title="Formularios y QR"
        description="Cada formulario tiene su propio QR. Personalizá las preguntas, el diseño y descargalo para tu local."
      />
      <FormsGrid forms={forms} />
    </div>
  );
}
