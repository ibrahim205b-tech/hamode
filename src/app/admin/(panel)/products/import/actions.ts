"use server";

import { can } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { parseCsv } from "@/lib/csv";
import { importProducts } from "@/lib/product-csv";
import { run, type ActionResult } from "@/lib/admin-action";

export async function importCsv(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  return run("products", async (user) => {
    const file = fd.get("file");
    if (!(file instanceof File) || !file.size) throw new Error("اختر ملف CSV");
    if (file.size > 5 * 1024 * 1024) throw new Error("حجم الملف أكبر من 5 ميغابايت");
    const { rows, errors: parseErrors } = parseCsv(await file.text());
    if (parseErrors.length) return { error: parseErrors.join(" | ") };
    if (!rows.length) throw new Error("الملف فارغ");
    const dryRun = fd.get("dryRun") === "on";
    const r = await importProducts(rows, user.id, can(user, "products.cost"), dryRun);
    if (r.errors.length) return { error: `لم يتم تطبيق أي تغيير. الأخطاء (${r.errors.length}): ${r.errors.slice(0, 15).join(" | ")}` };
    if (dryRun) return { ok: `الفحص ناجح: ${r.total} سطر جاهز للاستيراد بدون أخطاء` };
    await audit(user.id, "product.import_csv", "Product", null, { created: r.created, updated: r.updated });
    return { ok: `تم الاستيراد: ${r.created} جديد، ${r.updated} محدَّث` };
  });
}
