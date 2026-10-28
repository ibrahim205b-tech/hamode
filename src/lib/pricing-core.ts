// منطق التسعير الصافي (بدون قاعدة بيانات) — قابل للاختبار
export type PricedProduct = {
  id: string;
  price: number;
  wholesalePrice: number | null;
  wholesaleMinQty: number | null;
  stockQty: number;
  status: string;
};

export function unitPriceFor(p: PricedProduct, qty: number): number {
  if (p.wholesalePrice != null && p.wholesaleMinQty != null && p.wholesaleMinQty > 0 && qty >= p.wholesaleMinQty && p.wholesalePrice < p.price) {
    return p.wholesalePrice;
  }
  return p.price;
}

export type DiscountRule = {
  type: "PERCENT" | "FIXED";
  value: number;
  minSubtotal: number | null;
  maxUses: number | null;
  usedCount: number;
  startsAt: Date | null;
  endsAt: Date | null;
  isActive: boolean;
};

export function discountProblem(d: DiscountRule | null, subtotal: number, now = new Date()): string | null {
  if (!d || !d.isActive) return "كود الخصم غير صالح";
  if (d.startsAt && d.startsAt > now) return "كود الخصم لم يبدأ بعد";
  if (d.endsAt && d.endsAt < now) return "انتهت صلاحية كود الخصم";
  if (d.maxUses != null && d.usedCount >= d.maxUses) return "تم استنفاد كود الخصم";
  if (d.minSubtotal != null && subtotal < d.minSubtotal) return "المجموع أقل من الحد الأدنى لاستخدام الكود";
  return null;
}

export function discountAmount(d: Pick<DiscountRule, "type" | "value">, subtotal: number): number {
  if (subtotal <= 0) return 0;
  const raw = d.type === "PERCENT" ? Math.floor((subtotal * Math.min(Math.max(d.value, 0), 100)) / 100) : Math.max(d.value, 0);
  return Math.min(raw, subtotal);
}

export type DeliveryRule = {
  kind: "DELIVERY" | "PICKUP";
  baseFee: number;
  freeOver: number | null;
  rates: { governorate: string; fee: number }[];
};

export function deliveryFee(m: DeliveryRule, governorate: string | null | undefined, amountAfterDiscount: number): number | null {
  if (m.kind === "PICKUP") return 0;
  if (m.freeOver != null && amountAfterDiscount >= m.freeOver) return 0;
  if (!governorate) return null;
  const rate = m.rates.find((r) => r.governorate === governorate);
  return rate ? rate.fee : m.baseFee;
}

export function clampQty(q: unknown, max: number): number {
  const n = Math.floor(Number(q));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, max);
}
