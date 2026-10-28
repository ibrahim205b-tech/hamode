"use server";

import { redirect } from "next/navigation";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";
import { createSession, destroySession, hashPassword, isStaffRole, passwordProblem, verifyPassword } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { audit } from "@/lib/audit";

export type AuthState = { error?: string };

export async function adminLogin(_p: AuthState, fd: FormData): Promise<AuthState> {
  const email = String(fd.get("email") || "").trim().toLowerCase();
  const password = String(fd.get("password") || "");
  const ip = await clientIp();
  if (!(await rateLimit(`admin-login:${ip}`, 8, 900)) || !(await rateLimit(`admin-login-acct:${email}`, 8, 900))) {
    return { error: "محاولات كثيرة. انتظر 15 دقيقة ثم حاول مجدداً." };
  }
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  const ok = await verifyPassword(password, user?.passwordHash);
  if (!user || !ok || !user.isActive || !isStaffRole(user.role)) {
    await audit(null, "admin.login_failed", "User", user?.id, { email });
    return { error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" };
  }
  await createSession(user);
  await audit(user.id, "admin.login", "User", user.id);
  redirect("/admin");
}

export async function adminLogout() {
  await destroySession();
  redirect("/admin/login");
}

/** إعداد أول مالك: يعمل فقط إذا لم يوجد أي مستخدم إداري، ويتطلب SETUP_TOKEN من متغيرات البيئة */
export async function setupOwner(_p: AuthState, fd: FormData): Promise<AuthState> {
  if (!(await rateLimit(`setup:${await clientIp()}`, 5, 3600))) return { error: "محاولات كثيرة" };
  const expected = process.env.SETUP_TOKEN || "";
  if (expected.length < 24) return { error: "الإعداد عبر الويب معطل. اضبط SETUP_TOKEN (24 حرفاً على الأقل) أو استخدم الأمر npm run admin:create" };
  const given = String(fd.get("token") || "");
  const a = Buffer.from(given), b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { error: "رمز الإعداد غير صحيح" };
  if ((await prisma.user.count({ where: { role: { in: ["OWNER", "ADMIN"] } } })) > 0) return { error: "تم إنشاء المدير مسبقاً. هذه الصفحة معطلة الآن." };
  const name = String(fd.get("name") || "").trim();
  const email = String(fd.get("email") || "").trim().toLowerCase();
  const password = String(fd.get("password") || "");
  if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "أدخل اسماً وبريداً صحيحاً" };
  const pe = passwordProblem(password);
  if (pe) return { error: pe };
  const user = await prisma.user.create({ data: { name, email, passwordHash: await hashPassword(password), role: "OWNER" } });
  await audit(user.id, "admin.setup_owner", "User", user.id);
  await createSession(user);
  redirect("/admin");
}
