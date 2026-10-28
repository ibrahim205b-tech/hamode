"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { CompatStatus, Prisma, ProductStatus, RelationType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { can } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { reindexProduct, reindexAll } from "@/lib/search";
import { storeImage } from "@/lib/images";
import { moveStock } from "@/lib/inventory";
import { slugify, uniqueSuffix } from "@/lib/slug";
import { run, fBool, fInt, fOpt, fStr, type ActionResult } from "@/lib/admin-action";

function parseSpecs(text: string | null) {
  if (!text) return undefined;
  const rows = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, 60).map((l) => {
    const i = l.search(/[:：]/);
    return i > 0 ? { label: l.slice(0, i).trim().slice(0, 80), value: l.slice(i + 1).trim().slice(0, 300) } : { label: l.slice(0, 80), value: "" };
  });
  return rows.length ? rows : undefined;
}

function productData(fd: FormData, allowPricing: boolean) {
  const nameAr = fStr(fd, "nameAr");
  const sku = fStr(fd, "sku").toUpperCase().replace(/\s+/g, "-");
  if (nameAr.length < 2) throw new Error("اسم المنتج بالعربي مطلوب");
  if (!/^[A-Z0-9][A-Z0-9._\-/]{1,49}$/.test(sku)) throw new Error("رمز SKU غير صالح (أحرف إنجليزية وأرقام و - . _ /)");
  const categoryId = fStr(fd, "categoryId");
  if (!categoryId) throw new Error("اختر القسم");
  const status = fStr(fd, "status") as ProductStatus;
  if (!["DRAFT", "ACTIVE", "ARCHIVED"].includes(status)) throw new Error("حالة غير صالحة");
  const data: Prisma.ProductUncheckedUpdateInput = {
    nameAr: nameAr.slice(0, 200),
    nameEn: fOpt(fd, "nameEn")?.slice(0, 200) ?? null,
    sku,
    barcode: fOpt(fd, "barcode")?.replace(/\s/g, "") ?? null,
    categoryId,
    componentTypeId: fOpt(fd, "componentTypeId"),
    conditionId: fOpt(fd, "conditionId"),
    partBrand: fOpt(fd, "partBrand"),
    qualityGrade: fOpt(fd, "qualityGrade"),
    warrantyText: fOpt(fd, "warrantyText"),
    deliveryNote: fOpt(fd, "deliveryNote"),
    descriptionAr: fOpt(fd, "descriptionAr"),
    specs: parseSpecs(fOpt(fd, "specs")) ?? [],
    installationNotes: fOpt(fd, "installationNotes"),
    compatibilityNote: fOpt(fd, "compatibilityNote"),
    partNumbers: fOpt(fd, "partNumbers"),
    searchAliases: fOpt(fd, "searchAliases"),
    lowStockThreshold: fInt(fd, "lowStockThreshold"),
    status,
    isFeatured: fBool(fd, "isFeatured"),
    technicianOnly: fBool(fd, "technicianOnly"),
  };
  if (allowPricing) {
    const price = fInt(fd, "price");
    if (price == null) throw new Error("سعر البيع مطلوب");
    const compareAtPrice = fInt(fd, "compareAtPrice");
    if (compareAtPrice != null && compareAtPrice <= price) throw new Error("السعر السابق يجب أن يكون أعلى من سعر البيع (للخصومات الحقيقية فقط)");
    const wholesalePrice = fInt(fd, "wholesalePrice");
    const wholesaleMinQty = fInt(fd, "wholesaleMinQty", { min: 2, max: 100000 });
    if ((wholesalePrice == null) !== (wholesaleMinQty == null)) throw new Error("أدخل سعر الجملة وأقل كمية للجملة معاً");
    if (wholesalePrice != null && wholesalePrice >= price) throw new Error("سعر الجملة يجب أن يكون أقل من سعر البيع");
    Object.assign(data, { price, compareAtPrice, wholesalePrice, wholesaleMinQty, costPrice: fInt(fd, "costPrice") });
  }
  return data;
}

export async function createProduct(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  let newId = "";
  const res = await run("products", async (user) => {
    if (!can(user, "products.cost")) throw new Error("إنشاء المنتجات وتسعيرها يتطلب صلاحية مدير");
    const data = productData(fd, true) as Prisma.ProductUncheckedCreateInput;
    let slug = slugify(fStr(fd, "slug") || `${data.nameEn || data.nameAr}`);
    if (await prisma.product.findUnique({ where: { slug } })) slug = `${slug}-${uniqueSuffix()}`;
    const initial = fInt(fd, "initialStock") ?? 0;
    const p = await prisma.$transaction(async (tx) => {
      const p = await tx.product.create({ data: { ...data, slug, stockQty: 0 } });
      if (initial > 0) await moveStock(tx, { productId: p.id, delta: initial, type: "STOCK_IN", reason: "رصيد افتتاحي", userId: user.id, unitCost: data.costPrice ?? null });
      return p;
    });
    await reindexProduct(p.id);
    await audit(user.id, "product.create", "Product", p.id, { sku: p.sku, price: p.price });
    newId = p.id;
  });
  if (newId) redirect(`/admin/products/${newId}?created=1`);
  return res;
}

export async function updateProduct(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  return run("products", async (user) => {
    const id = fStr(fd, "id");
    const before = await prisma.product.findUniqueOrThrow({ where: { id } });
    const allowPricing = can(user, "products.cost");
    const data = productData(fd, allowPricing);
    const slugIn = fStr(fd, "slug");
    if (slugIn && slugIn !== before.slug) data.slug = slugify(slugIn);
    await prisma.product.update({ where: { id }, data });
    await reindexProduct(id);
    const changes: Record<string, [unknown, unknown]> = {};
    for (const k of ["price", "compareAtPrice", "wholesalePrice", "costPrice", "status", "sku"] as const) {
      if (k in data && (data as Record<string, unknown>)[k] !== before[k]) changes[k] = [before[k], (data as Record<string, unknown>)[k]];
    }
    await audit(user.id, "product.update", "Product", id, { changes } as Prisma.InputJsonValue);
    revalidatePath(`/admin/products/${id}`);
    return { ok: allowPricing ? "تم حفظ المنتج" : "تم الحفظ (حقول الأسعار تتطلب صلاحية مدير ولم تتغير)" };
  });
}

export async function uploadImages(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  return run("products", async (user) => {
    const id = fStr(fd, "id");
    const files = fd.getAll("images").filter((f): f is File => f instanceof File && f.size > 0).slice(0, 10);
    if (!files.length) throw new Error("اختر صورة واحدة على الأقل");
    const existing = await prisma.productImage.count({ where: { productId: id } });
    if (existing + files.length > 12) throw new Error("الحد الأقصى 12 صورة للمنتج");
    const p = await prisma.product.findUniqueOrThrow({ where: { id }, select: { nameAr: true } });
    const errors: string[] = [];
    let order = existing;
    for (const f of files) {
      const r = await storeImage(f);
      if ("error" in r) { errors.push(`${f.name}: ${r.error}`); continue; }
      await prisma.productImage.create({ data: { productId: id, uploadId: r.id, alt: p.nameAr, sortOrder: order++ } });
    }
    await audit(user.id, "product.images_upload", "Product", id, { count: files.length - errors.length });
    revalidatePath(`/admin/products/${id}`);
    return errors.length ? { error: errors.join(" — ") } : { ok: "تم رفع الصور" };
  });
}

export async function imageAction(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  return run("products", async (user) => {
    const imageId = fStr(fd, "imageId");
    const op = fStr(fd, "op");
    const img = await prisma.productImage.findUniqueOrThrow({ where: { id: imageId } });
    if (op === "delete") {
      await prisma.productImage.delete({ where: { id: imageId } });
      await prisma.upload.deleteMany({ where: { id: img.uploadId, productImages: { none: {} } } });
      await audit(user.id, "product.image_delete", "Product", img.productId);
    } else if (op === "first") {
      const all = await prisma.productImage.findMany({ where: { productId: img.productId }, orderBy: { sortOrder: "asc" } });
      const ordered = [img, ...all.filter((a) => a.id !== img.id)];
      await prisma.$transaction(ordered.map((a, i) => prisma.productImage.update({ where: { id: a.id }, data: { sortOrder: i } })));
    } else if (op === "alt") {
      await prisma.productImage.update({ where: { id: imageId }, data: { alt: fOpt(fd, "alt") } });
    }
    revalidatePath(`/admin/products/${img.productId}`);
    return { ok: "تم" };
  });
}

export async function addCompat(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  return run("products", async (user) => {
    const productId = fStr(fd, "id");
    const modelIds = fd.getAll("modelIds").map(String).filter(Boolean).slice(0, 200);
    const status = fStr(fd, "status") as CompatStatus;
    if (!modelIds.length) throw new Error("اختر موديلاً واحداً على الأقل");
    if (!["VERIFIED", "UNVERIFIED", "UNKNOWN"].includes(status)) throw new Error("حالة توافق غير صالحة");
    const variantId = fOpt(fd, "variantId");
    const note = fOpt(fd, "note");
    let added = 0;
    for (const modelId of modelIds) {
      const exists = await prisma.productCompatibility.findFirst({ where: { productId, modelId, variantId } });
      if (exists) await prisma.productCompatibility.update({ where: { id: exists.id }, data: { status, note } });
      else { await prisma.productCompatibility.create({ data: { productId, modelId, variantId: modelIds.length === 1 ? variantId : null, status, note } }); added++; }
    }
    await reindexProduct(productId);
    await audit(user.id, "product.compat_add", "Product", productId, { modelIds, status });
    revalidatePath(`/admin/products/${productId}`);
    return { ok: `تم الحفظ (${added} جديد)` };
  });
}

export async function compatAction(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  return run("products", async (user) => {
    const id = fStr(fd, "compatId");
    const c = await prisma.productCompatibility.findUniqueOrThrow({ where: { id } });
    if (fStr(fd, "op") === "delete") await prisma.productCompatibility.delete({ where: { id } });
    else {
      const status = fStr(fd, "status") as CompatStatus;
      if (!["VERIFIED", "UNVERIFIED", "UNKNOWN"].includes(status)) throw new Error("حالة غير صالحة");
      await prisma.productCompatibility.update({ where: { id }, data: { status } });
    }
    await reindexProduct(c.productId);
    await audit(user.id, "product.compat_change", "Product", c.productId, { compatId: id, op: fStr(fd, "op") });
    revalidatePath(`/admin/products/${c.productId}`);
    return { ok: "تم" };
  });
}

export async function addRelation(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  return run("products", async (user) => {
    const fromId = fStr(fd, "id");
    const sku = fStr(fd, "sku").toUpperCase();
    const type = fStr(fd, "type") as RelationType;
    if (!["RELATED", "ALTERNATIVE"].includes(type)) throw new Error("نوع غير صالح");
    const to = await prisma.product.findUnique({ where: { sku } });
    if (!to) throw new Error("لا يوجد منتج بهذا الرمز SKU");
    if (to.id === fromId) throw new Error("لا يمكن ربط المنتج بنفسه");
    await prisma.productRelation.upsert({ where: { fromId_toId_type: { fromId, toId: to.id, type } }, create: { fromId, toId: to.id, type }, update: {} });
    await audit(user.id, "product.relation_add", "Product", fromId, { to: sku, type });
    revalidatePath(`/admin/products/${fromId}`);
    return { ok: "تمت الإضافة" };
  });
}

export async function removeRelation(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  return run("products", async () => {
    const r = await prisma.productRelation.delete({ where: { id: fStr(fd, "relId") } });
    revalidatePath(`/admin/products/${r.fromId}`);
    return { ok: "تم الحذف" };
  });
}

export async function reindexAllAction(_p: ActionResult, _fd: FormData): Promise<ActionResult> {
  return run("catalog", async (user) => {
    const n = await reindexAll();
    await audit(user.id, "search.reindex", "Product", null, { n });
    return { ok: `تمت إعادة فهرسة ${n} منتج` };
  });
}
