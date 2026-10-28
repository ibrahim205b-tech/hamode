"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, ShoppingCart, Zap } from "lucide-react";
import { useCart } from "./CartProvider";

type P = { productId: string; nameAr: string; slug: string; sku: string; imageId: string | null; price: number; stockQty: number; maxQty: number };

export function AddToCartCompact(p: P) {
  const { add, toast } = useCart();
  const disabled = p.stockQty <= 0;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        add({ productId: p.productId, nameAr: p.nameAr, slug: p.slug, sku: p.sku, imageId: p.imageId, seenPrice: p.price });
        toast(`تمت إضافة «${p.nameAr}» إلى السلة`);
      }}
      className="btn-primary btn-sm w-full !py-2"
      aria-label={`أضف ${p.nameAr} إلى السلة`}
    >
      <ShoppingCart className="h-4 w-4" />
      {disabled ? "نفد المخزون" : "أضف للسلة"}
    </button>
  );
}

export function AddToCartFull(p: P) {
  const { add, toast } = useCart();
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const max = Math.max(1, Math.min(p.stockQty, p.maxQty));
  const disabled = p.stockQty <= 0;
  const item = { productId: p.productId, nameAr: p.nameAr, slug: p.slug, sku: p.sku, imageId: p.imageId, seenPrice: p.price };
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-sm text-ink-300">الكمية</span>
        <div className="flex items-center rounded-xl border border-ink-600 bg-ink-900">
          <button type="button" className="grid h-10 w-10 place-items-center text-ink-200 hover:text-white disabled:opacity-40" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1 || disabled} aria-label="إنقاص الكمية">
            <Minus className="h-4 w-4" />
          </button>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={max}
            value={qty}
            onChange={(e) => setQty(Math.max(1, Math.min(max, parseInt(e.target.value) || 1)))}
            className="w-14 bg-transparent text-center font-semibold tabular focus:outline-none"
            aria-label="الكمية"
            disabled={disabled}
          />
          <button type="button" className="grid h-10 w-10 place-items-center text-ink-200 hover:text-white disabled:opacity-40" onClick={() => setQty((q) => Math.min(max, q + 1))} disabled={qty >= max || disabled} aria-label="زيادة الكمية">
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          className="btn-primary btn-lg"
          disabled={disabled}
          onClick={() => {
            add(item, qty);
            toast(`تمت إضافة ${qty} × «${p.nameAr}» إلى السلة`);
          }}
        >
          <ShoppingCart className="h-5 w-5" /> أضف للسلة
        </button>
        <button
          type="button"
          className="btn-secondary btn-lg"
          disabled={disabled}
          onClick={() => {
            add(item, qty);
            router.push("/checkout");
          }}
        >
          <Zap className="h-5 w-5 text-cyan-400" /> اشترِ الآن
        </button>
      </div>
    </div>
  );
}
