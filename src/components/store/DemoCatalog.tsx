"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { loadDemoData, filterDemo, type DemoData, type DemoFilters } from "./demoData";
import { ProductGrid, ProductGridSkeleton } from "./ProductCard";
import { EmptyState } from "../ui/Empty";
import { withBase } from "@/lib/demo";

const LABELS: Record<string, string> = { q: "بحث", model: "الجهاز", manufacturer: "الشركة", component: "القطعة", condition: "الحالة", stock: "المتوفر فقط", offers: "العروض", tech: "للفنيين", category: "القسم", min: "من سعر", max: "إلى سعر" };

/** قائمة المنتجات في نسخة العرض الثابتة: الفلترة والبحث تتم في المتصفح من بيانات العرض */
export function DemoCatalog({ basePath, locked = {}, maxQty = 100 }: { basePath: string; locked?: DemoFilters; maxQty?: number }) {
  const [data, setData] = useState<DemoData | null>(null);
  const [filters, setFilters] = useState<DemoFilters>({});
  const [error, setError] = useState(false);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const f: DemoFilters = {};
    sp.forEach((v, k) => { if (v) f[k] = v.slice(0, 100); });
    setFilters(f);
    loadDemoData().then(setData).catch(() => setError(true));
  }, []);

  if (error) return <p className="text-sm text-red-300">تعذر تحميل بيانات العرض.</p>;
  if (!data) return <ProductGridSkeleton n={10} />;
  const all = { ...filters, ...locked };
  const items = filterDemo(data.products, all);
  const modelName = all.model ? data.models.find((m) => m.slug === all.model)?.name : null;
  const chips = Object.entries(filters).filter(([k]) => LABELS[k] && !(k in locked));
  const without = (k: string) => {
    const sp = new URLSearchParams(filters as Record<string, string>);
    sp.delete(k);
    const s = sp.toString();
    return withBase(s ? `${basePath}?${s}` : basePath);
  };

  return (
    <div>
      <p className="mb-4 text-sm text-ink-300" aria-live="polite"><span className="font-semibold text-white tabular">{items.length}</span> منتج</p>
      {chips.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {chips.map(([k, v]) => (
            <a key={k} href={without(k)} className="chip border-ink-600 bg-ink-800 py-1 text-ink-100 hover:border-danger/50">
              {LABELS[k]}{["stock", "offers", "tech"].includes(k) ? "" : `: ${k === "model" ? modelName ?? v : v}`} <X className="h-3 w-3" />
            </a>
          ))}
        </div>
      )}
      {modelName && (
        <p className="mb-4 rounded-xl border border-ink-700 bg-ink-900 px-4 py-3 text-sm leading-7 text-ink-300">
          تُعرض القطع المرتبطة بجهاز <strong className="text-white">{modelName}</strong>. انتبه لشارة التوافق في صفحة كل منتج.
        </p>
      )}
      {items.length ? (
        <ProductGrid items={items} maxQty={maxQty} />
      ) : (
        <EmptyState
          title="لا توجد نتائج مطابقة"
          text="نسخة العرض تحتوي عدداً محدوداً من المنتجات التجريبية. جرّب كلمات أخرى أو أزل الفلاتر."
          action={<Link href="/products" className="btn-secondary">عرض كل المنتجات</Link>}
        />
      )}
    </div>
  );
}
