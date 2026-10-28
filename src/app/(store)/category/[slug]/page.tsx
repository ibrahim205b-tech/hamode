import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { CatalogView } from "@/components/store/CatalogView";
import { parseFilters } from "@/lib/search";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

async function load(slug: string) {
  return prisma.category.findFirst({
    where: { slug: decodeURIComponent(slug), isActive: true },
    include: { children: { where: { isActive: true }, orderBy: { sortOrder: "asc" } }, parent: true },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await load((await params).slug);
  if (!c) return {};
  return {
    title: c.nameAr,
    description: c.description || `تسوق ${c.nameAr}${c.nameEn ? ` (${c.nameEn})` : ""} لجميع موديلات الهواتف.`,
    alternates: { canonical: `/category/${c.slug}` },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const c = await load((await params).slug);
  if (!c) notFound();
  const f = { ...parseFilters(await searchParams), category: c.slug };
  return (
    <>
      {c.children.length > 0 && (
        <div className="container pt-6">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {c.children.map((ch) => (
              <Link key={ch.id} href={`/category/${ch.slug}`} className="shrink-0 rounded-xl border border-ink-700 bg-ink-900 px-3.5 py-2 text-sm text-ink-200 transition hover:border-brand-500/50 hover:text-white">
                {ch.nameAr}
              </Link>
            ))}
          </div>
        </div>
      )}
      <CatalogView filters={f} basePath={`/category/${c.slug}`} lockCategory title={c.nameAr} description={c.description ?? (c.parent ? `ضمن قسم ${c.parent.nameAr}` : null)} />
    </>
  );
}
