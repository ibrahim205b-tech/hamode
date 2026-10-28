"use server";

import { revalidatePath } from "next/cache";
import type { MovementType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { moveStock } from "@/lib/inventory";
import { can } from "@/lib/auth";
import { run, fInt, fOpt, fStr, type ActionResult } from "@/lib/admin-action";

/**
 * تعديل المخزون: إدخال / إخراج / تسوية جرد (تحديد الرصيد الفعلي).
 * السبب إلزامي، ويُسجل المستخدم والوقت في حركة المخزون وسجل العمليات.
 */
export async function adjustInventory(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  return run("inventory", async (user) => {
    const productId = fStr(fd, "productId") || undefined;
    const sku = fStr(fd, "sku").toUpperCase();
    const product = productId ? await prisma.product.findUnique({ where: { id: productId } }) : await prisma.product.findUnique({ where: { sku } });
    if (!product) throw new Error("المنتج غير موجود — تحقق من SKU");
    const mode = fStr(fd, "mode");
    const reason = fOpt(fd, "reason");
    if (!reason || reason.length < 3) throw new Error("اكتب سبب التعديل");
    const qty = fInt(fd, "quantity", { min: 0, max: 1_000_000 });
    if (qty == null) throw new Error("أدخل الكمية");
    const unitCost = can(user, "products.cost") ? fInt(fd, "unitCost") : null;
    let delta: number;
    let type: MovementType;
    if (mode === "in") { delta = qty; type = "STOCK_IN"; }
    else if (mode === "out") { delta = -qty; type = "STOCK_OUT"; }
    else if (mode === "count") { delta = qty - product.stockQty; type = "ADJUSTMENT"; }
    else throw new Error("نوع العملية غير صالح");
    if (delta === 0) return { ok: "الرصيد مطابق، لا تغيير" };
    const balance = await prisma.$transaction((tx) => moveStock(tx, { productId: product.id, delta, type, reason, userId: user.id, unitCost }));
    if (unitCost != null && mode === "in") await prisma.product.update({ where: { id: product.id }, data: { costPrice: unitCost } });
    await audit(user.id, "inventory.adjust", "Product", product.id, { sku: product.sku, mode, delta, balance, reason });
    revalidatePath("/admin/inventory");
    revalidatePath(`/admin/products/${product.id}`);
    return { ok: `تم. الرصيد الجديد لـ ${product.sku}: ${balance}` };
  });
}
