import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { baghdadDayStart, isoDay } from "./format";

/**
 * قواعد المحاسبة المعتمدة في التقارير:
 * - «المبيعات المكتملة» = الطلبات بحالة «تم التسليم» فقط، حسب تاريخ التسليم.
 * - الطلبات الملغاة لا تدخل في أي إيراد أو ربح، وتظهر في تقرير مستقل حسب تاريخ الإلغاء.
 * - إجمالي المبيعات = مجموع أسعار المنتجات قبل الخصم.
 * - صافي المبيعات = إجمالي المبيعات − الخصومات (بدون أجور التوصيل).
 * - إجمالي المحصّل من الزبون = صافي المبيعات + أجور التوصيل.
 * - النقد المقبوض = الدفعات المسجلة فعلياً حسب تاريخ القبض (قد يختلف عن المبيعات).
 * - تكلفة البضاعة المباعة = تكلفة الوحدة المحفوظة لحظة الطلب × الكمية، للمنتجات التي لها تكلفة فقط.
 * - الربح الإجمالي التقديري يُحسب فقط على البنود التي لها تكلفة، مع توزيع الخصم نسبياً، وتُعرض نسبة التغطية.
 * - قيمة المخزون = الرصيد الحالي × آخر تكلفة مسجلة للمنتج.
 */

export type Range = { from: string; to: string; gte: Date; lt: Date };

export function parseRange(sp: { from?: string; to?: string; preset?: string }): Range {
  const today = isoDay(new Date());
  let from = /^\d{4}-\d{2}-\d{2}$/.test(sp.from ?? "") ? sp.from! : "";
  let to = /^\d{4}-\d{2}-\d{2}$/.test(sp.to ?? "") ? sp.to! : "";
  const daysAgo = (n: number) => isoDay(new Date(Date.now() - n * 86400000));
  if (sp.preset === "today") { from = today; to = today; }
  else if (sp.preset === "week") { from = daysAgo(6); to = today; }
  else if (sp.preset === "month") { from = `${today.slice(0, 7)}-01`; to = today; }
  else if (sp.preset === "30") { from = daysAgo(29); to = today; }
  if (!from) from = `${today.slice(0, 7)}-01`;
  if (!to) to = today;
  if (from > to) [from, to] = [to, from];
  return { from, to, gte: baghdadDayStart(from), lt: new Date(baghdadDayStart(to).getTime() + 86400000) };
}

const n = (v: unknown) => Number(v ?? 0);

export async function salesSummary(r: Range) {
  const delivered = { status: "DELIVERED" as const, deliveredAt: { gte: r.gte, lt: r.lt } };
  const [agg, items, payments, cancelled] = await Promise.all([
    prisma.order.aggregate({ where: delivered, _sum: { subtotal: true, discountTotal: true, deliveryFee: true, total: true }, _count: true }),
    prisma.orderItem.findMany({ where: { order: delivered }, select: { lineTotal: true, unitCost: true, quantity: true, order: { select: { subtotal: true, discountTotal: true } } } }),
    prisma.payment.aggregate({ where: { receivedAt: { gte: r.gte, lt: r.lt } }, _sum: { amount: true }, _count: true }),
    prisma.order.aggregate({ where: { status: "CANCELLED", cancelledAt: { gte: r.gte, lt: r.lt } }, _sum: { total: true }, _count: true }),
  ]);
  let cogs = 0, revenueWithCost = 0, lineTotalAll = 0, discountOnCosted = 0;
  for (const it of items) {
    lineTotalAll += it.lineTotal;
    if (it.unitCost == null) continue;
    cogs += it.unitCost * it.quantity;
    revenueWithCost += it.lineTotal;
    if (it.order.subtotal > 0) discountOnCosted += (it.order.discountTotal * it.lineTotal) / it.order.subtotal;
  }
  const gross = agg._sum.subtotal ?? 0;
  const discounts = agg._sum.discountTotal ?? 0;
  const delivery = agg._sum.deliveryFee ?? 0;
  const coverage = lineTotalAll > 0 ? revenueWithCost / lineTotalAll : 0;
  return {
    orders: agg._count,
    gross,
    discounts,
    net: gross - discounts,
    delivery,
    collectedFromCustomers: agg._sum.total ?? 0,
    cashReceived: payments._sum.amount ?? 0,
    paymentsCount: payments._count,
    cogs,
    grossProfit: revenueWithCost > 0 ? Math.round(revenueWithCost - discountOnCosted - cogs) : null,
    costCoverage: coverage,
    cancelledCount: cancelled._count,
    cancelledValue: cancelled._sum.total ?? 0,
  };
}

export type Bucket = "day" | "week" | "month";

export async function salesByPeriod(r: Range, bucket: Bucket) {
  const unit = Prisma.raw(`'${bucket}'`);
  const rows = await prisma.$queryRaw<{ period: Date; orders: bigint; gross: bigint; discounts: bigint; delivery: bigint }[]>`
    SELECT date_trunc(${unit}, "deliveredAt" AT TIME ZONE 'Asia/Baghdad') AS period,
           COUNT(*) AS orders, SUM(subtotal) AS gross, SUM("discountTotal") AS discounts, SUM("deliveryFee") AS delivery
    FROM "Order" WHERE status = 'DELIVERED' AND "deliveredAt" >= ${r.gte} AND "deliveredAt" < ${r.lt}
    GROUP BY 1 ORDER BY 1`;
  return rows.map((x) => ({
    period: x.period.toISOString().slice(0, 10),
    orders: n(x.orders), gross: n(x.gross), discounts: n(x.discounts), net: n(x.gross) - n(x.discounts), delivery: n(x.delivery),
  }));
}

export async function salesByProduct(r: Range, limit = 500) {
  const rows = await prisma.$queryRaw<{ sku: string; name: string; qty: bigint; revenue: bigint; cost: bigint | null; costed_qty: bigint }[]>`
    SELECT oi.sku, MAX(oi."nameAr") AS name, SUM(oi.quantity) AS qty, SUM(oi."lineTotal") AS revenue,
           SUM(oi."unitCost" * oi.quantity) AS cost, SUM(CASE WHEN oi."unitCost" IS NULL THEN 0 ELSE oi.quantity END) AS costed_qty
    FROM "OrderItem" oi JOIN "Order" o ON o.id = oi."orderId"
    WHERE o.status = 'DELIVERED' AND o."deliveredAt" >= ${r.gte} AND o."deliveredAt" < ${r.lt}
    GROUP BY oi.sku ORDER BY revenue DESC LIMIT ${limit}`;
  return rows.map((x) => {
    const fullyCosted = n(x.costed_qty) === n(x.qty);
    return { sku: x.sku, name: x.name, qty: n(x.qty), revenue: n(x.revenue), cost: fullyCosted ? n(x.cost) : null, profit: fullyCosted ? n(x.revenue) - n(x.cost) : null };
  });
}

export async function salesByCategory(r: Range) {
  const rows = await prisma.$queryRaw<{ name: string; qty: bigint; revenue: bigint }[]>`
    SELECT COALESCE(parent."nameAr", c."nameAr", 'منتج محذوف') AS name, SUM(oi.quantity) AS qty, SUM(oi."lineTotal") AS revenue
    FROM "OrderItem" oi JOIN "Order" o ON o.id = oi."orderId"
    LEFT JOIN "Product" p ON p.id = oi."productId"
    LEFT JOIN "Category" c ON c.id = p."categoryId"
    LEFT JOIN "Category" parent ON parent.id = c."parentId"
    WHERE o.status = 'DELIVERED' AND o."deliveredAt" >= ${r.gte} AND o."deliveredAt" < ${r.lt}
    GROUP BY 1 ORDER BY revenue DESC`;
  return rows.map((x) => ({ name: x.name, qty: n(x.qty), revenue: n(x.revenue) }));
}

/** حسب الشركة/الموديل: يُنسب البند لكل موديل متوافق معه — لذلك قد تتداخل المجاميع */
export async function salesByDevice(r: Range, level: "manufacturer" | "model") {
  const col = level === "manufacturer" ? Prisma.raw(`m.name`) : Prisma.raw(`dm.name`);
  const rows = await prisma.$queryRaw<{ name: string; qty: bigint; revenue: bigint }[]>`
    SELECT ${col} AS name, SUM(oi.quantity) AS qty, SUM(oi."lineTotal") AS revenue FROM (
      SELECT DISTINCT oi.id, oi.quantity, oi."lineTotal", ${level === "manufacturer" ? Prisma.raw(`m.id`) : Prisma.raw(`dm.id`)} AS gid
      FROM "OrderItem" oi JOIN "Order" o ON o.id = oi."orderId"
      JOIN "ProductCompatibility" pc ON pc."productId" = oi."productId"
      JOIN "DeviceModel" dm ON dm.id = pc."modelId"
      JOIN "DeviceFamily" f ON f.id = dm."familyId"
      JOIN "Manufacturer" m ON m.id = f."manufacturerId"
      WHERE o.status = 'DELIVERED' AND o."deliveredAt" >= ${r.gte} AND o."deliveredAt" < ${r.lt}
    ) oi
    JOIN ${level === "manufacturer" ? Prisma.raw(`"Manufacturer" m ON m.id = oi.gid`) : Prisma.raw(`"DeviceModel" dm ON dm.id = oi.gid`)}
    GROUP BY 1 ORDER BY revenue DESC LIMIT 200`;
  return rows.map((x) => ({ name: x.name, qty: n(x.qty), revenue: n(x.revenue) }));
}

export async function inventoryValuation() {
  const rows = await prisma.$queryRaw<{ value: bigint | null; units: bigint | null; costed: bigint; uncosted: bigint; uncosted_units: bigint | null }[]>`
    SELECT SUM(CASE WHEN "costPrice" IS NOT NULL THEN "stockQty" * "costPrice" END) AS value,
           SUM("stockQty") AS units,
           COUNT(*) FILTER (WHERE "costPrice" IS NOT NULL AND "stockQty" > 0) AS costed,
           COUNT(*) FILTER (WHERE "costPrice" IS NULL AND "stockQty" > 0) AS uncosted,
           SUM(CASE WHEN "costPrice" IS NULL THEN "stockQty" END) AS uncosted_units
    FROM "Product" WHERE status <> 'ARCHIVED' AND "isDemo" = false`;
  const x = rows[0];
  return { value: n(x?.value), units: n(x?.units), costed: n(x?.costed), uncosted: n(x?.uncosted), uncostedUnits: n(x?.uncosted_units) };
}

export async function movementSummary(r: Range) {
  const rows = await prisma.inventoryMovement.groupBy({ by: ["type"], where: { createdAt: { gte: r.gte, lt: r.lt } }, _sum: { quantity: true }, _count: true });
  return rows.map((x) => ({ type: x.type, quantity: x._sum.quantity ?? 0, count: x._count }));
}

export async function cancelledOrders(r: Range) {
  return prisma.order.findMany({
    where: { status: "CANCELLED", cancelledAt: { gte: r.gte, lt: r.lt } },
    orderBy: { cancelledAt: "desc" },
    select: { id: true, number: true, customerName: true, total: true, cancelReason: true, cancelledAt: true },
    take: 500,
  });
}

export async function supplierPurchases(r: Range) {
  const rows = await prisma.$queryRaw<{ name: string; orders: bigint; total: bigint; paid: bigint }[]>`
    SELECT s.name, COUNT(*) AS orders, SUM(po.total) AS total, SUM(po."amountPaid") AS paid
    FROM "PurchaseOrder" po JOIN "Supplier" s ON s.id = po."supplierId"
    WHERE po.status = 'RECEIVED' AND po."receivedAt" >= ${r.gte} AND po."receivedAt" < ${r.lt}
    GROUP BY s.name ORDER BY total DESC`;
  return rows.map((x) => ({ name: x.name, orders: n(x.orders), total: n(x.total), paid: n(x.paid) }));
}

export async function lowStockList(defaultThreshold: number) {
  return prisma.$queryRaw<{ id: string; sku: string; nameAr: string; stockQty: number; threshold: number }[]>`
    SELECT id, sku, "nameAr", "stockQty", COALESCE("lowStockThreshold", ${defaultThreshold})::int AS threshold
    FROM "Product" WHERE status = 'ACTIVE' AND "stockQty" <= COALESCE("lowStockThreshold", ${defaultThreshold})
    ORDER BY "stockQty" ASC, sku LIMIT 1000`;
}
