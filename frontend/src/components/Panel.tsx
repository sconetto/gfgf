import type { ReactElement, ReactNode } from "react";

export function Panel({
  title,
  meta,
  children,
}: {
  readonly title: string;
  readonly meta?: ReactNode;
  readonly children: ReactNode;
}): ReactElement {
  return (
    <section className="flex flex-col gap-4 rounded-[12px] border border-separator bg-card p-5">
      <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-[15px] font-semibold text-label">{title}</h2>
        {meta ?? null}
      </header>
      {children}
    </section>
  );
}
