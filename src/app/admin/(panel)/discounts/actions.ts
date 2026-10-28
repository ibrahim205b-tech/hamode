"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { run, fBool, fInt, fOpt, fStr, type ActionResult } from "@/lib/admin-action";

export async function saveDiscount(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  return run("discounts", async (user) => {
    const id = fOpt(fd, "id");
    const code = fStr(fd, "code").toUpperCase();
    if (!/^[A-Z0-9_-]{3,30}$/.test(code)) throw new Error("الكود: 3-30 حرفاً إنجليزياً أو أرقام");
    const type = fStr(fd, "type") === "PERCENT" ? "PERCENT" : "FIXED";
    const value = fInt(fd, "value", { min: 1 });
    if (!value || (type === "PERCENT" && value > 90)) throw new Error("قيمة الخصم غير صالحة (النسبة حتى 90%)");
    const d = (k: string) => { const v = fStr(fd, k); return /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T${k === "endsAt" ? "23:59:59" : "00:00:00"}+03:00`) : null; };
    const data = { code, type, value, description: fOpt(fd, "description"), minSubtotal: fInt(fd, "minSubtotal"), maxUses: fInt(fd, "maxUses", { min: 1 }), startsAt: d("startsAt"), endsAt: d("endsAt"), isActive: fBool(fd, "isActive") } as const;
    const r = id ? await prisma.discount.update({ where: { id }, data }) : await prisma.discount.create({ data });
    await audit(user.id, id ? "discount.update" : "discount.create", "Discount", r.id, { code, type, value });
    revalidatePath("/admin/discounts");
  });
}
