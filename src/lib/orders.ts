import { Prisma, type OrderStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "./db";
import { computeQuote, type QuoteIssue } from "./pricing";
import { moveStock, StockError } from "./inventory";
import { randomCode, sha256 } from "./security";
import { toLocalIraqi } from "./whatsapp";
import { IRAQ_GOVERNORATES } from "./constants";
import { getSettings } from "./settings";

export const checkoutSchema = z.object({
  idempotencyKey: z.string().regex(/^[A-Za-z0-9_-]{20,80}$/),
  customerName: z.string().trim().min(2, "الاسم قصير جداً").max(80),
  phone: z.string().trim().min(10).max(20),
  governorate: z.enum(IRAQ_GOVERNORATES, { message: "اختر المحافظة" }),
  area: z.string().trim().min(2, "اكتب المنطقة أو القضاء").max(80),
  address: z.string().trim().min(5, "اكتب العنوان بالتفصيل").max(300),
  notes: z.string().trim().max(500).optional().nullable(),
  deliveryMethodId: z.string().max(40).optional().nullable(),
  discountCode: z.string().max(40).optional().nullable(),
  paymentMethod: z.literal("COD"),
  saveAddress: z.boolean().optional(),
  items: z
    .array(z.object({ productId: z.string().min(1).max(40), quantity: z.number().int().min(1).max(100000), seenPrice: z.number().int().optional() }))
    .min(1, "السلة فارغة")
    .max(100),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

/** رمز الوصول للطلب مشتق من مفتاح منع التكرار — يعيد نفس الرابط عند إعادة الإرسال */
export function orderAccessToken(idempotencyKey: string) {
  return Buffer.from(sha256(`he-order-access:${idempotencyKey}`), "hex").toString("base64url");
}

function orderNumber() {
  const d = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Baghdad", year: "2-digit", month: "2-digit", day: "2-digit" })
    .format(new Date())
    .replace(/-/g, "");
  return `HE${d}-${randomCode(5)}`;
}

export type CreateOrderResult =
  | { ok: true; number: string; token: string; duplicate: boolean }
  | { ok: false; error: string; issues?: QuoteIssue[] };

export async function createOrder(input: CheckoutInput, userId: string | null): Promise<CreateOrderResult> {
  const s = await getSettings();
  if (!s.order.codEnabled) return { ok: false, error: "استلام الطلبات متوقف مؤقتاً. تواصل معنا عبر واتساب." };
  const phone = toLocalIraqi(input.phone);
  if (!phone) return { ok: false, error: "رقم الهاتف غير صحيح. اكتب رقماً عراقياً مثل 07XXXXXXXXX" };
  const token = orderAccessToken(input.idempotencyKey);

  const existing = await prisma.order.findUnique({ where: { idempotencyKey: input.idempotencyKey }, select: { number: true } });
  if (existing) return { ok: true, number: existing.number, token, duplicate: true };

  const quote = await computeQuote({
    items: input.items,
    governorate: input.governorate,
    deliveryMethodId: input.deliveryMethodId,
    discountCode: input.discountCode,
  });
  // أي تغيير (سعر، مخزون، منتج محذوف، خصم) يتطلب مراجعة الزبون قبل التأكيد
  if (quote.issues.length || !quote.ok) {
    return { ok: false, error: "تغيّرت بعض بيانات السلة. راجع التنبيهات ثم أعد المحاولة.", issues: quote.issues };
  }
  if (quote.deliveryFee == null) return { ok: false, error: "تعذر حساب أجرة التوصيل" };

  for (let attempt = 0; attempt < 4; attempt++) {
    const number = orderNumber();
    try {
      await prisma.$transaction(
        async (tx) => {
          // الزبون: صاحب الحساب يُربط بسجله فقط. الضيف يُربط بسجل ضيف بنفس الهاتف (بدون حساب)
          // لا نربط أبداً طلبات ضيف سابقة بحساب، لأن رقم الهاتف غير مُتحقق منه
          let customer = userId ? await tx.customer.findUnique({ where: { userId } }) : null;
          if (userId && !customer) {
            customer = await tx.customer.create({ data: { name: input.customerName, phone, userId } });
          }
          if (!customer) {
            customer = await tx.customer.findFirst({ where: { phone, userId: null } });
            customer = customer
              ? await tx.customer.update({ where: { id: customer.id }, data: { name: input.customerName } })
              : await tx.customer.create({ data: { name: input.customerName, phone } });
          }
          // كود الخصم: زيادة الاستخدام بشكل مشروط لتجنب تجاوز الحد
          if (quote.discountCode) {
            const d = await tx.discount.findUniqueOrThrow({ where: { code: quote.discountCode } });
            const upd = await tx.discount.updateMany({
              where: { id: d.id, isActive: true, ...(d.maxUses != null ? { usedCount: { lt: d.maxUses } } : {}) },
              data: { usedCount: { increment: 1 } },
            });
            if (upd.count !== 1) throw new StockError("تم استنفاد كود الخصم");
          }
          const order = await tx.order.create({
            data: {
              number,
              accessTokenHash: sha256(token),
              idempotencyKey: input.idempotencyKey,
              customerId: customer.id,
              customerName: input.customerName,
              phone,
              governorate: input.governorate,
              area: input.area,
              address: input.address,
              notes: input.notes || null,
              deliveryMethod: quote.deliveryMethodName ?? "يُحدد لاحقاً",
              paymentMethod: "COD",
              subtotal: quote.subtotal,
              discountTotal: quote.discountTotal,
              discountCode: quote.discountCode,
              deliveryFee: quote.deliveryFee!,
              total: quote.total,
              items: {
                create: quote.lines.map((l) => ({
                  productId: l.productId, nameAr: l.nameAr, sku: l.sku, unitPrice: l.unitPrice,
                  unitCost: l.unitCost, quantity: l.quantity, lineTotal: l.lineTotal,
                })),
              },
              history: { create: { toStatus: "NEW", note: "تم إنشاء الطلب من الموقع" } },
            },
          });
          // خصم المخزون ذرياً — يفشل الطلب كله إذا نفد أي منتج
          for (const l of quote.lines) {
            const ok = await tx.product.count({ where: { id: l.productId, price: l.regularPrice, status: "ACTIVE" } });
            if (!ok) throw new StockError(`تغيّر سعر أو حالة «${l.nameAr}». حدّث السلة.`);
            await moveStock(tx, { productId: l.productId, delta: -l.quantity, type: "SALE", reference: order.number, reason: "طلب من الموقع" });
          }
          if (userId && input.saveAddress) {
            const count = await tx.customerAddress.count({ where: { customerId: customer.id, address: input.address, area: input.area } });
            if (!count) {
              await tx.customerAddress.create({
                data: { customerId: customer.id, governorate: input.governorate, area: input.area, address: input.address },
              });
            }
          }
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 15000 },
      );
      return { ok: true, number, token, duplicate: false };
    } catch (e) {
      if (e instanceof StockError) return { ok: false, error: e.message };
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        const target = String((e.meta as { target?: unknown })?.target ?? "");
        // رمز الوصول مشتق من مفتاح منع التكرار، لذا قد يظهر التعارض على أيٍّ منهما عند الإرسال المتزامن
        if (target.includes("idempotencyKey") || target.includes("accessTokenHash")) {
          const again = await prisma.order.findUnique({ where: { idempotencyKey: input.idempotencyKey }, select: { number: true } });
          if (again) return { ok: true, number: again.number, token, duplicate: true };
        }
        if (target.includes("number")) continue; // تصادم رقم الطلب — أعد المحاولة
      }
      throw e;
    }
  }
  return { ok: false, error: "تعذر إنشاء رقم طلب. حاول مرة أخرى." };
}

const ALLOWED: Record<OrderStatus, OrderStatus[]> = {
  NEW: ["AWAITING_CONFIRMATION", "CONFIRMED", "PREPARING", "CANCELLED"],
  AWAITING_CONFIRMATION: ["CONFIRMED", "PREPARING", "CANCELLED"],
  CONFIRMED: ["PREPARING", "SHIPPED", "CANCELLED"],
  PREPARING: ["SHIPPED", "DELIVERED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

export function allowedTransitions(from: OrderStatus): OrderStatus[] {
  return ALLOWED[from];
}

export async function changeOrderStatus(orderId: string, to: OrderStatus, note: string | null, userId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
    if (!ALLOWED[order.status].includes(to)) throw new Error("لا يمكن تغيير الحالة بهذا الاتجاه");
    if (to === "CANCELLED" && !note?.trim()) throw new Error("سبب الإلغاء مطلوب");
    // تحديث مشروط لمنع تعارض تعديلين متزامنين
    const upd = await tx.order.updateMany({
      where: { id: orderId, status: order.status },
      data: {
        status: to,
        ...(to === "CONFIRMED" ? { confirmedAt: new Date() } : {}),
        ...(to === "DELIVERED" ? { deliveredAt: new Date() } : {}),
        ...(to === "CANCELLED" ? { cancelledAt: new Date(), cancelReason: note, stockReleased: true } : {}),
      },
    });
    if (upd.count !== 1) throw new Error("تم تعديل الطلب من مستخدم آخر. حدّث الصفحة.");
    if (to === "CANCELLED" && !order.stockReleased) {
      for (const it of order.items) {
        if (!it.productId) continue;
        await moveStock(tx, { productId: it.productId, delta: it.quantity, type: "SALE_RETURN", reference: order.number, reason: "إلغاء الطلب", userId });
      }
    }
    await tx.orderStatusHistory.create({ data: { orderId, fromStatus: order.status, toStatus: to, note: note || null, userId } });
    return order.number;
  });
}
