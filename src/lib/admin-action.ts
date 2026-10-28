import "server-only";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { assertStaff, type Permission, type SessionUser } from "./auth";
import { StockError } from "./inventory";

export type ActionResult = { ok?: string; error?: string };

/** يغلف إجراءات الإدارة: تحقق الصلاحية على الخادم + رسائل أخطاء مفهومة */
export async function run(perm: Permission, fn: (user: SessionUser) => Promise<ActionResult | void>): Promise<ActionResult> {
  try {
    const user = await assertStaff(perm);
    return (await fn(user)) ?? { ok: "تم الحفظ" };
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")) throw e;
    if (e instanceof ZodError) return { error: e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).slice(0, 3).join(" — ") };
    if (e instanceof StockError) return { error: e.message };
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") return { error: `قيمة مكررة: ${String((e.meta as { target?: unknown })?.target ?? "")} موجود مسبقاً` };
      if (e.code === "P2003" || e.code === "P2014") return { error: "لا يمكن الحذف لوجود سجلات مرتبطة. يمكنك التعطيل/الأرشفة بدلاً من الحذف." };
      if (e.code === "P2025") return { error: "السجل غير موجود" };
    }
    if (e instanceof Error && /[؀-ۿ]/.test(e.message)) return { error: e.message };
    console.error(e);
    return { error: "حدث خطأ غير متوقع" };
  }
}

// أدوات قراءة FormData
export const fStr = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
export const fOpt = (fd: FormData, k: string) => fStr(fd, k) || null;
export const fBool = (fd: FormData, k: string) => fd.get(k) === "on" || fd.get(k) === "true" || fd.get(k) === "1";
export function fInt(fd: FormData, k: string, { min = 0, max = 2_000_000_000 }: { min?: number; max?: number } = {}): number | null {
  const raw = fStr(fd, k).replace(/[,٬\s]/g, "").replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min || n > max) throw new Error(`قيمة رقمية غير صالحة في الحقل (${k})`);
  return n;
}
