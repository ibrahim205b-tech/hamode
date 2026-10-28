import { prisma } from "./db";

/**
 * تحديد معدل الطلبات مخزّن في قاعدة البيانات — يعمل مع عدة نسخ من الخادم.
 * يعيد true إذا كان الطلب مسموحاً.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowSeconds * 1000);
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key", "count", "windowStart") VALUES (${key}, 1, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."windowStart" < ${windowStart} THEN 1 ELSE "RateLimit"."count" + 1 END,
      "windowStart" = CASE WHEN "RateLimit"."windowStart" < ${windowStart} THEN ${now} ELSE "RateLimit"."windowStart" END
    RETURNING "count"`;
  // تنظيف عرضي للسجلات القديمة
  if (Math.random() < 0.01) {
    await prisma.rateLimit.deleteMany({ where: { windowStart: { lt: new Date(now.getTime() - 86400000) } } });
  }
  return (rows[0]?.count ?? 0) <= limit;
}
