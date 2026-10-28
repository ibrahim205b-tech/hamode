import { imageUrl } from "@/lib/demo";

/** شعار حمودي الخبير — عمل فني أصلي بصيغة SVG: هاتف بدائرة إلكترونية تشكّل حرف H */
export function LogoMark({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="he-g" x1="6" y1="4" x2="44" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2F6BFF" />
          <stop offset="1" stopColor="#22D3EE" />
        </linearGradient>
        <linearGradient id="he-bg" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#131A24" />
          <stop offset="1" stopColor="#05070B" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="46" height="46" rx="13" fill="url(#he-bg)" stroke="url(#he-g)" strokeOpacity=".55" />
      <rect x="14" y="7.5" width="20" height="33" rx="5" stroke="url(#he-g)" strokeWidth="2.4" />
      <path d="M21.5 10.5h5" stroke="url(#he-g)" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M19.5 17v14M28.5 17v14M19.5 24h9" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="19.5" cy="17" r="1.9" fill="#22D3EE" />
      <circle cx="28.5" cy="31" r="1.9" fill="#2F6BFF" />
      <path d="M34 20h5.5v8H43" stroke="url(#he-g)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="43.2" cy="28" r="1.5" fill="#22D3EE" />
      <path d="M14 30H8.5v-8H5" stroke="url(#he-g)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="4.8" cy="22" r="1.5" fill="#2F6BFF" />
    </svg>
  );
}

export function Logo({ nameAr = "حمودي الخبير", nameEn = "HAMMOUDI EXPERT", compact = false, dark = true, imageId }: { nameAr?: string; nameEn?: string; compact?: boolean; dark?: boolean; imageId?: string | null }) {
  const size = compact ? 34 : 42;
  return (
    <span className="inline-flex items-center gap-2.5">
      {imageId ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl(imageId)} alt="" width={size} height={size} className="rounded-xl object-contain" style={{ width: size, height: size }} />
      ) : (
        <LogoMark size={size} />
      )}
      <span className="flex flex-col leading-none">
        <span className={`text-[1.15rem] font-bold tracking-tight ${dark ? "text-white" : "text-ink-900"} ${compact ? "text-base" : ""}`}>{nameAr}</span>
        <span className="mt-1 bg-brand-gradient bg-clip-text text-[0.62rem] font-semibold tracking-[0.22em] text-transparent" dir="ltr">
          {nameEn}
        </span>
      </span>
    </span>
  );
}
