import type { MovementType, Prisma } from "@prisma/client";
import { prisma } from "./db";

type Tx = Prisma.TransactionClient;

export class StockError extends Error {}

/**
 * يغيّر رصيد منتج بشكل ذري ويسجل حركة مخزون.
 * التحديث المشروط يمنع المخزون السالب حتى مع الطلبات المتزامنة.
 */
export async function moveStock(
  tx: Tx,
  args: { productId: string; delta: number; type: MovementType; reason?: string | null; reference?: string | null; userId?: string | null; unitCost?: number | null },
) {
  const { productId, delta } = args;
  if (!Number.isInteger(delta) || delta === 0) throw new StockError("الكمية يجب أن تكون عدداً صحيحاً غير صفري");
  const res = await tx.product.updateMany({
    where: delta < 0 ? { id: productId, stockQty: { gte: -delta } } : { id: productId },
    data: { stockQty: { increment: delta } },
  });
  if (res.count !== 1) throw new StockError("لا يوجد مخزون كافٍ لإتمام العملية");
  const p = await tx.product.findUniqueOrThrow({ where: { id: productId }, select: { stockQty: true } });
  await tx.inventoryMovement.create({
    data: {
      productId, type: args.type, quantity: delta, balanceAfter: p.stockQty, reason: args.reason ?? null,
      reference: args.reference ?? null, userId: args.userId ?? null, unitCost: args.unitCost ?? null,
    },
  });
  return p.stockQty;
}

export async function adjustStock(args: Parameters<typeof moveStock>[1]) {
  return prisma.$transaction((tx) => moveStock(tx, args));
}
