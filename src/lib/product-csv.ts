import "server-only";
import type { CompatStatus, ProductStatus } from "@prisma/client";
import { prisma } from "./db";
import { moveStock } from "./inventory";
import { reindexProduct } from "./search";
import { slugify, uniqueSuffix } from "./slug";

export const PRODUCT_CSV_COLUMNS = [
  "sku", "nameAr", "nameEn", "barcode", "category", "componentType", "condition", "price", "compareAtPrice",
  "wholesalePrice", "wholesaleMinQty", "costPrice", "stockQty", "lowStockThreshold", "status", "partBrand",
  "qualityGrade", "partNumbers", "searchAliases", "warrantyText", "descriptionAr", "compatibleModels",
] as const;

export async function exportProductsRows(includeCost: boolean) {
  const products = await prisma.product.findMany({
    orderBy: { sku: "asc" },
    include: { category: true, componentType: true, condition: true, compat: { include: { model: true } } },
  });
  return products.map((p) => ({
    sku: p.sku, nameAr: p.nameAr, nameEn: p.nameEn, barcode: p.barcode, category: p.category.slug,
    componentType: p.componentType?.slug, condition: p.condition?.slug, price: p.price, compareAtPrice: p.compareAtPrice,
    wholesalePrice: p.wholesalePrice, wholesaleMinQty: p.wholesaleMinQty, costPrice: includeCost ? p.costPrice : "",
    stockQty: p.stockQty, lowStockThreshold: p.lowStockThreshold, status: p.status, partBrand: p.partBrand,
    qualityGrade: p.qualityGrade, partNumbers: p.partNumbers, searchAliases: p.searchAliases, warrantyText: p.warrantyText,
    descriptionAr: p.descriptionAr, compatibleModels: p.compat.map((c) => `${c.model.slug}:${c.status}`).join("|"),
  }));
}

const int = (v: string | undefined, field: string, errs: string[], { required = false, min = 0 } = {}) => {
  const s = (v ?? "").replace(/[,\s]/g, "");
  if (!s) { if (required) errs.push(`${field} مطلوب`); return null; }
  const n = Number(s);
  if (!Number.isInteger(n) || n < min) { errs.push(`${field} غير صالح (${v})`); return null; }
  return n;
};

/**
 * استيراد/تحديث المنتجات من CSV حسب SKU.
 * يتم التحقق من كل الأسطر أولاً؛ إذا وُجد أي خطأ لا يُطبق أي تغيير.
 */
export async function importProducts(rows: Record<string, string>[], userId: string, allowPricing: boolean, dryRun: boolean) {
  const [cats, comps, conds, models] = await Promise.all([
    prisma.category.findMany({ select: { id: true, slug: true } }),
    prisma.componentType.findMany({ select: { id: true, slug: true } }),
    prisma.productCondition.findMany({ select: { id: true, slug: true } }),
    prisma.deviceModel.findMany({ select: { id: true, slug: true } }),
  ]);
  const catMap = new Map(cats.map((c) => [c.slug, c.id]));
  const compMap = new Map(comps.map((c) => [c.slug, c.id]));
  const condMap = new Map(conds.map((c) => [c.slug, c.id]));
  const modelMap = new Map(models.map((m) => [m.slug, m.id]));

  const errors: string[] = [];
  const seen = new Set<string>();
  const parsed = rows.slice(0, 5000).map((r, i) => {
    const errs: string[] = [];
    const sku = (r.sku ?? "").trim().toUpperCase();
    if (!/^[A-Z0-9][A-Z0-9._\-/]{1,49}$/.test(sku)) errs.push("SKU غير صالح");
    if (seen.has(sku)) errs.push("SKU مكرر في الملف");
    seen.add(sku);
    const nameAr = (r.nameAr ?? "").trim();
    if (nameAr.length < 2) errs.push("nameAr مطلوب");
    const categoryId = catMap.get((r.category ?? "").trim());
    if (!categoryId) errs.push(`القسم غير موجود (${r.category})`);
    const componentTypeId = r.componentType?.trim() ? compMap.get(r.componentType.trim()) : null;
    if (r.componentType?.trim() && !componentTypeId) errs.push(`نوع القطعة غير موجود (${r.componentType})`);
    const conditionId = r.condition?.trim() ? condMap.get(r.condition.trim()) : null;
    if (r.condition?.trim() && !conditionId) errs.push(`الحالة غير موجودة (${r.condition})`);
    const price = int(r.price, "price", errs, { required: true });
    const compareAtPrice = int(r.compareAtPrice, "compareAtPrice", errs);
    if (compareAtPrice != null && price != null && compareAtPrice <= price) errs.push("compareAtPrice يجب أن يكون أعلى من price");
    const wholesalePrice = int(r.wholesalePrice, "wholesalePrice", errs);
    const wholesaleMinQty = int(r.wholesaleMinQty, "wholesaleMinQty", errs, { min: 2 });
    const costPrice = int(r.costPrice, "costPrice", errs);
    const stockQty = int(r.stockQty, "stockQty", errs);
    const lowStockThreshold = int(r.lowStockThreshold, "lowStockThreshold", errs);
    const status = ((r.status ?? "").trim().toUpperCase() || "ACTIVE") as ProductStatus;
    if (!["ACTIVE", "DRAFT", "ARCHIVED"].includes(status)) errs.push("status يجب أن يكون ACTIVE أو DRAFT أو ARCHIVED");
    const compat: { modelId: string; status: CompatStatus }[] = [];
    for (const part of (r.compatibleModels ?? "").split("|").map((x) => x.trim()).filter(Boolean)) {
      const [slug, st = "UNVERIFIED"] = part.split(":");
      const modelId = modelMap.get(slug.trim());
      const cs = st.trim().toUpperCase() as CompatStatus;
      if (!modelId) errs.push(`موديل غير موجود (${slug})`);
      else if (!["VERIFIED", "UNVERIFIED", "UNKNOWN"].includes(cs)) errs.push(`حالة توافق غير صالحة (${st})`);
      else compat.push({ modelId, status: cs });
    }
    if (errs.length) errors.push(`سطر ${i + 2} (${sku || "?"}): ${errs.join("، ")}`);
    const opt = (k: string) => (r[k] ?? "").trim() || null;
    return {
      sku, stockQty, compat,
      data: {
        nameAr, nameEn: opt("nameEn"), barcode: opt("barcode"), categoryId: categoryId!, componentTypeId, conditionId,
        status, partBrand: opt("partBrand"), qualityGrade: opt("qualityGrade"), partNumbers: opt("partNumbers"),
        searchAliases: opt("searchAliases"), warrantyText: opt("warrantyText"), descriptionAr: opt("descriptionAr"), lowStockThreshold,
        ...(allowPricing ? { price: price!, compareAtPrice, wholesalePrice, wholesaleMinQty, costPrice } : {}),
      },
    };
  });
  if (rows.length > 5000) errors.push("الحد الأقصى 5000 سطر في الملف الواحد");
  if (errors.length || dryRun) return { errors, created: 0, updated: 0, total: parsed.length };

  let created = 0, updated = 0;
  for (const row of parsed) {
    const existing = await prisma.product.findUnique({ where: { sku: row.sku } });
    const id = await prisma.$transaction(async (tx) => {
      let id: string;
      if (existing) {
        await tx.product.update({ where: { id: existing.id }, data: row.data });
        id = existing.id;
        updated++;
      } else {
        if (!allowPricing) throw new Error("إنشاء منتجات جديدة يتطلب صلاحية التسعير");
        let slug = slugify(row.data.nameAr);
        if (await tx.product.findUnique({ where: { slug } })) slug = `${slug}-${uniqueSuffix()}`;
        const p = await tx.product.create({ data: { ...(row.data as typeof row.data & { price: number }), sku: row.sku, slug } });
        id = p.id;
        created++;
      }
      if (row.stockQty != null) {
        const cur = existing?.stockQty ?? 0;
        const delta = row.stockQty - cur;
        if (delta !== 0) await moveStock(tx, { productId: id, delta, type: "IMPORT", reason: "استيراد ملف CSV", userId });
      }
      for (const c of row.compat) {
        const ex = await tx.productCompatibility.findFirst({ where: { productId: id, modelId: c.modelId, variantId: null } });
        if (ex) await tx.productCompatibility.update({ where: { id: ex.id }, data: { status: c.status } });
        else await tx.productCompatibility.create({ data: { productId: id, modelId: c.modelId, status: c.status } });
      }
      return id;
    });
    await reindexProduct(id);
  }
  return { errors, created, updated, total: parsed.length };
}
