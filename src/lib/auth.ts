import "server-only";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Role, User } from "@prisma/client";
import { prisma } from "./db";
import { randomToken, sha256 } from "./security";
import { clientIp, userAgent } from "./request";

export const SESSION_COOKIE = "he_session";
const SESSION_DAYS_ADMIN = 7;
const SESSION_DAYS_CUSTOMER = 30;

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 12);
}

let dummyHash: string | null = null;

/** عند عدم وجود المستخدم نقارن مع تجزئة وهمية حتى لا يكشف زمن الاستجابة وجود الحساب */
export async function verifyPassword(pw: string, hash: string | null | undefined) {
  if (!hash) {
    dummyHash ??= await bcrypt.hash("not-a-real-password", 12);
    await bcrypt.compare(pw, dummyHash);
    return false;
  }
  return bcrypt.compare(pw, hash);
}

export function passwordProblem(pw: string): string | null {
  if (pw.length < 10) return "كلمة المرور يجب أن تكون 10 أحرف على الأقل";
  if (pw.length > 200) return "كلمة المرور طويلة جداً";
  if (!/[A-Za-z؀-ۿ]/.test(pw) || !/\d/.test(pw)) return "كلمة المرور يجب أن تحتوي على أحرف وأرقام";
  return null;
}

export async function createSession(user: Pick<User, "id" | "role">) {
  const token = randomToken(32);
  const days = user.role === "CUSTOMER" ? SESSION_DAYS_CUSTOMER : SESSION_DAYS_ADMIN;
  const expiresAt = new Date(Date.now() + days * 86400000);
  await prisma.session.create({
    data: { tokenHash: sha256(token), userId: user.id, expiresAt, ip: await clientIp(), userAgent: await userAgent() },
  });
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { tokenHash: sha256(token) } });
  jar.delete(SESSION_COOKIE);
}

export const getCurrentUser = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: { select: { id: true, name: true, email: true, phone: true, role: true, isActive: true } } },
  });
  if (!session || session.expiresAt < new Date() || !session.user.isActive) return null;
  return session.user;
});

export type SessionUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

// ───── الصلاحيات ─────
export type Permission =
  | "dashboard"
  | "orders"
  | "products"
  | "products.cost"
  | "inventory"
  | "catalog"
  | "customers"
  | "suppliers"
  | "purchases"
  | "reports"
  | "discounts"
  | "settings"
  | "users"
  | "audit";

const ALL: Permission[] = [
  "dashboard", "orders", "products", "products.cost", "inventory", "catalog", "customers",
  "suppliers", "purchases", "reports", "discounts", "settings", "users", "audit",
];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  OWNER: ALL,
  ADMIN: ALL.filter((p) => p !== "users"),
  STAFF: ["dashboard", "orders", "products", "inventory", "customers"],
  CUSTOMER: [],
};

export function can(user: { role: Role } | null | undefined, perm: Permission): boolean {
  return !!user && ROLE_PERMISSIONS[user.role].includes(perm);
}

export function isStaffRole(role: Role) {
  return role !== "CUSTOMER";
}

/** يُستخدم في صفحات وإجراءات لوحة التحكم — تحقق على الخادم دائماً */
export async function requireStaff(perm: Permission = "dashboard"): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user || !isStaffRole(user.role)) redirect("/admin/login");
  if (!can(user, perm)) redirect("/admin?denied=1");
  return user;
}

/** نسخة لإجراءات الخادم: ترمي خطأ بدلاً من إعادة التوجيه */
export async function assertStaff(perm: Permission): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user || !isStaffRole(user.role) || !can(user, perm)) throw new Error("غير مصرح لك بتنفيذ هذا الإجراء");
  return user;
}

export async function requireCustomer(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/account/login");
  return user;
}
