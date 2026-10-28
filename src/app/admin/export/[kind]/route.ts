import { prisma } from "@/lib/db";
import { can, getCurrentUser, isStaffRole, type Permission } from "@/lib/auth";
import { csvResponse, toCsv } from "@/lib/csv";
import { exportProductsRows, PRODUCT_CSV_COLUMNS } from "@/lib/product-csv";
import { ordersWhere } from "@/lib/admin-queries";
import * as R from "@/lib/reports";
import { MOVEMENT_LABELS, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/constants";
import { isoDay } from "@/lib/format";
import { audit } from "@/lib/audit";

const PERMS: Record<string, Permission> = {
  products: "products", "catalog-reference": "products", orders: "orders", "sales-products": "reports",
  "sales-periods": "reports", movements: "inventory", customers: "customers",
};

export async function GET(req: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  const user = await getCurrentUser();
  const perm = PERMS[kind];
  if (!perm) return new Response("Not found", { status: 404 });
  if (!user || !isStaffRole(user.role) || !can(user, perm)) return new Response("Forbidden", { status: 403 });
  const sp = Object.fromEntries(new URL(req.url).searchParams);
  const stamp = isoDay(new Date());
  await audit(user.id, "export.csv", "Export", kind, sp);

  switch (kind) {
    case "products": {
      if (sp.template) return csvResponse(toCsv([], [...PRODUCT_CSV_COLUMNS]), "products-template.csv");
      return csvResponse(toCsv(await exportProductsRows(can(user, "products.cost")), [...PRODUCT_CSV_COLUMNS]), `products-${stamp}.csv`);
    }
    case "catalog-reference": {
      const [cats, comps, conds, models] = await Promise.all([
        prisma.category.findMany({ orderBy: { sortOrder: "asc" }, include: { parent: true } }),
        prisma.componentType.findMany({ orderBy: { sortOrder: "asc" } }),
        prisma.productCondition.findMany({ orderBy: { sortOrder: "asc" } }),
        prisma.deviceModel.findMany({ orderBy: { sortOrder: "asc" }, include: { family: { include: { manufacturer: true } } } }),
      ]);
      const rows = [
        ...cats.map((c) => ({ type: "category", slug: c.slug, name: c.parent ? `${c.parent.nameAr} › ${c.nameAr}` : c.nameAr })),
        ...comps.map((c) => ({ type: "componentType", slug: c.slug, name: c.nameAr })),
        ...conds.map((c) => ({ type: "condition", slug: c.slug, name: c.nameAr })),
        ...models.map((m) => ({ type: "model", slug: m.slug, name: `${m.family.manufacturer.name} › ${m.family.name} › ${m.name}` })),
      ];
      return csvResponse(toCsv(rows, ["type", "slug", "name"]), "catalog-reference.csv");
    }
    case "orders": {
      const orders = await prisma.order.findMany({ where: ordersWhere(sp), orderBy: { createdAt: "desc" }, take: 20000 });
      return csvResponse(
        toCsv(orders.map((o) => ({
          number: o.number, createdAt: o.createdAt, status: ORDER_STATUS_LABELS[o.status], payment: PAYMENT_STATUS_LABELS[o.paymentStatus],
          customer: o.customerName, phone: o.phone, governorate: o.governorate, area: o.area, subtotal: o.subtotal,
          discount: o.discountTotal, delivery: o.deliveryFee, total: o.total, cancelReason: o.cancelReason ?? "",
        }))),
        `orders-${stamp}.csv`,
      );
    }
    case "sales-products": {
      const r = R.parseRange(sp);
      return csvResponse(toCsv(await R.salesByProduct(r, 100000), ["sku", "name", "qty", "revenue", "cost", "profit"]), `sales-by-product-${r.from}-${r.to}.csv`);
    }
    case "sales-periods": {
      const r = R.parseRange(sp);
      const bucket = sp.bucket === "week" || sp.bucket === "month" ? sp.bucket : "day";
      return csvResponse(toCsv(await R.salesByPeriod(r, bucket), ["period", "orders", "gross", "discounts", "net", "delivery"]), `sales-${bucket}-${r.from}-${r.to}.csv`);
    }
    case "movements": {
      const r = R.parseRange(sp);
      const rows = await prisma.inventoryMovement.findMany({ where: { createdAt: { gte: r.gte, lt: r.lt } }, orderBy: { createdAt: "desc" }, take: 50000, include: { product: { select: { sku: true, nameAr: true } }, user: { select: { name: true } } } });
      return csvResponse(
        toCsv(rows.map((m) => ({ date: m.createdAt, sku: m.product.sku, product: m.product.nameAr, type: MOVEMENT_LABELS[m.type], quantity: m.quantity, balanceAfter: m.balanceAfter, unitCost: can(user, "products.cost") ? m.unitCost ?? "" : "", reason: m.reason ?? "", reference: m.reference ?? "", user: m.user?.name ?? "" }))),
        `inventory-movements-${r.from}-${r.to}.csv`,
      );
    }
    case "customers": {
      const rows = await prisma.customer.findMany({ orderBy: { createdAt: "desc" }, include: { _count: { select: { orders: true } } } });
      return csvResponse(toCsv(rows.map((c) => ({ name: c.name, phone: c.phone, account: c.userId ? "نعم" : "لا", orders: c._count.orders, createdAt: c.createdAt }))), `customers-${stamp}.csv`);
    }
  }
  return new Response("Not found", { status: 404 });
}
