"use client";

import { useEffect, useRef, useState } from "react";
import { useCart } from "./CartProvider";
import { DEMO_STATIC } from "@/lib/demo";
import { demoQuote, loadDemoData } from "./demoData";

export type ClientQuote = {
  lines: { productId: string; slug: string; sku: string; nameAr: string; imageId: string | null; quantity: number; unitPrice: number; regularPrice: number; lineTotal: number; stockQty: number; isDemo: boolean }[];
  issues: { productId?: string; kind: string; message: string }[];
  subtotal: number;
  discountTotal: number;
  discountCode: string | null;
  deliveryFee: number | null;
  deliveryMethodName: string | null;
  deliveryPending: boolean;
  total: number;
  ok: boolean;
};

/** يجلب التسعير الرسمي من الخادم كلما تغيرت السلة أو خيارات التوصيل */
export function useQuote(opts: { governorate?: string; deliveryMethodId?: string; discountCode?: string } = {}) {
  const { items, ready, syncFromQuote } = useCart();
  const [quote, setQuote] = useState<ClientQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);
  const key = JSON.stringify([items.map((i) => [i.productId, i.quantity, i.seenPrice]), opts.governorate, opts.deliveryMethodId, opts.discountCode]);

  useEffect(() => {
    if (!ready) return;
    if (!items.length) {
      setQuote(null);
      setLoading(false);
      return;
    }
    const my = ++seq.current;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        if (DEMO_STATIC) {
          // نسخة العرض الثابتة: لا يوجد خادم، فيُحسب المجموع في المتصفح من بيانات العرض
          const q = demoQuote(await loadDemoData(), items) as ClientQuote;
          if (my !== seq.current) return;
          setQuote(q);
          setError(null);
          syncFromQuote(q.lines);
          return;
        }
        const res = await fetch("/api/cart/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, seenPrice: i.seenPrice })),
            governorate: opts.governorate || null,
            deliveryMethodId: opts.deliveryMethodId || null,
            discountCode: opts.discountCode || null,
          }),
        });
        if (my !== seq.current) return;
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "تعذر حساب السلة");
        const q: ClientQuote = await res.json();
        setQuote(q);
        setError(null);
        syncFromQuote(q.lines);
      } catch (e) {
        if (my === seq.current) setError(e instanceof Error ? e.message : "تعذر الاتصال بالخادم");
      } finally {
        if (my === seq.current) setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready]);

  return { quote, loading, error, setQuote };
}
