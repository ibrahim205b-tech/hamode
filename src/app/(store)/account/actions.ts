"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession, destroySession, getCurrentUser, hashPassword, passwordProblem, verifyPassword, isStaffRole } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { toLocalIraqi } from "@/lib/whatsapp";
import { sha256 } from "@/lib/security";
import { IRAQ_GOVERNORATES } from "@/lib/constants";

export type FormState = { error?: string; ok?: string };

export async function loginCustomer(_p: FormState, fd: FormData): Promise<FormState> {
  const phone = toLocalIraqi(String(fd.get("phone") || ""));
  const password = String(fd.get("password") || "");
  const ip = await clientIp();
  if (!(await rateLimit(`login:${ip}`, 10, 900)) || (phone && !(await rateLimit(`login-acct:${phone}`, 8, 900)))) {
    return { error: "محاولات كثيرة. حاول بعد 15 دقيقة." };
  }
  if (!phone || !password) return { error: "أدخل رقم الهاتف وكلمة المرور" };
  const user = await prisma.user.findUnique({ where: { phone } });
  const valid = await verifyPassword(password, user?.passwordHash);
  if (!user || !valid || !user.isActive || user.role !== "CUSTOMER") return { error: "رقم الهاتف أو كلمة المرور غير صحيحة" };
  await createSession(user);
  const next = String(fd.get("next") || "");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/account");
}

const registerSchema = z.object({
  name: z.string().trim().min(2, "الاسم قصير").max(80),
  phone: z.string(),
  password: z.string(),
});

export async function registerCustomer(_p: FormState, fd: FormData): Promise<FormState> {
  if (!(await rateLimit(`register:${await clientIp()}`, 5, 3600))) return { error: "محاولات كثيرة. حاول لاحقاً." };
  const parsed = registerSchema.safeParse({ name: fd.get("name"), phone: fd.get("phone"), password: fd.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const phone = toLocalIraqi(parsed.data.phone);
  if (!phone) return { error: "رقم الهاتف غير صحيح" };
  const pwErr = passwordProblem(parsed.data.password);
  if (pwErr) return { error: pwErr };
  if (parsed.data.password !== String(fd.get("password2") || "")) return { error: "كلمتا المرور غير متطابقتين" };
  if (await prisma.user.findUnique({ where: { phone } })) return { error: "يوجد حساب بهذا الرقم. سجّل الدخول بدلاً من ذلك." };
  const user = await prisma.user.create({
    data: {
      name: parsed.data.name, phone, passwordHash: await hashPassword(parsed.data.password), role: "CUSTOMER",
      customer: { create: { name: parsed.data.name, phone } },
    },
  });
  await createSession(user);
  redirect("/account");
}

export async function logout() {
  await destroySession();
  redirect("/");
}

export async function updateProfile(_p: FormState, fd: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/account/login");
  const name = String(fd.get("name") || "").trim();
  if (name.length < 2 || name.length > 80) return { error: "الاسم غير صالح" };
  await prisma.user.update({ where: { id: user.id }, data: { name } });
  await prisma.customer.updateMany({ where: { userId: user.id }, data: { name } });
  revalidatePath("/account");
  return { ok: "تم حفظ البيانات" };
}

export async function changePassword(_p: FormState, fd: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/account/login");
  if (!(await rateLimit(`pwchange:${user.id}`, 5, 900))) return { error: "محاولات كثيرة" };
  const full = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!(await verifyPassword(String(fd.get("current") || ""), full.passwordHash))) return { error: "كلمة المرور الحالية غير صحيحة" };
  const next = String(fd.get("next") || "");
  const err = passwordProblem(next);
  if (err) return { error: err };
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } }),
    prisma.session.deleteMany({ where: { userId: user.id } }),
  ]);
  await createSession(full);
  return { ok: "تم تغيير كلمة المرور" };
}

const addressSchema = z.object({
  label: z.string().trim().max(40).optional(),
  governorate: z.enum(IRAQ_GOVERNORATES),
  area: z.string().trim().min(2).max(80),
  address: z.string().trim().min(5).max(300),
});

async function myCustomer() {
  const user = await getCurrentUser();
  if (!user) redirect("/account/login");
  if (isStaffRole(user.role)) throw new Error("حسابات الإدارة لا تستخدم دفتر العناوين");
  return (
    (await prisma.customer.findUnique({ where: { userId: user.id } })) ??
    (await prisma.customer.create({ data: { name: user.name, phone: user.phone ?? "", userId: user.id } }))
  );
}

export async function addAddress(_p: FormState, fd: FormData): Promise<FormState> {
  const c = await myCustomer();
  const parsed = addressSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: "تحقق من بيانات العنوان" };
  if ((await prisma.customerAddress.count({ where: { customerId: c.id } })) >= 10) return { error: "الحد الأقصى 10 عناوين" };
  await prisma.customerAddress.create({ data: { ...parsed.data, label: parsed.data.label || null, customerId: c.id } });
  revalidatePath("/account");
  return { ok: "تمت إضافة العنوان" };
}

export async function deleteAddress(fd: FormData) {
  const c = await myCustomer();
  // التحقق من الملكية ضمن شرط الحذف نفسه
  await prisma.customerAddress.deleteMany({ where: { id: String(fd.get("id")), customerId: c.id } });
  revalidatePath("/account");
}

export async function resetPassword(_p: FormState, fd: FormData): Promise<FormState> {
  if (!(await rateLimit(`reset:${await clientIp()}`, 10, 3600))) return { error: "محاولات كثيرة" };
  const token = String(fd.get("token") || "");
  const rec = await prisma.passwordResetToken.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true } });
  if (!rec || rec.usedAt || rec.expiresAt < new Date()) return { error: "رابط إعادة التعيين غير صالح أو منتهي" };
  const pw = String(fd.get("password") || "");
  const err = passwordProblem(pw);
  if (err) return { error: err };
  if (pw !== String(fd.get("password2") || "")) return { error: "كلمتا المرور غير متطابقتين" };
  await prisma.$transaction([
    prisma.user.update({ where: { id: rec.userId }, data: { passwordHash: await hashPassword(pw) } }),
    prisma.passwordResetToken.update({ where: { id: rec.id }, data: { usedAt: new Date() } }),
    prisma.session.deleteMany({ where: { userId: rec.userId } }),
  ]);
  return { ok: "تم تعيين كلمة المرور الجديدة. يمكنك تسجيل الدخول الآن." };
}
