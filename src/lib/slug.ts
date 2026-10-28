import { normalizeArabic } from "./arabic";
import { randomCode } from "./security";

/** يصنع رابطاً وصفياً يدعم العربية والإنجليزية */
export function slugify(input: string): string {
  const s = normalizeArabic(input).replace(/\+/g, " plus ").trim().replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 80);
  return s || randomCode(6).toLowerCase();
}

export function uniqueSuffix() {
  return randomCode(4).toLowerCase();
}
