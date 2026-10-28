import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { expandQuery, normalizeArabic, parseSynonymLines } from "./arabic";
import { getSettings } from "./settings";

/** يعيد بناء نص البحث المُطبّع لمنتج واحد من كل الحقول المرتبطة */
export async function reindexProduct(productId: string) {
  const p = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      category: { include: { parent: true } },
      componentType: true,
      condition: true,
      compat: { include: { model: { include: { family: { include: { manufacturer: true } } } }, variant: true } },
    },
  });
  if (!p) return;
  const parts = [
    p.nameAr, p.nameEn, p.sku, p.barcode, p.partNumbers, p.searchAliases, p.partBrand, p.qualityGrade,
    p.category.nameAr, p.category.nameEn, p.category.parent?.nameAr, p.category.parent?.nameEn,
    p.componentType?.nameAr, p.componentType?.nameEn, p.condition?.nameAr,
    ...p.compat.flatMap((c) => [
      c.model.name, c.model.modelNumbers, c.model.aliases, c.model.family.name,
      c.model.family.manufacturer.name, c.model.family.manufacturer.nameAr, c.variant?.name, c.variant?.modelNumber,
    ]),
  ];
  const searchText = normalizeArabic(parts.filter(Boolean).join(" ")).slice(0, 20000);
  await prisma.product.update({ where: { id: productId }, data: { searchText } });
}

export async function reindexAll() {
  const ids = await prisma.product.findMany({ select: { id: true } });
  for (const { id } of ids) await reindexProduct(id);
  return ids.length;
}

export async function searchWhere(q: string): Promise<Prisma.ProductWhereInput | null> {
  if (!q.trim()) return null;
  const s = await getSettings();
  const groups = expandQuery(q, parseSynonymLines(s.search.synonyms));
  if (!groups.length) return null;
  return {
    AND: groups.map((alts) => ({ OR: alts.map((a) => ({ searchText: { contains: a } })) })),
  };
}

export type CatalogFilters = {
  q?: string;
  category?: string; // slug
  manufacturer?: string; // slug
  model?: string; // slug
  component?: string; // slug
  condition?: string; // slug
  min?: number;
  max?: number;
  inStock?: boolean;
  compat?: "VERIFIED" | "UNVERIFIED" | "UNKNOWN";
  offers?: boolean;
  technician?: boolean;
  sort?: "relevance" | "newest" | "price_asc" | "price_desc" | "name";
  page?: number;
};

export const PAGE_SIZE = 24;

export const publicProductSelect = {
  id: true,
  slug: true,
  sku: true,
  nameAr: true,
  nameEn: true,
  price: true,
  compareAtPrice: true,
  stockQty: true,
  isDemo: true,
  isFeatured: true,
  technicianOnly: true,
  qualityGrade: true,
  condition: { select: { nameAr: true, slug: true } },
  category: { select: { nameAr: true, slug: true, icon: true, parent: { select: { icon: true } } } },
  images: { select: { uploadId: true, alt: true }, orderBy: { sortOrder: "asc" as const }, take: 1 },
} satisfies Prisma.ProductSelect;

export type ProductCardData = Prisma.ProductGetPayload<{ select: typeof publicProductSelect }>;

export async function publicBaseWhere(): Promise<Prisma.ProductWhereInput> {
  const s = await getSettings();
  return s.showDemoProducts ? { status: "ACTIVE" } : { status: "ACTIVE", isDemo: false };
}

export async function catalogQuery(f: CatalogFilters) {
  const and: Prisma.ProductWhereInput[] = [await publicBaseWhere()];
  const sw = f.q ? await searchWhere(f.q) : null;
  if (sw) and.push(sw);

  if (f.category) {
    const cat = await prisma.category.findUnique({ where: { slug: f.category }, include: { children: { select: { id: true } } } });
    if (cat) and.push({ categoryId: { in: [cat.id, ...cat.children.map((c) => c.id)] } });
    else and.push({ id: "__none__" });
  }
  if (f.model || f.manufacturer) {
    const compatWhere: Prisma.ProductCompatibilityWhereInput = {};
    if (f.model) compatWhere.model = { slug: f.model };
    else if (f.manufacturer) compatWhere.model = { family: { manufacturer: { slug: f.manufacturer } } };
    if (f.compat) compatWhere.status = f.compat;
    and.push({ compat: { some: compatWhere } });
  } else if (f.compat) {
    and.push({ compat: { some: { status: f.compat } } });
  }
  if (f.component) and.push({ componentType: { slug: f.component } });
  if (f.condition) and.push({ condition: { slug: f.condition } });
  if (f.min != null && !Number.isNaN(f.min)) and.push({ price: { gte: f.min } });
  if (f.max != null && !Number.isNaN(f.max)) and.push({ price: { lte: f.max } });
  if (f.inStock) and.push({ stockQty: { gt: 0 } });
  if (f.technician) and.push({ technicianOnly: true });

  const where: Prisma.ProductWhereInput = { AND: and };
  let orderBy: Prisma.ProductOrderByWithRelationInput[] = [{ createdAt: "desc" }];
  switch (f.sort) {
    case "price_asc": orderBy = [{ price: "asc" }]; break;
    case "price_desc": orderBy = [{ price: "desc" }]; break;
    case "name": orderBy = [{ nameAr: "asc" }]; break;
    case "newest": orderBy = [{ createdAt: "desc" }]; break;
    default: orderBy = [{ isFeatured: "desc" }, { stockQty: "desc" }, { createdAt: "desc" }];
  }
  const page = Math.max(1, Math.min(f.page ?? 1, 1000));

  let items: ProductCardData[];
  let total: number;
  if (f.offers) {
    // عروض حقيقية فقط: السعر السابق أعلى من الحالي (مقارنة بين عمودين تتطلب استعلاماً خاماً)
    const ids = await prisma.$queryRaw<{ id: string }[]>`SELECT id FROM "Product" WHERE "compareAtPrice" IS NOT NULL AND "compareAtPrice" > "price"`;
    and.push({ id: { in: ids.map((r) => r.id) } });
  }
  [items, total] = await Promise.all([
    prisma.product.findMany({ where, orderBy, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, select: publicProductSelect }),
    prisma.product.count({ where }),
  ]);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export function parseFilters(sp: Record<string, string | string[] | undefined>): CatalogFilters {
  const g = (k: string) => {
    const v = sp[k];
    return (Array.isArray(v) ? v[0] : v)?.slice(0, 200) || undefined;
  };
  const num = (k: string) => {
    const v = g(k);
    if (!v) return undefined;
    const n = parseInt(v.replace(/\D/g, ""), 10);
    return Number.isFinite(n) ? n : undefined;
  };
  const compat = g("compat");
  const sort = g("sort");
  return {
    q: g("q"),
    category: g("category"),
    manufacturer: g("manufacturer"),
    model: g("model"),
    component: g("component"),
    condition: g("condition"),
    min: num("min"),
    max: num("max"),
    inStock: g("stock") === "1",
    compat: compat === "VERIFIED" || compat === "UNVERIFIED" || compat === "UNKNOWN" ? compat : undefined,
    offers: g("offers") === "1",
    technician: g("tech") === "1",
    sort: (["relevance", "newest", "price_asc", "price_desc", "name"] as const).find((s) => s === sort),
    page: num("page"),
  };
}
