import { z } from "zod";
import { prisma } from "./db";
import { getSettings } from "./settings";
import { clampQty, deliveryFee, discountAmount, discountProblem, unitPriceFor } from "./pricing-core";
import { publicBaseWhere } from "./search";

export const cartInputSchema = z.object({
  items: z
    .array(z.object({ productId: z.string().min(1).max(40), quantity: z.number().int().min(1).max(100000), seenPrice: z.number().int().optional() }))
    .max(100),
  governorate: z.string().max(60).optional().nullable(),
  deliveryMethodId: z.string().max(40).optional().nullable(),
  discountCode: z.string().max(40).optional().nullable(),
});

export type CartInput = z.infer<typeof cartInputSchema>;

export type QuoteLine = {
  productId: string;
  slug: string;
  sku: string;
  nameAr: string;
  imageId: string | null;
  quantity: number;
  unitPrice: number;
  regularPrice: number;
  lineTotal: number;
  stockQty: number;
  unitCost: number | null;
  isDemo: boolean;
};

export type QuoteIssue = { productId?: string; kind: "unavailable" | "out_of_stock" | "insufficient" | "price_changed" | "discount" | "min_order" | "delivery"; message: string };

export type Quote = {
  lines: QuoteLine[];
  issues: QuoteIssue[];
  subtotal: number;
  discountTotal: number;
  discountCode: string | null;
  deliveryFee: number | null;
  deliveryMethodName: string | null;
  /** لم تُضبط أي طريقة توصيل بعد — الأجرة تُحدد عند تأكيد الطلب */
  deliveryPending: boolean;
  total: number;
  ok: boolean;
};

/** يحسب السعر النهائي على الخادم من بيانات قاعدة البيانات فقط — لا يثق بأي مجموع من المتصفح */
export async function computeQuote(input: CartInput): Promise<Quote> {
  const s = await getSettings();
  const merged = new Map<string, { quantity: number; seenPrice?: number }>();
  for (const it of input.items) {
    const prev = merged.get(it.productId);
    merged.set(it.productId, { quantity: (prev?.quantity ?? 0) + it.quantity, seenPrice: it.seenPrice ?? prev?.seenPrice });
  }
  const ids = [...merged.keys()];
  const products = ids.length
    ? await prisma.product.findMany({
        where: { AND: [{ id: { in: ids } }, await publicBaseWhere()] },
        include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
      })
    : [];
  const byId = new Map(products.map((p) => [p.id, p]));
  const issues: QuoteIssue[] = [];
  const lines: QuoteLine[] = [];

  for (const [id, { quantity: rawQty, seenPrice }] of merged) {
    const p = byId.get(id);
    if (!p) {
      issues.push({ productId: id, kind: "unavailable", message: "منتج لم يعد متوفراً في المتجر وتمت إزالته" });
      continue;
    }
    if (p.stockQty <= 0) {
      issues.push({ productId: id, kind: "out_of_stock", message: `«${p.nameAr}» نفد من المخزون` });
      continue;
    }
    let quantity = clampQty(rawQty, s.order.maxQtyPerItem);
    if (quantity > p.stockQty) {
      issues.push({ productId: id, kind: "insufficient", message: `الكمية المتوفرة من «${p.nameAr}» هي ${p.stockQty} فقط` });
      quantity = p.stockQty;
    }
    const unitPrice = unitPriceFor(p, quantity);
    if (seenPrice != null && seenPrice !== unitPrice) {
      issues.push({ productId: id, kind: "price_changed", message: `تغيّر سعر «${p.nameAr}». السعر المعتمد الآن هو السعر الظاهر.` });
    }
    lines.push({
      productId: p.id, slug: p.slug, sku: p.sku, nameAr: p.nameAr, imageId: p.images[0]?.uploadId ?? null,
      quantity, unitPrice, regularPrice: p.price, lineTotal: unitPrice * quantity, stockQty: p.stockQty,
      unitCost: p.costPrice, isDemo: p.isDemo,
    });
  }

  const subtotal = lines.reduce((a, l) => a + l.lineTotal, 0);

  let discountTotal = 0;
  let discountCode: string | null = null;
  if (input.discountCode?.trim()) {
    const code = input.discountCode.trim().toUpperCase();
    const d = await prisma.discount.findUnique({ where: { code } });
    const problem = discountProblem(d, subtotal);
    if (problem || !d) issues.push({ kind: "discount", message: problem ?? "كود الخصم غير صالح" });
    else {
      discountTotal = discountAmount(d, subtotal);
      discountCode = d.code;
    }
  }

  let fee: number | null = null;
  let deliveryPending = false;
  let deliveryMethodName: string | null = null;
  const methods = await prisma.deliveryMethod.findMany({ where: { isActive: true }, include: { rates: true }, orderBy: { sortOrder: "asc" } });
  const method = methods.find((m) => m.id === input.deliveryMethodId) ?? (input.deliveryMethodId ? undefined : methods[0]);
  if (input.deliveryMethodId && !method) issues.push({ kind: "delivery", message: "طريقة التوصيل غير متاحة" });
  if (method) {
    deliveryMethodName = method.nameAr;
    fee = deliveryFee(method, input.governorate, subtotal - discountTotal);
  } else if (!methods.length) {
    fee = 0; // لم يضبط المالك أي طريقة توصيل بعد — يُتفق على الأجرة عند التأكيد
    deliveryPending = true;
    deliveryMethodName = "تُحدد أجرة التوصيل عند تأكيد الطلب";
  }

  if (s.order.minOrderTotal > 0 && subtotal < s.order.minOrderTotal && lines.length) {
    issues.push({ kind: "min_order", message: `الحد الأدنى للطلب هو ${s.order.minOrderTotal.toLocaleString("en-US")} د.ع` });
  }

  const total = subtotal - discountTotal + (fee ?? 0);
  const blocking = issues.some((i) => i.kind === "discount" || i.kind === "min_order" || i.kind === "delivery");
  return { lines, issues, subtotal, discountTotal, discountCode, deliveryFee: fee, deliveryMethodName, deliveryPending, total, ok: lines.length > 0 && !blocking };
}
