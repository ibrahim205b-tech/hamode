"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { getSettings, saveSettings, storeSettingsSchema } from "@/lib/settings";
import { toInternationalIraqi, toLocalIraqi } from "@/lib/whatsapp";
import { storeImage } from "@/lib/images";
import { run, fBool, fInt, fStr, type ActionResult } from "@/lib/admin-action";

export async function saveStoreSettings(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  return run("settings", async (user) => {
    const cur = await getSettings();
    const wa = fStr(fd, "whatsappNumber");
    if (!toInternationalIraqi(wa)) throw new Error("رقم واتساب غير صالح. اكتب رقماً عراقياً مثل 07700733822");
    const url = (k: string) => {
      const v = fStr(fd, k);
      if (v && !/^https?:\/\//.test(v)) throw new Error(`الرابط في (${k}) يجب أن يبدأ بـ https://`);
      return v;
    };
    const trust = [0, 1, 2, 3].map((i) => ({ title: fStr(fd, `trust_title_${i}`), text: fStr(fd, `trust_text_${i}`) })).filter((t) => t.title);
    const next = storeSettingsSchema.parse({
      ...cur,
      nameAr: fStr(fd, "nameAr") || cur.nameAr,
      nameEn: fStr(fd, "nameEn") || cur.nameEn,
      tagline: fStr(fd, "tagline"),
      whatsappNumber: toLocalIraqi(wa),
      contactPhone: fStr(fd, "contactPhone"),
      email: fStr(fd, "email"),
      address: fStr(fd, "address"),
      workingHours: fStr(fd, "workingHours"),
      mapUrl: url("mapUrl"),
      social: { facebook: url("facebook"), instagram: url("instagram"), tiktok: url("tiktok"), telegram: url("telegram"), youtube: url("youtube") },
      announcement: { enabled: fBool(fd, "announcementEnabled"), text: fStr(fd, "announcementText"), link: fStr(fd, "announcementLink") },
      hero: { title: fStr(fd, "heroTitle") || cur.hero.title, subtitle: fStr(fd, "heroSubtitle") },
      trustItems: trust,
      technicians: { enabled: fBool(fd, "techEnabled"), title: fStr(fd, "techTitle"), text: fStr(fd, "techText") },
      policies: { shipping: fStr(fd, "p_shipping"), returns: fStr(fd, "p_returns"), warranty: fStr(fd, "p_warranty"), privacy: fStr(fd, "p_privacy"), terms: fStr(fd, "p_terms") },
      featuredCategoryIds: fd.getAll("featuredCategoryIds").map(String).filter(Boolean),
      seo: { title: fStr(fd, "seoTitle"), description: fStr(fd, "seoDescription"), keywords: fStr(fd, "seoKeywords") },
      order: { minOrderTotal: fInt(fd, "minOrderTotal") ?? 0, codEnabled: fBool(fd, "codEnabled"), checkoutNote: fStr(fd, "checkoutNote"), maxQtyPerItem: fInt(fd, "maxQtyPerItem", { min: 1, max: 10000 }) ?? 100 },
      invoice: { footerText: fStr(fd, "invoiceFooter"), warrantyNote: fStr(fd, "invoiceWarranty"), showLogo: fBool(fd, "invoiceLogo") },
      inventory: { defaultLowStock: fInt(fd, "defaultLowStock") ?? 3, showStockQty: fBool(fd, "showStockQty") },
      search: { synonyms: fStr(fd, "synonyms") },
      showDemoProducts: fBool(fd, "showDemoProducts"),
    });
    await saveSettings(next);
    await audit(user.id, "settings.update", "Setting", "store", { whatsappChanged: cur.whatsappNumber !== next.whatsappNumber, whatsapp: next.whatsappNumber });
    revalidatePath("/", "layout");
    return { ok: "تم حفظ الإعدادات" };
  });
}

export async function uploadLogo(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  return run("settings", async (user) => {
    const cur = await getSettings();
    if (fd.get("remove") === "1") {
      await saveSettings({ ...cur, logoUploadId: "" });
    } else {
      const f = fd.get("logo");
      if (!(f instanceof File)) throw new Error("اختر صورة");
      const r = await storeImage(f);
      if ("error" in r) throw new Error(r.error);
      await saveSettings({ ...cur, logoUploadId: r.id });
    }
    await audit(user.id, "settings.logo", "Setting", "store");
    revalidatePath("/", "layout");
    return { ok: "تم" };
  });
}

/** حذف المنتجات التجريبية: التي ليس لها طلبات تُحذف، والتي لها طلبات تُؤرشف للحفاظ على السجل */
export async function removeDemoProducts(_p: ActionResult, _fd: FormData): Promise<ActionResult> {
  return run("settings", async (user) => {
    const demos = await prisma.product.findMany({ where: { isDemo: true }, select: { id: true, _count: { select: { orderItems: true, poItems: true } } } });
    let deleted = 0, archived = 0;
    for (const d of demos) {
      if (d._count.orderItems || d._count.poItems) {
        await prisma.product.update({ where: { id: d.id }, data: { status: "ARCHIVED" } });
        archived++;
      } else {
        await prisma.$transaction([prisma.inventoryMovement.deleteMany({ where: { productId: d.id } }), prisma.product.delete({ where: { id: d.id } })]);
        deleted++;
      }
    }
    await audit(user.id, "demo.remove", "Product", null, { deleted, archived });
    revalidatePath("/", "layout");
    return { ok: `حُذف ${deleted} وأُرشف ${archived} منتج تجريبي` };
  });
}
