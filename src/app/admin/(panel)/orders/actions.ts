"use server";

import { revalidatePath } from "next/cache";
import type { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { changeOrderStatus } from "@/lib/orders";
import { audit } from "@/lib/audit";
import { run, fInt, fOpt, fStr, type ActionResult } from "@/lib/admin-action";
import { ORDER_STATUS_LABELS } from "@/lib/constants";

export async function updateStatus(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  return run("orders", async (user) => {
    const id = fStr(fd, "id");
    const to = fStr(fd, "status") as OrderStatus;
    if (!(to in ORDER_STATUS_LABELS)) throw new Error("حالة غير صالحة");
    const note = fOpt(fd, "note");
    const number = await changeOrderStatus(id, to, note, user.id);
    await audit(user.id, "order.status", "Order", id, { number, to, note });
    revalidatePath(`/admin/orders/${id}`);
    return { ok: `تم تغيير الحالة إلى «${ORDER_STATUS_LABELS[to]}»` };
  });
}

export async function recordPayment(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  return run("orders", async (user) => {
    const id = fStr(fd, "id");
    const amount = fInt(fd, "amount", { min: -2_000_000_000 });
    if (!amount) throw new Error("أدخل المبلغ");
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUniqueOrThrow({ where: { id }, include: { payments: true } });
      if (order.status === "CANCELLED" && amount > 0) throw new Error("لا يمكن تسجيل دفعة لطلب ملغي");
      const paid = order.payments.reduce((a, p) => a + p.amount, 0) + amount;
      if (paid < 0) throw new Error("المبلغ المسترجع أكبر من المدفوع");
      await tx.payment.create({ data: { orderId: id, amount, method: "COD", note: fOpt(fd, "note"), userId: user.id } });
      const status = amount < 0 && paid === 0 ? "REFUNDED" : paid <= 0 ? "UNPAID" : paid >= order.total ? "PAID" : "PARTIAL";
      await tx.order.update({ where: { id }, data: { paymentStatus: status } });
    });
    await audit(user.id, "order.payment", "Order", id, { amount });
    revalidatePath(`/admin/orders/${id}`);
    return { ok: "تم تسجيل الدفعة" };
  });
}

export async function updateShipping(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  return run("orders", async (user) => {
    const id = fStr(fd, "id");
    const data = { shippingCarrier: fOpt(fd, "shippingCarrier"), trackingNumber: fOpt(fd, "trackingNumber"), internalNote: fOpt(fd, "internalNote") };
    await prisma.order.update({ where: { id }, data });
    await audit(user.id, "order.shipping", "Order", id, data);
    revalidatePath(`/admin/orders/${id}`);
  });
}

/** تعديل أجرة التوصيل عند التأكيد (مثلاً إذا لم تكن الأجور مضبوطة وقت الطلب) */
export async function updateDeliveryFee(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  return run("orders", async (user) => {
    const id = fStr(fd, "id");
    const fee = fInt(fd, "deliveryFee") ?? 0;
    await prisma.$transaction(async (tx) => {
      const o = await tx.order.findUniqueOrThrow({ where: { id } });
      if (["SHIPPED", "DELIVERED", "CANCELLED"].includes(o.status)) throw new Error("لا يمكن تعديل الأجرة بعد الشحن أو الإلغاء");
      await tx.order.update({ where: { id }, data: { deliveryFee: fee, total: o.subtotal - o.discountTotal + fee } });
      await tx.orderStatusHistory.create({ data: { orderId: id, fromStatus: o.status, toStatus: o.status, note: `تعديل أجرة التوصيل من ${o.deliveryFee} إلى ${fee}`, userId: user.id } });
    });
    await audit(user.id, "order.delivery_fee", "Order", id, { fee });
    revalidatePath(`/admin/orders/${id}`);
  });
}
