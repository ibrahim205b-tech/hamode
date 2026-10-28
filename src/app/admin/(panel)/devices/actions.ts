"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { reindexProduct } from "@/lib/search";
import { slugify } from "@/lib/slug";
import { run, fBool, fInt, fOpt, fStr, type ActionResult } from "@/lib/admin-action";

async function reindexModelProducts(modelIds: string[]) {
  const rows = await prisma.productCompatibility.findMany({ where: { modelId: { in: modelIds } }, select: { productId: true }, distinct: ["productId"] });
  for (const r of rows) await reindexProduct(r.productId);
}

export async function saveManufacturer(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  return run("catalog", async (user) => {
    const id = fOpt(fd, "id");
    const name = fStr(fd, "name");
    if (!name) throw new Error("الاسم مطلوب");
    const data = { name, nameAr: fOpt(fd, "nameAr"), slug: slugify(fStr(fd, "slug") || name), sortOrder: fInt(fd, "sortOrder", { min: -100000 }) ?? 0, isActive: fBool(fd, "isActive") };
    const m = id ? await prisma.manufacturer.update({ where: { id }, data }) : await prisma.manufacturer.create({ data });
    if (id) {
      const models = await prisma.deviceModel.findMany({ where: { family: { manufacturerId: id } }, select: { id: true } });
      await reindexModelProducts(models.map((x) => x.id));
    }
    await audit(user.id, id ? "manufacturer.update" : "manufacturer.create", "Manufacturer", m.id, { name });
    revalidatePath("/admin/devices");
  });
}

export async function saveFamily(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  return run("catalog", async (user) => {
    const id = fOpt(fd, "id");
    const name = fStr(fd, "name");
    const manufacturerId = fStr(fd, "manufacturerId");
    if (!name) throw new Error("الاسم مطلوب");
    const data = { name, slug: slugify(fStr(fd, "slug") || name), sortOrder: fInt(fd, "sortOrder", { min: -100000 }) ?? 0, isActive: fBool(fd, "isActive") };
    const f = id ? await prisma.deviceFamily.update({ where: { id }, data }) : await prisma.deviceFamily.create({ data: { ...data, manufacturerId } });
    await audit(user.id, id ? "family.update" : "family.create", "DeviceFamily", f.id, { name });
    revalidatePath(`/admin/devices/${manufacturerId}`);
  });
}

export async function saveModel(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  return run("catalog", async (user) => {
    const id = fOpt(fd, "id");
    const name = fStr(fd, "name");
    if (!name) throw new Error("اسم الموديل مطلوب");
    const data = {
      name, slug: slugify(fStr(fd, "slug") || name).replace(/[^a-z0-9؀-ۿ-]/g, ""),
      modelNumbers: fOpt(fd, "modelNumbers"), aliases: fOpt(fd, "aliases"), releaseYear: fInt(fd, "releaseYear", { min: 1990, max: 2100 }),
      sortOrder: fInt(fd, "sortOrder", { min: -100000 }) ?? 0, isActive: fBool(fd, "isActive"),
    };
    const m = id ? await prisma.deviceModel.update({ where: { id }, data }) : await prisma.deviceModel.create({ data: { ...data, familyId: fStr(fd, "familyId") } });
    if (id) await reindexModelProducts([id]);
    await audit(user.id, id ? "model.update" : "model.create", "DeviceModel", m.id, { name });
    revalidatePath("/admin/devices");
  });
}

export async function saveVariant(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  return run("catalog", async (user) => {
    const modelId = fStr(fd, "modelId");
    const name = fStr(fd, "name");
    if (!name) throw new Error("اسم النسخة مطلوب");
    const v = await prisma.modelVariant.create({ data: { modelId, name, modelNumber: fOpt(fd, "modelNumber") } });
    await reindexModelProducts([modelId]);
    await audit(user.id, "variant.create", "ModelVariant", v.id, { name });
    revalidatePath(`/admin/devices/model/${modelId}`);
  });
}

export async function deleteDeviceEntity(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  return run("catalog", async (user) => {
    const kind = fStr(fd, "kind");
    const id = fStr(fd, "id");
    if (kind === "variant") await prisma.modelVariant.delete({ where: { id } });
    else if (kind === "model") {
      if (await prisma.productCompatibility.count({ where: { modelId: id } })) throw new Error("الموديل مرتبط بمنتجات. عطّله بدلاً من حذفه.");
      await prisma.deviceModel.delete({ where: { id } });
    } else if (kind === "family") {
      if (await prisma.deviceModel.count({ where: { familyId: id } })) throw new Error("احذف موديلات السلسلة أولاً أو عطّلها");
      await prisma.deviceFamily.delete({ where: { id } });
    } else if (kind === "manufacturer") {
      if (await prisma.deviceFamily.count({ where: { manufacturerId: id } })) throw new Error("احذف سلاسل الشركة أولاً أو عطّلها");
      await prisma.manufacturer.delete({ where: { id } });
    } else throw new Error("نوع غير صالح");
    await audit(user.id, `${kind}.delete`, kind, id);
    revalidatePath("/admin/devices");
    return { ok: "تم الحذف" };
  });
}
