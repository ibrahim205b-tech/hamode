"use client";

// بيانات نسخة العرض الثابتة: تُحمّل من ملف JSON مولّد من قاعدة بيانات العرض (منتجات تجريبية فقط)
import { BASE_PATH } from "@/lib/demo";
import { expandQuery } from "@/lib/arabic";
import { unitPriceFor } from "@/lib/pricing-core";
import type { ProductCardData } from "@/lib/search";

export type DemoProduct = ProductCardData & {
  searchText: string;
  categorySlugs: string[];
  modelSlugs: string[];
  manufacturerSlugs: string[];
  componentSlug: string | null;
  conditionSlug: string | null;
  wholesalePrice: number | null;
  wholesaleMinQty: number | null;
  createdAt: string;
};

export type DemoData = {
  products: DemoProduct[];
  models: { slug: string; name: string; manufacturer: string }[];
  categories: { slug: string; nameAr: string; nameEn: string | null }[];
};

let cache: Promise<DemoData> | null = null;
export function loadDemoData(): Promise<DemoData> {
  cache ??= fetch(`${BASE_PATH}/demo-data/catalog.json`).then((r) => {
    if (!r.ok) throw new Error("demo data");
    return r.json();
  });
  return cache;
}

export function matchesQuery(text: string, q: string): boolean {
  const groups = expandQuery(q);
  return groups.every((alts) => alts.some((a) => text.includes(a)));
}

export type DemoFilters = Record<string, string | undefined>;

export function filterDemo(products: DemoProduct[], f: DemoFilters): DemoProduct[] {
  let out = products.filter((p) => {
    if (f.q && !matchesQuery(p.searchText, f.q)) return false;
    if (f.category && !p.categorySlugs.includes(f.category)) return false;
    if (f.model && !p.modelSlugs.includes(f.model)) return false;
    if (!f.model && f.manufacturer && !p.manufacturerSlugs.includes(f.manufacturer)) return false;
    if (f.component && p.componentSlug !== f.component) return false;
    if (f.condition && p.conditionSlug !== f.condition) return false;
    if (f.stock === "1" && p.stockQty <= 0) return false;
    if (f.offers === "1" && !(p.compareAtPrice != null && p.compareAtPrice > p.price)) return false;
    if (f.tech === "1" && !p.technicianOnly) return false;
    if (f.min && p.price < Number(f.min)) return false;
    if (f.max && p.price > Number(f.max)) return false;
    return true;
  });
  const sorters: Record<string, (a: DemoProduct, b: DemoProduct) => number> = {
    price_asc: (a, b) => a.price - b.price,
    price_desc: (a, b) => b.price - a.price,
    name: (a, b) => a.nameAr.localeCompare(b.nameAr, "ar"),
    newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
  };
  out = [...out].sort(sorters[f.sort ?? ""] ?? ((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || b.stockQty - a.stockQty));
  return out;
}

/** تسعير السلة في نسخة العرض — نفس قواعد التسعير في التطبيق الكامل (سعر الجملة، المخزون) */
export function demoQuote(data: DemoData, items: { productId: string; quantity: number; seenPrice?: number }[]) {
  const issues: { productId?: string; kind: string; message: string }[] = [];
  const lines = items.flatMap((it) => {
    const p = data.products.find((x) => x.id === it.productId);
    if (!p) {
      issues.push({ productId: it.productId, kind: "unavailable", message: "منتج غير متوفر في نسخة العرض" });
      return [];
    }
    if (p.stockQty <= 0) {
      issues.push({ productId: p.id, kind: "out_of_stock", message: `«${p.nameAr}» نفد من المخزون` });
      return [];
    }
    const quantity = Math.min(it.quantity, p.stockQty);
    if (quantity < it.quantity) issues.push({ productId: p.id, kind: "insufficient", message: `الكمية المتوفرة من «${p.nameAr}» هي ${p.stockQty} فقط` });
    const unitPrice = unitPriceFor({ ...p, status: "ACTIVE" }, quantity);
    return [{ productId: p.id, slug: p.slug, sku: p.sku, nameAr: p.nameAr, imageId: p.images[0]?.uploadId ?? null, quantity, unitPrice, regularPrice: p.price, lineTotal: unitPrice * quantity, stockQty: p.stockQty, isDemo: p.isDemo }];
  });
  const subtotal = lines.reduce((a, l) => a + l.lineTotal, 0);
  return {
    lines, issues, subtotal, discountTotal: 0, discountCode: null, deliveryFee: 0,
    deliveryMethodName: "تُحدد أجرة التوصيل عند التأكيد", deliveryPending: true, total: subtotal, ok: lines.length > 0,
  };
}
