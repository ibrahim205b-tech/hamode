import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";

type Props = { params: Promise<{ manufacturer: string }> };

async function load(slug: string) {
  return prisma.manufacturer.findFirst({
    where: { slug, isActive: true },
    include: {
      families: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        include: { models: { where: { isActive: true }, orderBy: { sortOrder: "asc" }, include: { _count: { select: { compat: { where: { product: { status: "ACTIVE" } } } } } } } },
      },
    },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const m = await load((await params).manufacturer);
  return m ? { title: `قطع غيار ${m.name}`, description: `قطع غيار وصيانة هواتف ${m.name} حسب الموديل.`, alternates: { canonical: `/devices/${m.slug}` } } : {};
}

export default async function ManufacturerPage({ params }: Props) {
  const m = await load((await params).manufacturer);
  if (!m) notFound();
  return (
    <div className="container py-8">
      <nav aria-label="مسار التنقل" className="mb-4 text-xs text-ink-400">
        <Link href="/" className="hover:text-white">الرئيسية</Link> / <Link href="/devices" className="hover:text-white">الأجهزة</Link> / <span className="text-ink-200">{m.name}</span>
      </nav>
      <h1 className="text-2xl font-bold text-white sm:text-3xl">قطع غيار <span dir="ltr">{m.name}</span></h1>
      <Link href={`/products?manufacturer=${m.slug}`} className="link mt-2 inline-block text-sm">عرض كل قطع {m.name}</Link>
      <div className="mt-6 space-y-8">
        {m.families.map((f) => (
          <section key={f.id}>
            <h2 className="mb-3 text-lg font-semibold text-white" dir="ltr">{f.name}</h2>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
              {f.models.map((mo) => (
                <Link key={mo.id} href={`/products?model=${mo.slug}`} className="rounded-xl border border-ink-700 bg-ink-900 px-3.5 py-3 transition hover:border-brand-500/50">
                  <span className="block text-sm font-medium text-white" dir="ltr">{mo.name}</span>
                  <span className="mt-0.5 block text-xs text-ink-400">{mo._count.compat ? `${mo._count.compat} قطعة` : "لا توجد قطع بعد"}</span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
