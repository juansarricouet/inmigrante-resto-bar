import { requireTenant } from "@/server/guard";
import { getCustomerFacts } from "@/server/services/customers";
import { PageHeader } from "@/components/shell/PageHeader";
import { CustomersTable, type CustomerRow } from "./CustomersTable";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const tenant = await requireTenant();
  const facts = getCustomerFacts(tenant.business.id);

  const rows: CustomerRow[] = facts.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    gender: c.gender,
    age: c.age,
    visits: c.visits,
    first_visit_at: c.first_visit_at,
    last_visit_at: c.last_visit_at,
    favorite_product: c.favorite_product,
    total_spent: c.total_spent,
    tags: c.tags,
  }));

  return (
    <div>
      <PageHeader
        title="Clientes"
        description={`${rows.length} personas en tu base. Cada una con su historia de consumo.`}
      />
      <CustomersTable rows={rows} />
    </div>
  );
}
