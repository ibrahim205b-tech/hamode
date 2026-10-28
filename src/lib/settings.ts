import { cache } from "react";
import { z } from "zod";
import { prisma } from "./db";
import { DEFAULT_WHATSAPP_LOCAL, toInternationalIraqi } from "./whatsapp";

const str = (d = "") => z.string().max(5000).default(d);

export const storeSettingsSchema = z.object({
  nameAr: str("حمودي الخبير"),
  nameEn: str("HAMMOUDI EXPERT"),
  tagline: str("قطع غيار الهواتف وأدوات الصيانة"),
  logoUploadId: str(""),
  whatsappNumber: str(DEFAULT_WHATSAPP_LOCAL),
  contactPhone: str(""),
  email: str(""),
  address: str(""),
  workingHours: str(""),
  mapUrl: str(""),
  currency: str("IQD"),
  social: z
    .object({ facebook: str(), instagram: str(), tiktok: str(), telegram: str(), youtube: str() })
    .default({ facebook: "", instagram: "", tiktok: "", telegram: "", youtube: "" }),
  announcement: z
    .object({ enabled: z.boolean().default(false), text: str(), link: str() })
    .default({ enabled: false, text: "", link: "" }),
  hero: z
    .object({
      title: str("كل قطعة لهاتفك، بدقة الخبير"),
      subtitle: str("شاشات، بطاريات، منافذ شحن، أدوات ومستلزمات صيانة — ابحث بموديل جهازك واطلب بسهولة."),
    })
    .default({
      title: "كل قطعة لهاتفك، بدقة الخبير",
      subtitle: "شاشات، بطاريات، منافذ شحن، أدوات ومستلزمات صيانة — ابحث بموديل جهازك واطلب بسهولة.",
    }),
  // عناصر الثقة يحددها المالك فقط — فارغة افتراضياً حتى لا ندّعي شيئاً غير مؤكد
  trustItems: z.array(z.object({ title: z.string().max(80), text: z.string().max(200) })).max(6).default([]),
  technicians: z
    .object({
      enabled: z.boolean().default(true),
      title: str("قسم الفنيين ومحلات الصيانة"),
      text: str("أدوات احترافية، مستلزمات لحام، وقطع البورد. تواصل معنا عبر واتساب للاستفسار عن أسعار الجملة."),
    })
    .default({
      enabled: true,
      title: "قسم الفنيين ومحلات الصيانة",
      text: "أدوات احترافية، مستلزمات لحام، وقطع البورد. تواصل معنا عبر واتساب للاستفسار عن أسعار الجملة.",
    }),
  policies: z
    .object({ shipping: str(), returns: str(), warranty: str(), privacy: str(), terms: str() })
    .default({ shipping: "", returns: "", warranty: "", privacy: "", terms: "" }),
  featuredCategoryIds: z.array(z.string()).default([]),
  seo: z
    .object({ title: str(""), description: str(""), keywords: str("") })
    .default({ title: "", description: "", keywords: "" }),
  order: z
    .object({
      minOrderTotal: z.number().int().min(0).default(0),
      codEnabled: z.boolean().default(true),
      checkoutNote: str(""),
      maxQtyPerItem: z.number().int().min(1).max(10000).default(100),
    })
    .default({ minOrderTotal: 0, codEnabled: true, checkoutNote: "", maxQtyPerItem: 100 }),
  invoice: z
    .object({ footerText: str("شكراً لتعاملكم معنا"), warrantyNote: str(""), showLogo: z.boolean().default(true) })
    .default({ footerText: "شكراً لتعاملكم معنا", warrantyNote: "", showLogo: true }),
  inventory: z
    .object({ defaultLowStock: z.number().int().min(0).default(3), showStockQty: z.boolean().default(true) })
    .default({ defaultLowStock: 3, showStockQty: true }),
  search: z.object({ synonyms: str("") }).default({ synonyms: "" }),
  showDemoProducts: z.boolean().default(true),
});

export type StoreSettings = z.infer<typeof storeSettingsSchema>;

export const SETTINGS_KEY = "store";

export const getSettings = cache(async (): Promise<StoreSettings> => {
  try {
    const row = await prisma.setting.findUnique({ where: { key: SETTINGS_KEY } });
    const parsed = storeSettingsSchema.safeParse(row?.value ?? {});
    return parsed.success ? parsed.data : storeSettingsSchema.parse({});
  } catch {
    return storeSettingsSchema.parse({});
  }
});

export async function saveSettings(next: StoreSettings) {
  const value = storeSettingsSchema.parse(next);
  await prisma.setting.upsert({
    where: { key: SETTINGS_KEY },
    create: { key: SETTINGS_KEY, value },
    update: { value },
  });
}

/** الرقم الدولي المعتمد لكل روابط واتساب في الموقع */
export function whatsappIntl(s: StoreSettings): string {
  return toInternationalIraqi(s.whatsappNumber) ?? toInternationalIraqi(DEFAULT_WHATSAPP_LOCAL)!;
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}
