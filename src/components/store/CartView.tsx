"use client";

import Link from "next/link";
import Image from "next/image";
import { AlertTriangle, Minus, Plus, ShoppingBag, Trash2, Loader2 } from "lucide-react";
import { useCart } from "./CartProvider";
import { useQuote } from "./useQuote";
import { formatIQD } from "@/lib/format";
import { cartShareMessage, waLink } from "@/lib/whatsapp";
import { EmptyState } from "../ui/Empty";
import { WhatsAppIcon } from "../ui/WhatsAppIcon";

export function CartView({ waNumber }: { waNumber: string }) {
  const { items, ready, setQty, remove } = useCart();
  const { quote, loading, error } = useQuote();

  if (!ready) return <div className="skeleton h-64 w-full rounded-2xl" />;
  if (!items.length) {
    return (
      <EmptyState
        icon={<ShoppingBag className="h-7 w-7" />}
        title="سلة التسوق فارغة"
        text="ابحث عن القطعة المناسبة لجهازك وأضفها إلى السلة."
        action={<Link href="/products" className="btn-primary">تصفح المنتجات</Link>}
      />
    );
  }

  const lines = quote?.lines ?? [];
  const share = quote
    ? cartShareMessage({
        lines: lines.map((l) => ({ name: l.nameAr, sku: l.sku, quantity: l.quantity, unitPrice: l.unitPrice })),
        subtotal: quote.subtotal,
        deliveryFee: null,
        total: quote.subtotal,
        deliveryKnown: false,
      })
    : "";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-3">
        {error && <p className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-red-200">{error}</p>}
        {quote?.issues.map((i, k) => (
          <p key={k} className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm text-amber-100" role="alert">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {i.message}
          </p>
        ))}
        {(quote ? lines : []).map((l) => (
          <div key={l.productId} className="card flex gap-3 p-3 sm:gap-4 sm:p-4">
            <Link href={`/product/${l.slug}`} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-ink-50 sm:h-24 sm:w-24">
              {l.imageId ? <Image src={`/api/images/${l.imageId}`} alt={l.nameAr} fill sizes="96px" className="object-contain p-1.5" /> : <span className="grid h-full place-items-center text-ink-400"><ShoppingBag className="h-7 w-7" /></span>}
            </Link>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link href={`/product/${l.slug}`} className="line-clamp-2 text-sm font-semibold text-white hover:text-cyan-300">{l.nameAr}</Link>
                  <p className="mt-0.5 font-mono text-xs text-ink-400" dir="ltr">{l.sku}</p>
                  {l.isDemo && <p className="mt-1 text-xs text-amber-300">منتج تجريبي</p>}
                </div>
                <button type="button" onClick={() => remove(l.productId)} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink-400 hover:bg-danger/10 hover:text-red-300" aria-label={`حذف ${l.nameAr}`}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-2">
                <div className="flex items-center rounded-lg border border-ink-600">
                  <button type="button" className="grid h-9 w-9 place-items-center disabled:opacity-40" onClick={() => setQty(l.productId, l.quantity - 1)} disabled={l.quantity <= 1} aria-label="إنقاص"><Minus className="h-4 w-4" /></button>
                  <span className="w-10 text-center text-sm font-semibold tabular" aria-label="الكمية">{l.quantity}</span>
                  <button type="button" className="grid h-9 w-9 place-items-center disabled:opacity-40" onClick={() => setQty(l.productId, l.quantity + 1)} disabled={l.quantity >= l.stockQty} aria-label="زيادة"><Plus className="h-4 w-4" /></button>
                </div>
                <div className="text-end tabular">
                  <p className="text-xs text-ink-400">{formatIQD(l.unitPrice)} للقطعة{l.unitPrice < l.regularPrice && " (سعر جملة)"}</p>
                  <p className="font-bold text-white">{formatIQD(l.lineTotal)}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
        {!quote && loading && <div className="skeleton h-28 w-full rounded-2xl" />}
      </div>

      <aside className="card h-fit p-5 lg:sticky lg:top-32">
        <h2 className="mb-4 text-lg font-bold text-white">ملخص السلة</h2>
        <dl className="space-y-2.5 text-sm tabular">
          <div className="flex justify-between"><dt className="text-ink-300">المجموع الفرعي</dt><dd className="font-semibold text-white">{quote ? formatIQD(quote.subtotal) : "…"}</dd></div>
          <div className="flex justify-between"><dt className="text-ink-300">التوصيل</dt><dd className="text-ink-300">يُحسب في صفحة الطلب</dd></div>
        </dl>
        <div className="my-4 h-px bg-ink-700" />
        <div className="flex items-center justify-between">
          <span className="font-semibold">الإجمالي التقديري</span>
          <span className="text-xl font-bold text-white tabular">{quote ? formatIQD(quote.subtotal) : "…"}</span>
        </div>
        <Link href="/checkout" className={`btn-primary btn-lg mt-5 w-full ${!quote?.lines.length ? "pointer-events-none opacity-50" : ""}`} aria-disabled={!quote?.lines.length}>
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : null} متابعة لإتمام الطلب
        </Link>
        <a href={quote ? waLink(waNumber, share) : undefined} target="_blank" rel="noopener noreferrer" className={`btn-whatsapp mt-2.5 w-full ${!quote?.lines.length ? "pointer-events-none opacity-50" : ""}`}>
          <WhatsAppIcon className="h-5 w-5" /> مشاركة السلة عبر واتساب
        </a>
        <p className="mt-3 text-xs leading-6 text-ink-400">مشاركة السلة عبر واتساب لا تُنشئ طلباً. لتسجيل الطلب في المتجر أكمل صفحة إتمام الطلب.</p>
      </aside>
    </div>
  );
}
