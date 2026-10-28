import "server-only";
import type { OrderStatus, Prisma } from "@prisma/client";
import { normalizeArabic } from "./arabic";
import { toLocalIraqi } from "./whatsapp";
import { ORDER_STATUS_LABELS } from "./constants";
import { baghdadDayStart } from "./format";

export type OrderFilterParams = { q?: string; status?: string; from?: string; to?: string };

export function ordersWhere(sp: OrderFilterParams): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = {};
  const q = (sp.q || "").trim().slice(0, 60);
  if (q) {
    const phone = toLocalIraqi(q);
    where.OR = [
      { number: { contains: q.toUpperCase() } },
      ...(phone ? [{ phone }] : [{ phone: { contains: q.replace(/\D/g, "") || "__" } }]),
      { customerName: { contains: q, mode: "insensitive" } },
      { customerName: { contains: normalizeArabic(q), mode: "insensitive" } },
    ];
  }
  if (sp.status && sp.status in ORDER_STATUS_LABELS) where.status = sp.status as OrderStatus;
  const created: Prisma.DateTimeFilter = {};
  if (/^\d{4}-\d{2}-\d{2}$/.test(sp.from ?? "")) created.gte = baghdadDayStart(sp.from!);
  if (/^\d{4}-\d{2}-\d{2}$/.test(sp.to ?? "")) created.lt = new Date(baghdadDayStart(sp.to!).getTime() + 86400000);
  if (created.gte || created.lt) where.createdAt = created;
  return where;
}

