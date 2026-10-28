import Link from "next/link";
import type { ProductCardData } from "@/lib/search";
import { ProductImage } from "../ui/ProductImage";
import { Price } from "../ui/Price";
import { AddToCartCompact } from "./AddToCart";

export function StockBadge({ qty, low = 3 }: { qty: number; low?: number }) {
  if (qty <= 0) return <span className="chip border-danger/30 bg-danger/10 text-red-300">نفد</span>;
  if (qty <= low) return <span className="chip border-warning/30 bg-warning/10 text-amber-300">كمية محدودة</span>;
  return <span className="chip border-success/30 bg-success/10 text-green-300">متوفر</span>;
}

export function DemoBadge() {
  return (
    <span className="chip border-transparent bg-amber-400 text-ink-950" title="منتج تجريبي للعرض فقط — ليس مخزوناً حقيقياً">
      منتج تجريبي
    </span>
  );
}

export function ProductCard({ p, maxQty = 100 }: { p: ProductCardData; maxQty?: number }) {
  const icon = p.category.icon || p.category.parent?.icon;
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-ink-700/70 bg-ink-900 transition hover:-translate-y-0.5 hover:border-brand-500/50 hover:shadow-glow">
      <Link href={`/product/${p.slug}`} className="relative block aspect-square bg-ink-50" aria-label={p.nameAr}>
        <ProductImage uploadId={p.images[0]?.uploadId} alt={p.images[0]?.alt || p.nameAr} icon={icon} />
        <div className="absolute inset-x-2 top-2 flex flex-wrap gap-1">
          {p.isDemo && <DemoBadge />}
          {p.compareAtPrice != null && p.compareAtPrice > p.price && <span className="chip border-transparent bg-brand-500 text-white">عرض</span>}
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <div className="flex items-center justify-between gap-2 text-[11px] text-ink-400">
          <span className="truncate">{p.category.nameAr}</span>
          {p.condition && <span className="shrink-0 rounded-md bg-ink-800 px-1.5 py-0.5 text-ink-200">{p.condition.nameAr}</span>}
        </div>
        <h3 className="line-clamp-2 min-h-[2.75rem] text-sm font-semibold leading-snug text-white">
          <Link href={`/product/${p.slug}`} className="after:absolute after:inset-0 after:content-[''] focus:outline-none">
            {p.nameAr}
          </Link>
        </h3>
        <div className="mt-auto flex items-end justify-between gap-2">
          <Price price={p.price} compareAt={p.compareAtPrice} size="sm" />
          <StockBadge qty={p.stockQty} />
        </div>
        <div className="relative z-10">
          <AddToCartCompact
            productId={p.id} nameAr={p.nameAr} slug={p.slug} sku={p.sku} imageId={p.images[0]?.uploadId ?? null}
            price={p.price} stockQty={p.stockQty} maxQty={maxQty}
          />
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ items, maxQty }: { items: ProductCardData[]; maxQty?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {items.map((p) => (
        <ProductCard key={p.id} p={p} maxQty={maxQty} />
      ))}
    </div>
  );
}

export function ProductGridSkeleton({ n = 10 }: { n?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" aria-busy="true" aria-label="جارٍ التحميل">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-ink-700/70 bg-ink-900">
          <div className="skeleton aspect-square rounded-none" />
          <div className="space-y-2 p-3.5">
            <div className="skeleton h-3 w-1/2" />
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-2/3" />
            <div className="skeleton mt-3 h-8 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
