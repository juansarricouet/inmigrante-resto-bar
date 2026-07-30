import { requireTenant } from "@/server/guard";
import { listForms, listQuestions } from "@/server/services/forms";
import { listSubmissions } from "@/server/services/submissions";
import { PageHeader } from "@/components/shell/PageHeader";
import { DataGrid } from "./DataGrid";

export const dynamic = "force-dynamic";

export default async function DatabasePage() {
  const tenant = await requireTenant();
  const forms = listForms(tenant.business.id).filter((f) => !f.is_template);
  const { rows, total } = listSubmissions(tenant.business.id, { limit: 500 });

  return (
    <div>
      <PageHeader
        title="Base de datos"
        description={`${total} registros capturados por tus formularios. Filtrá, agrupá, editá y exportá.`}
      />
      <DataGrid
        rows={rows}
        forms={forms.map((f) => ({
          id: f.id,
          name: f.name,
          questions: listQuestions(f.id).map((q) => ({
            id: q.id,
            label: q.label,
            type: q.type,
            options: q.options,
          })),
        }))}
        businessName={tenant.business.name}
      />
    </div>
  );
}
