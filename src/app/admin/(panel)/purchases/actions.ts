"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { moveStock } from "@/lib/inventory";
import { randomCode } from "@/lib/security";
import { isoDay } from "@/lib/format";
import { run, fInt, fOpt, fStr, type ActionResult } from "@/lib/admin-action";

const linesSchema = z.array(z.object({ sku: z.string().trim().min(1).max(50), quantity: z.number().int().min(1).max(1_000_000), unitCost: z.number().int().min(0).max(2_000_000_000) })).min(1, "أضف بنداً واحداً على الأقل").max(300);

export async function createPurchase(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  let id = "";
  const res = await run("purchases", async (user) => {
    const supplierId = fStr(fd, "supplierId");
    if (!supplierId) throw new Error("اختر المورد");
    const lines = linesSchema.parse(JSON.parse(fStr(fd, "lines") || "[]"));
    const products = await prisma.product.findMany({ where: { sku: { in: lines.map((l) => l.sku.toUpperCase()) } }, select: { id: true, sku: true } });
    const bySku = new Map(products.map((p) => [p.sku, p.id]));
    const missing = lines.filter((l) => !bySku.has(l.sku.toUpperCase())).map((l) => l.sku);
    if (missing.length) throw new Error(`رموز غير موجودة: ${missing.join("، ")}`);
    const total = lines.reduce((a, l) => a + l.quantity * l.unitCost, 0);
    const orderDate = fStr(fd, "orderDate");
    const po = await prisma.purchaseOrder.create({
      data: {
        number: `PO${isoDay(new Date()).replace(/-/g, "").slice(2)}-${randomCode(4)}`,
        supplierId, status: "ORDERED", total, notes: fOpt(fd, "notes"), createdById: user.id,
        orderDate: /^\d{4}-\d{2}-\d{2}$/.test(orderDate) ? new Date(`${orderDate}T12:00:00+03:00`) : new Date(),
        items: { create: lines.map((l) => ({ productId: bySku.get(l.sku.toUpperCase())!, quantity: l.quantity, unitCost: l.unitCost })) },
      },
    });
    await audit(user.id, "purchase.create", "PurchaseOrder", po.id, { number: po.number, total });
    id = po.id;
  });
  if (id) redirect(`/admin/purchases/${id}`);
  return res;
}

/** استلام البضاعة: يضيف الكميات للمخزون بحركة «استلام مشتريات» ويحدّث آخر تكلفة للمنتج */
export async function receivePurchase(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  return run("purchases", async (user) => {
    const id = fStr(fd, "id");
    await prisma.$transaction(async (tx) => {
      const upd = await tx.purchaseOrder.updateMany({ where: { id, status: { in: ["DRAFT", "ORDERED"] } }, data: { status: "RECEIVED", receivedAt: new Date() } });
      if (upd.count !== 1) throw new Error("أمر الشراء مستلم أو ملغي مسبقاً");
      const po = await tx.purchaseOrder.findUniqueOrThrow({ where: { id }, include: { items: true } });
      for (const it of po.items) {
        await moveStock(tx, { productId: it.productId, delta: it.quantity, type: "PURCHASE_RECEIPT", reference: po.number, unitCost: it.unitCost, userId: user.id, reason: "استلام أمر شراء" });
        await tx.product.update({ where: { id: it.productId }, data: { costPrice: it.unitCost } });
      }
    });
    await audit(user.id, "purchase.receive", "PurchaseOrder", id);
    revalidatePath(`/admin/purchases/${id}`);
    return { ok: "تم الاستلام وإضافة الكميات للمخزون" };
  });
}

export async function cancelPurchase(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  return run("purchases", async (user) => {
    const id = fStr(fd, "id");
    const upd = await prisma.purchaseOrder.updateMany({ where: { id, status: { in: ["DRAFT", "ORDERED"] } }, data: { status: "CANCELLED" } });
    if (upd.count !== 1) throw new Error("لا يمكن إلغاء أمر مستلم");
    await audit(user.id, "purchase.cancel", "PurchaseOrder", id);
    revalidatePath(`/admin/purchases/${id}`);
    return { ok: "تم الإلغاء" };
  });
}

export async function purchasePayment(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  return run("purchases", async (user) => {
    const id = fStr(fd, "id");
    const amountPaid = fInt(fd, "amountPaid") ?? 0;
    const po = await prisma.purchaseOrder.findUniqueOrThrow({ where: { id } });
    const paymentStatus = amountPaid <= 0 ? "UNPAID" : amountPaid >= po.total ? "PAID" : "PARTIAL";
    await prisma.purchaseOrder.update({ where: { id }, data: { amountPaid, paymentStatus } });
    await audit(user.id, "purchase.payment", "PurchaseOrder", id, { amountPaid });
    revalidatePath(`/admin/purchases/${id}`);
  });
}
