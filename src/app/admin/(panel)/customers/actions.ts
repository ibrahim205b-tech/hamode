"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { randomToken, sha256 } from "@/lib/security";
import { siteUrl } from "@/lib/settings";
import { run, fOpt, fStr, type ActionResult } from "@/lib/admin-action";

export async function saveCustomerNotes(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  return run("customers", async (user) => {
    const id = fStr(fd, "id");
    await prisma.customer.update({ where: { id }, data: { notes: fOpt(fd, "notes") } });
    await audit(user.id, "customer.notes", "Customer", id);
    revalidatePath(`/admin/customers/${id}`);
  });
}

/** يولّد رابط إعادة تعيين كلمة مرور لمرة واحدة (صالح ساعة) ليرسله الموظف للزبون عبر واتساب بعد التحقق من هويته */
export async function generateResetLink(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  return run("customers", async (user) => {
    const id = fStr(fd, "id");
    const c = await prisma.customer.findUniqueOrThrow({ where: { id }, include: { user: true } });
    if (!c.user || c.user.role !== "CUSTOMER") throw new Error("هذا الزبون ليس لديه حساب");
    const token = randomToken(32);
    await prisma.passwordResetToken.updateMany({ where: { userId: c.user.id, usedAt: null }, data: { usedAt: new Date() } });
    await prisma.passwordResetToken.create({ data: { userId: c.user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 3600_000) } });
    await audit(user.id, "customer.reset_link", "Customer", id);
    return { ok: `${siteUrl()}/account/reset/${token}` };
  });
}
