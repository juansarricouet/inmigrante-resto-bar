import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireTenant } from "@/server/guard";
import { getForm } from "@/server/services/forms";
import { FormBuilder } from "./FormBuilder";

export const dynamic = "force-dynamic";

export default async function FormBuilderPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await props.params;
  const { tab } = await props.searchParams;
  const tenant = await requireTenant();
  const form = getForm(tenant.business.id, id);
  if (!form) notFound();

  return (
    <div>
      <Link
        href="/app/formularios"
        className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-500 transition-colors hover:text-ink-900"
      >
        <ArrowLeft className="size-3.5" />
        Formularios
      </Link>
      <FormBuilder
        initialForm={form}
        business={{ name: tenant.business.name, logo_url: tenant.business.logo_url }}
        initialTab={tab === "qr" ? "qr" : tab === "diseno" ? "diseno" : "preguntas"}
      />
    </div>
  );
}
