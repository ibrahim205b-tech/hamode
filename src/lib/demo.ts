// وضع «نسخة العرض الثابتة» (GitHub Pages): يُفعّل فقط عند بناء نسخة العرض عبر scripts/build-static-demo.mjs
// في التطبيق الكامل هذه القيم معطلة ولا تغير أي سلوك.
export const DEMO_STATIC = process.env.NEXT_PUBLIC_DEMO_STATIC === "1";
export const BASE_PATH = DEMO_STATIC ? process.env.NEXT_PUBLIC_BASE_PATH || "" : "";

/** رابط صورة مرفوعة: من الخادم في التطبيق الكامل، أو ملف ثابت في نسخة العرض */
export function imageUrl(id: string): string {
  return DEMO_STATIC ? `${BASE_PATH}/media/${id}.webp` : `/api/images/${id}`;
}

/** يضيف مسار الموقع الأساسي للروابط التي لا يعالجها Next تلقائياً (مثل action في النماذج) */
export function withBase(path: string): string {
  return `${BASE_PATH}${path}`;
}
