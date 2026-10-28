"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { slugify } from "@/lib/slug";
import { run, fInt, fOpt, fStr, type ActionResult } from "@/lib/admin-action";

export async function saveAttribute(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  return run("catalog", async (user) => {
    const kind = fStr(fd, "kind");
    const id = fOpt(fd, "id");
    const nameAr = fStr(fd, "nameAr");
    if (!nameAr) throw new Error("الاسم مطلوب");
    const slug = slugify(fStr(fd, "slug") || fStr(fd, "nameEn") || nameAr);
    const sortOrder = fInt(fd, "sortOrder", { min: -100000 }) ?? 0;
    if (kind === "component") {
      const data = { nameAr, nameEn: fOpt(fd, "nameEn"), slug, sortOrder };
      const r = id ? await prisma.componentType.update({ where: { id }, data }) : await prisma.componentType.create({ data });
      await audit(user.id, "component.save", "ComponentType", r.id, { nameAr });
    } else if (kind === "condition") {
      const data = { nameAr, description: fOpt(fd, "description"), slug, sortOrder };
      const r = id ? await prisma.productCondition.update({ where: { id }, data }) : await prisma.productCondition.create({ data });
      await audit(user.id, "condition.save", "ProductCondition", r.id, { nameAr });
    } else throw new Error("نوع غير صالح");
    revalidatePath("/admin/attributes");
  });
}

export async function deleteAttribute(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  return run("catalog", async (user) => {
    const kind = fStr(fd, "kind");
    const id = fStr(fd, "id");
    if (kind === "component") {
      if (await prisma.product.count({ where: { componentTypeId: id } })) throw new Error("مستخدم في منتجات");
      await prisma.componentType.delete({ where: { id } });
    } else {
      if (await prisma.product.count({ where: { conditionId: id } })) throw new Error("مستخدم في منتجات");
      await prisma.productCondition.delete({ where: { id } });
    }
    await audit(user.id, `${kind}.delete`, kind, id);
    revalidatePath("/admin/attributes");
    return { ok: "تم الحذف" };
  });
}
