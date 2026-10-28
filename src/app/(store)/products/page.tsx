import type { Metadata } from "next";
import { CatalogView } from "@/components/store/CatalogView";
import { parseFilters } from "@/lib/search";

type SP = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const f = parseFilters(await searchParams);
  return {
    title: f.q ? `نتائج البحث: ${f.q}` : f.offers ? "العروض" : "كل المنتجات",
    alternates: { canonical: "/products" },
    robots: f.q ? { index: false, follow: true } : undefined,
  };
}

export default async function ProductsPage({ searchParams }: { searchParams: SP }) {
  const f = parseFilters(await searchParams);
  const title = f.q ? `نتائج البحث عن «${f.q}»` : f.offers ? "العروض" : f.technician ? "منتجات للفنيين" : "كل المنتجات";
  return <CatalogView filters={f} title={title} />;
}
