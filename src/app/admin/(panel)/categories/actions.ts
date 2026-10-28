"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { slugify } from "@/lib/slug";
import { run, fBool, fInt, fOpt, fStr, type ActionResult } from "@/lib/admin-action";
import { ICON_KEYS } from "@/components/ui/icons";

export async function saveCategory(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  return run("catalog", async (user) => {
    const id = fOpt(fd, "id");
    const nameAr = fStr(fd, "nameAr");
    if (nameAr.length < 2) throw new Error("الاسم مطلوب");
    const parentId = fOpt(fd, "parentId");
    if (id && parentId === id) throw new Error("لا يمكن جعل القسم أباً لنفسه");
    if (parentId) {
      const parent = await prisma.category.findUniqueOrThrow({ where: { id: parentId } });
      if (parent.parentId) throw new Error("يُسمح بمستويين فقط: قسم رئيسي وقسم فرعي");
      if (id && (await prisma.category.count({ where: { parentId: id } }))) throw new Error("هذا القسم له أقسام فرعية ولا يمكن جعله فرعياً");
    }
    const icon = fOpt(fd, "icon");
    const data = {
      nameAr, nameEn: fOpt(fd, "nameEn"), description: fOpt(fd, "description"), parentId,
      icon: icon && ICON_KEYS.includes(icon) ? icon : null, sortOrder: fInt(fd, "sortOrder", { min: -100000 }) ?? 0,
      isActive: fBool(fd, "isActive"), isFeatured: fBool(fd, "isFeatured"),
    };
    const slug = slugify(fStr(fd, "slug") || fStr(fd, "nameEn") || nameAr);
    const c = id ? await prisma.category.update({ where: { id }, data: { ...data, slug } }) : await prisma.category.create({ data: { ...data, slug } });
    await audit(user.id, id ? "category.update" : "category.create", "Category", c.id, { nameAr });
    revalidatePath("/admin/categories");
  });
}

export async function deleteCategory(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  return run("catalog", async (user) => {
    const id = fStr(fd, "id");
    if (await prisma.product.count({ where: { categoryId: id } })) throw new Error("القسم يحتوي منتجات. انقلها أو عطّل القسم بدلاً من حذفه.");
    if (await prisma.category.count({ where: { parentId: id } })) throw new Error("احذف الأقسام الفرعية أولاً");
    await prisma.category.delete({ where: { id } });
    await audit(user.id, "category.delete", "Category", id);
    revalidatePath("/admin/categories");
    return { ok: "تم الحذف" };
  });
}
