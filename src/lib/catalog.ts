import { cache } from "react";
import { prisma } from "./db";
import { publicBaseWhere, publicProductSelect } from "./search";
import type { DeviceTree } from "@/components/store/DeviceSelector";

export const getDeviceTree = cache(async (): Promise<DeviceTree> => {
  const mans = await prisma.manufacturer.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: {
      slug: true,
      name: true,
      families: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { name: true, models: { where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { slug: true, name: true } } },
      },
    },
  });
  return mans;
});

export const getComponentTypes = cache(() => prisma.componentType.findMany({ orderBy: { sortOrder: "asc" }, select: { slug: true, nameAr: true } }));
export const getConditions = cache(() => prisma.productCondition.findMany({ orderBy: { sortOrder: "asc" }, select: { slug: true, nameAr: true } }));

/** الأكثر مبيعاً: من الطلبات المُسلَّمة فقط (مبيعات مكتملة حقيقية) */
export async function getBestSellers(take = 10) {
  const rows = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: { productId: { not: null }, order: { status: "DELIVERED" } },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: take * 2,
  });
  if (!rows.length) return [];
  const ids = rows.map((r) => r.productId!) as string[];
  const products = await prisma.product.findMany({ where: { AND: [{ id: { in: ids } }, await publicBaseWhere()] }, select: publicProductSelect });
  const byId = new Map(products.map((p) => [p.id, p]));
  return ids.map((id) => byId.get(id)).filter((p): p is NonNullable<typeof p> => !!p).slice(0, take);
}
