// تطبيع النص العربي للبحث: توحيد الهمزات والتاء المربوطة والياء، إزالة التشكيل، تحويل الأرقام
const DIACRITICS = /[ً-ٰٟۖ-ۭ]/g;
const TATWEEL = /ـ/g;
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

export function normalizeArabic(input: string | null | undefined): string {
  if (!input) return "";
  let s = input.normalize("NFKC").toLowerCase();
  s = s.replace(DIACRITICS, "").replace(TATWEEL, "");
  s = s.replace(/[أإآٱ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/ؤ/g, "و").replace(/ئ/g, "ي");
  s = s.replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)));
  s = s.replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)));
  s = s.replace(/[^\p{L}\p{N}+]+/gu, " ");
  return s.replace(/\s+/g, " ").trim();
}

// مرادفات شائعة بين العربية والإنجليزية في سوق قطع الغيار العراقي
// كل مجموعة = كلمات متكافئة في البحث
export const BUILTIN_SYNONYMS: string[][] = [
  ["ايفون", "iphone", "افون", "آيفون"],
  ["ايباد", "ipad"],
  ["ابل", "apple", "آبل"],
  ["سامسونج", "سامسونك", "samsung", "galaxy", "جالكسي", "كلاكسي"],
  ["شاومي", "xiaomi", "شياومي"],
  ["ريدمي", "redmi"],
  ["بوكو", "poco"],
  ["اوبو", "oppo"],
  ["فيفو", "vivo"],
  ["ريلمي", "realme"],
  ["تكنو", "tecno"],
  ["انفنكس", "infinix", "انفينكس"],
  ["هونر", "honor", "اونر"],
  ["هواوي", "huawei"],
  ["نوكيا", "nokia"],
  ["موتورولا", "motorola", "موتو"],
  ["بكسل", "pixel", "جوجل", "google"],
  ["ون بلس", "oneplus"],
  ["شاشه", "screen", "display", "lcd", "شاشة"],
  ["بطاريه", "battery", "بطارية"],
  ["شحن", "charging", "charge", "سوكت", "شاحن"],
  ["كاميرا", "camera", "كامره"],
  ["سماعه", "speaker", "سبيكر", "سماعة"],
  ["مايك", "mic", "microphone", "مايكروفون"],
  ["فليكس", "flex", "فلكس"],
  ["بورد", "board", "motherboard", "لوحه"],
  ["زجاج", "glass", "كلاس"],
  ["لاصق", "adhesive", "glue", "غراء"],
  ["كفر", "case", "cover", "جراب"],
  ["كيبل", "cable", "سلك", "واير"],
];

export function parseSynonymLines(text: string | null | undefined): string[][] {
  if (!text) return [];
  return text
    .split(/\r?\n/)
    .map((line) => line.split(/[=,،]/).map((w) => normalizeArabic(w)).filter(Boolean))
    .filter((g) => g.length > 1);
}

/**
 * يقسم الاستعلام إلى رموز، ولكل رمز قائمة بدائل (مرادفات).
 * البحث: كل رمز يجب أن يطابق (AND)، وأي بديل للرمز يكفي (OR).
 */
export function expandQuery(query: string, extraGroups: string[][] = []): string[][] {
  const groups = [...BUILTIN_SYNONYMS.map((g) => g.map(normalizeArabic)), ...extraGroups];
  const tokens = normalizeArabic(query).split(" ").filter((t) => t.length > 0).slice(0, 8);
  return tokens.map((t) => {
    const alts = new Set<string>([t]);
    // إزالة "ال" التعريف
    if (t.startsWith("ال") && t.length > 3) alts.add(t.slice(2));
    for (const g of groups) {
      if (g.includes(t)) g.forEach((w) => alts.add(w));
    }
    return [...alts];
  });
}
