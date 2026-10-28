"use client";

import { usePathname } from "next/navigation";
import { WhatsAppIcon } from "../ui/WhatsAppIcon";

export function WhatsAppFloat({ href }: { href: string }) {
  const path = usePathname();
  // في صفحات السلة والدفع نخفي الزر العائم على الجوال حتى لا يغطي أزرار الإتمام (توجد أزرار واتساب داخل الصفحة)
  const hideOnMobile = path.startsWith("/checkout") || path.startsWith("/cart");
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`wa-float fixed bottom-5 end-5 z-50 h-14 w-14 place-items-center rounded-full bg-whatsapp text-white shadow-[0_8px_30px_-6px_rgba(37,211,102,.6)] transition hover:scale-105 ${hideOnMobile ? "hidden md:grid" : "grid"}`}
      aria-label="تواصل معنا عبر واتساب"
    >
      <WhatsAppIcon className="h-7 w-7" />
    </a>
  );
}
