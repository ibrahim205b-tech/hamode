"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { run, fBool, fOpt, fStr, type ActionResult } from "@/lib/admin-action";

export async function saveSupplier(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  return run("suppliers", async (user) => {
    const id = fOpt(fd, "id");
    const name = fStr(fd, "name");
    if (name.length < 2) throw new Error("اسم المورد مطلوب");
    const data = { name, phone: fOpt(fd, "phone"), contactName: fOpt(fd, "contactName"), address: fOpt(fd, "address"), notes: fOpt(fd, "notes"), isActive: id ? fBool(fd, "isActive") : true };
    const s = id ? await prisma.supplier.update({ where: { id }, data }) : await prisma.supplier.create({ data });
    await audit(user.id, id ? "supplier.update" : "supplier.create", "Supplier", s.id, { name });
    revalidatePath("/admin/suppliers");
  });
}
