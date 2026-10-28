"use client";

import Image from "next/image";
import { useState } from "react";
import { X, ZoomIn } from "lucide-react";
import { CategoryIcon } from "../ui/icons";

export function Gallery({ images, name, icon }: { images: { uploadId: string; alt: string | null }[]; name: string; icon?: string | null }) {
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  const [lightbox, setLightbox] = useState(false);
  if (!images.length) {
    return (
      <div className="relative grid aspect-square place-items-center rounded-3xl border border-ink-700 bg-ink-50">
        <div className="flex flex-col items-center gap-3 text-ink-400">
          <CategoryIcon name={icon} className="h-20 w-20 stroke-1" />
          <span className="text-sm">لا توجد صورة لهذا المنتج بعد</span>
        </div>
      </div>
    );
  }
  const cur = images[Math.min(i, images.length - 1)];
  return (
    <div>
      <div
        className="relative aspect-square cursor-zoom-in overflow-hidden rounded-3xl border border-ink-700 bg-ink-50"
        onMouseEnter={() => setZoom(true)}
        onMouseLeave={() => setZoom(false)}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
        }}
        onClick={() => setLightbox(true)}
      >
        <Image
          src={`/api/images/${cur.uploadId}`}
          alt={cur.alt || name}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-contain p-6 transition-transform duration-200"
          style={{ transform: zoom ? "scale(1.9)" : "scale(1)", transformOrigin: origin }}
        />
        <button type="button" className="absolute bottom-3 start-3 grid h-10 w-10 place-items-center rounded-xl bg-ink-900/80 text-white" aria-label="تكبير الصورة" onClick={(e) => { e.stopPropagation(); setLightbox(true); }}>
          <ZoomIn className="h-5 w-5" />
        </button>
      </div>
      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {images.map((im, idx) => (
            <button
              type="button"
              key={im.uploadId}
              onClick={() => setI(idx)}
              className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 bg-ink-50 ${idx === i ? "border-brand-500" : "border-transparent opacity-70 hover:opacity-100"}`}
              aria-label={`الصورة ${idx + 1}`}
              aria-current={idx === i}
            >
              <Image src={`/api/images/${im.uploadId}`} alt="" fill sizes="80px" className="object-contain p-1" />
            </button>
          ))}
        </div>
      )}
      {lightbox && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4" role="dialog" aria-modal="true" aria-label={name} onClick={() => setLightbox(false)}>
          <button className="absolute end-4 top-4 grid h-11 w-11 place-items-center rounded-xl bg-ink-800 text-white" aria-label="إغلاق" onClick={() => setLightbox(false)}>
            <X className="h-6 w-6" />
          </button>
          <div className="relative h-[85vh] w-full max-w-4xl rounded-2xl bg-white">
            <Image src={`/api/images/${cur.uploadId}`} alt={cur.alt || name} fill sizes="100vw" className="object-contain p-4" />
          </div>
        </div>
      )}
    </div>
  );
}
