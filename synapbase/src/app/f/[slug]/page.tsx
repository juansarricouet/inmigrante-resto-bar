import type { Metadata } from "next";
import { getPublicFormBySlug } from "@/server/services/forms";
import { PublicFormFlow } from "@/components/PublicFormFlow";
import { LogoMark } from "@/components/Logo";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await props.params;
  const found = getPublicFormBySlug(slug);
  return {
    title: found ? `${found.business.name}` : "Formulario",
    description: found ? found.form.incentive : undefined,
  };
}

export default async function PublicFormPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const found = getPublicFormBySlug(slug);

  if (!found) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-6 text-center">
        <LogoMark size={40} />
        <h1 className="mt-6 text-xl font-semibold tracking-tight text-ink-950">
          Este formulario no existe
        </h1>
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-ink-500">
          Puede que el enlace esté vencido o mal escrito. Consultá en el mostrador del comercio.
        </p>
      </main>
    );
  }

  return <PublicFormFlow form={found.form} business={found.business} slug={slug} />;
}
