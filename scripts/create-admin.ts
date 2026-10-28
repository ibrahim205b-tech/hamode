/**
 * إنشاء حساب المالك/المدير بشكل آمن — بدون أي كلمة مرور مكتوبة في الكود.
 *   npm run admin:create                 (يسأل عن البيانات)
 *   ADMIN_EMAIL=.. ADMIN_PASSWORD=.. ADMIN_NAME=.. npm run admin:create
 *   npm run admin:create -- --reset      (إعادة تعيين كلمة مرور مدير موجود)
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const prisma = new PrismaClient();

async function ask(q: string, hidden = false): Promise<string> {
  const rl = createInterface({ input: stdin, output: stdout, terminal: true });
  if (hidden) {
    const out = rl as unknown as { _writeToOutput: (s: string) => void; output: NodeJS.WritableStream };
    out._writeToOutput = (s: string) => { if (s.includes(q)) out.output.write(s); else out.output.write("*"); };
  }
  const a = await rl.question(q);
  rl.close();
  if (hidden) stdout.write("\n");
  return a.trim();
}

async function main() {
  const reset = process.argv.includes("--reset");
  const email = (process.env.ADMIN_EMAIL || (await ask("البريد الإلكتروني للمدير: "))).toLowerCase();
  const name = process.env.ADMIN_NAME || (reset ? "" : await ask("الاسم: "));
  const password = process.env.ADMIN_PASSWORD || (await ask("كلمة المرور (10 أحرف على الأقل): ", true));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("بريد إلكتروني غير صالح");
  if (password.length < 10 || !/\d/.test(password) || !/[A-Za-z؀-ۿ]/.test(password)) throw new Error("كلمة المرور يجب أن تكون 10 أحرف على الأقل وتحتوي أحرفاً وأرقاماً");
  const hash = await bcrypt.hash(password, 12);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (!reset) throw new Error("يوجد مستخدم بهذا البريد. استخدم --reset لإعادة تعيين كلمة المرور.");
    await prisma.$transaction([
      prisma.user.update({ where: { id: existing.id }, data: { passwordHash: hash, isActive: true } }),
      prisma.session.deleteMany({ where: { userId: existing.id } }),
      prisma.auditLog.create({ data: { userId: existing.id, action: "admin.password_reset_cli", entityType: "User", entityId: existing.id } }),
    ]);
    console.log("✓ تم تحديث كلمة المرور");
    return;
  }
  const hasOwner = (await prisma.user.count({ where: { role: "OWNER" } })) > 0;
  const user = await prisma.user.create({ data: { email, name: name || "المالك", passwordHash: hash, role: hasOwner ? "ADMIN" : "OWNER" } });
  await prisma.auditLog.create({ data: { userId: user.id, action: "admin.created_cli", entityType: "User", entityId: user.id } });
  console.log(`✓ تم إنشاء ${user.role === "OWNER" ? "المالك" : "مدير"}: ${email}`);
}

main()
  .catch((e) => { console.error("✗", e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
