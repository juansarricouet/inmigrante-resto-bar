export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4 animate-fade-up">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-ink-950">{title}</h1>
        {description && <p className="mt-1 max-w-xl text-[13.5px] leading-relaxed text-ink-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  );
}
