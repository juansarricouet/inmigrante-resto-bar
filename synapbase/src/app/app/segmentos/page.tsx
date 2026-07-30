import { requireTenant } from "@/server/guard";
import { listSegments } from "@/server/services/segments";
import { listTags } from "@/server/services/customers";
import { getDb } from "@/server/db";
import { PageHeader } from "@/components/shell/PageHeader";
import { SegmentsView, type QuestionOption } from "./SegmentsView";

export const dynamic = "force-dynamic";

export default async function SegmentsPage() {
  const tenant = await requireTenant();
  const segments = listSegments(tenant.business.id);
  const tags = listTags(tenant.business.id);
  const totalCustomers = (
    getDb().prepare("SELECT COUNT(*) AS c FROM customers WHERE business_id = ?").get(tenant.business.id) as { c: number }
  ).c;
  const questions = (
    getDb()
      .prepare(
        `SELECT q.id, q.label, q.type, q.options_json, f.name AS form_name
         FROM questions q JOIN forms f ON f.id = q.form_id
         WHERE f.business_id = ? AND f.is_template = 0 AND q.maps_to IS NULL
         ORDER BY f.created_at ASC, q.position ASC`,
      )
      .all(tenant.business.id) as { id: string; label: string; type: string; options_json: string; form_name: string }[]
  ).map((q) => ({
    id: q.id,
    label: q.label,
    type: q.type,
    options: JSON.parse(q.options_json || "[]") as string[],
    form_name: q.form_name,
  })) satisfies QuestionOption[];

  return (
    <div>
      <PageHeader
        title="Segmentos"
        description="Agrupá clientes por comportamiento y datos reales. Después usalos en campañas para traerlos de vuelta."
      />
      <SegmentsView segments={segments} tags={tags} questions={questions} totalCustomers={totalCustomers} />
    </div>
  );
}
