import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

export function Section({ title, subtitle, href, hrefLabel = "عرض الكل", children, id }: { title: string; subtitle?: string; href?: string; hrefLabel?: string; children: ReactNode; id?: string }) {
  return (
    <section className="container mt-14" aria-labelledby={id}>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 id={id} className="section-title">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-ink-300">{subtitle}</p>}
        </div>
        {href && (
          <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-cyan-400 hover:text-cyan-300">
            {hrefLabel} <ArrowLeft className="h-4 w-4" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
