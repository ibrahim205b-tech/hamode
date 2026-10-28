"use server";

import { revalidatePath } from "next/cache";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { hashPassword, passwordProblem } from "@/lib/auth";
import { run, fStr, type ActionResult } from "@/lib/admin-action";

const STAFF_ROLES: Role[] = ["OWNER", "ADMIN", "STAFF"];

export async function createStaff(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  return run("users", async (user) => {
    const email = fStr(fd, "email").toLowerCase();
    const name = fStr(fd, "name");
    const role = fStr(fd, "role") as Role;
    const pw = fStr(fd, "password");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || name.length < 2) throw new Error("أدخل اسماً وبريداً صحيحاً");
    if (!STAFF_ROLES.includes(role)) throw new Error("دور غير صالح");
    const pe = passwordProblem(pw);
    if (pe) throw new Error(pe);
    const u = await prisma.user.create({ data: { email, name, role, passwordHash: await hashPassword(pw) } });
    await audit(user.id, "user.create", "User", u.id, { email, role });
    revalidatePath("/admin/users");
    return { ok: "تم إنشاء المستخدم" };
  });
}

export async function updateStaff(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  return run("users", async (user) => {
    const id = fStr(fd, "id");
    const op = fStr(fd, "op");
    const target = await prisma.user.findUniqueOrThrow({ where: { id } });
    if (!STAFF_ROLES.includes(target.role)) throw new Error("ليس مستخدماً إدارياً");
    const owners = await prisma.user.count({ where: { role: "OWNER", isActive: true } });
    const isLastOwner = target.role === "OWNER" && target.isActive && owners <= 1;
    if (op === "role") {
      const role = fStr(fd, "role") as Role;
      if (!STAFF_ROLES.includes(role)) throw new Error("دور غير صالح");
      if (isLastOwner && role !== "OWNER") throw new Error("لا يمكن إزالة آخر مالك");
      await prisma.user.update({ where: { id }, data: { role } });
    } else if (op === "toggle") {
      if (id === user.id) throw new Error("لا يمكنك تعطيل حسابك");
      if (isLastOwner) throw new Error("لا يمكن تعطيل آخر مالك");
      await prisma.$transaction([prisma.user.update({ where: { id }, data: { isActive: !target.isActive } }), prisma.session.deleteMany({ where: { userId: id } })]);
    } else if (op === "password") {
      const pw = fStr(fd, "password");
      const pe = passwordProblem(pw);
      if (pe) throw new Error(pe);
      await prisma.$transaction([prisma.user.update({ where: { id }, data: { passwordHash: await hashPassword(pw) } }), prisma.session.deleteMany({ where: { userId: id } })]);
    } else if (op === "logout") {
      await prisma.session.deleteMany({ where: { userId: id } });
    } else throw new Error("عملية غير صالحة");
    await audit(user.id, `user.${op}`, "User", id);
    revalidatePath("/admin/users");
    return { ok: "تم" };
  });
}
