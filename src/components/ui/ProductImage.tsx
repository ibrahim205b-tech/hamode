import Image from "next/image";
import { CategoryIcon } from "./icons";

/** صورة المنتج من قاعدة البيانات، أو رسم بديل أنيق عند عدم وجود صورة */
export function ProductImage({
  uploadId, alt, icon, sizes = "(max-width: 640px) 50vw, 25vw", priority = false, className = "",
}: { uploadId?: string | null; alt: string; icon?: string | null; sizes?: string; priority?: boolean; className?: string }) {
  if (uploadId) {
    return (
      <Image src={`/api/images/${uploadId}`} alt={alt} fill sizes={sizes} priority={priority} className={`object-contain p-3 ${className}`} />
    );
  }
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-ink-300" role="img" aria-label={`${alt} — لا توجد صورة`}>
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-brand-500/10 blur-xl" />
        <CategoryIcon name={icon} className="relative h-12 w-12 stroke-[1.25] text-ink-400" />
      </div>
      <span className="text-[11px] text-ink-400">لا توجد صورة بعد</span>
    </div>
  );
}
