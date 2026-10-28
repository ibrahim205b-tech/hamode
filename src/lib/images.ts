import sharp from "sharp";
import { prisma } from "./db";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]);

/** يتحقق من الملف فعلياً عبر sharp (وليس من الامتداد) ثم يحوّله إلى WebP مضغوط */
export async function storeImage(file: File): Promise<{ id: string } | { error: string }> {
  if (!file || file.size === 0) return { error: "لم يتم اختيار ملف" };
  if (file.size > MAX_BYTES) return { error: "حجم الصورة أكبر من 8 ميغابايت" };
  if (!ALLOWED.has(file.type)) return { error: "نوع الملف غير مدعوم. استخدم JPG أو PNG أو WebP" };
  const buf = Buffer.from(await file.arrayBuffer());
  try {
    const img = sharp(buf, { limitInputPixels: 40_000_000 }).rotate();
    const meta = await img.metadata();
    if (!meta.format || !["jpeg", "png", "webp", "avif", "gif", "heif"].includes(meta.format)) return { error: "الملف ليس صورة صالحة" };
    const out = await img.resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
    const up = await prisma.upload.create({
      data: { mime: "image/webp", data: out.data, width: out.info.width, height: out.info.height, size: out.info.size },
    });
    return { id: up.id };
  } catch {
    return { error: "تعذر قراءة الصورة" };
  }
}
