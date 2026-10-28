import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSettings, whatsappIntl } from "@/lib/settings";
import { waLink, toLocalIraqi } from "@/lib/whatsapp";
import { Logo } from "../ui/Logo";
import { WhatsAppIcon } from "../ui/WhatsAppIcon";
import { MapPin, Phone, Clock, Mail } from "lucide-react";

const POLICY_LABELS: Record<string, string> = {
  shipping: "سياسة التوصيل",
  returns: "الاستبدال والإرجاع",
  warranty: "الضمان",
  privacy: "الخصوصية",
  terms: "الشروط والأحكام",
};

export async function Footer() {
  const s = await getSettings();
  const cats = await prisma.category.findMany({ where: { parentId: null, isActive: true }, orderBy: { sortOrder: "asc" }, select: { slug: true, nameAr: true } });
  const wa = whatsappIntl(s);
  const policies = Object.entries(s.policies).filter(([, v]) => v.trim());
  const social = Object.entries(s.social).filter(([, v]) => v.trim().startsWith("http"));
  const socialLabels: Record<string, string> = { facebook: "فيسبوك", instagram: "إنستغرام", tiktok: "تيك توك", telegram: "تيليغرام", youtube: "يوتيوب" };
  return (
    <footer className="site-footer mt-20 border-t border-ink-800 bg-ink-900">
      <div className="container grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <Logo nameAr={s.nameAr} nameEn={s.nameEn} imageId={s.logoUploadId || null} />
          <p className="text-sm leading-7 text-ink-300">{s.tagline}</p>
          <a href={waLink(wa)} target="_blank" rel="noopener noreferrer" className="btn-whatsapp btn-sm">
            <WhatsAppIcon className="h-4 w-4" /> <span dir="ltr">{toLocalIraqi(s.whatsappNumber) ?? s.whatsappNumber}</span>
          </a>
        </div>
        <div>
          <h2 className="mb-4 text-sm font-bold text-white">الأقسام</h2>
          <ul className="grid grid-cols-1 gap-2 text-sm text-ink-300">
            {cats.slice(0, 8).map((c) => (
              <li key={c.slug}><Link className="hover:text-white" href={`/category/${c.slug}`}>{c.nameAr}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-4 text-sm font-bold text-white">روابط مهمة</h2>
          <ul className="space-y-2 text-sm text-ink-300">
            <li><Link className="hover:text-white" href="/devices">تسوق حسب الجهاز</Link></li>
            <li><Link className="hover:text-white" href="/products?offers=1">العروض</Link></li>
            <li><Link className="hover:text-white" href="/technicians">قسم الفنيين</Link></li>
            <li><Link className="hover:text-white" href="/track">تتبع طلبك</Link></li>
            <li><Link className="hover:text-white" href="/account">حسابي</Link></li>
            {policies.map(([k]) => (
              <li key={k}><Link className="hover:text-white" href={`/policies/${k}`}>{POLICY_LABELS[k]}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-4 text-sm font-bold text-white">تواصل معنا</h2>
          <ul className="space-y-3 text-sm text-ink-300">
            {s.contactPhone && (
              <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-cyan-400" /><a href={`tel:${s.contactPhone}`} dir="ltr" className="hover:text-white">{s.contactPhone}</a></li>
            )}
            {s.email && (
              <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-cyan-400" /><a href={`mailto:${s.email}`} className="hover:text-white">{s.email}</a></li>
            )}
            {s.address && (
              <li className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />{s.mapUrl ? <a href={s.mapUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white">{s.address}</a> : s.address}</li>
            )}
            {s.workingHours && (
              <li className="flex items-start gap-2"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" /><span className="whitespace-pre-line">{s.workingHours}</span></li>
            )}
            <li className="flex items-center gap-2"><WhatsAppIcon className="h-4 w-4 text-whatsapp" /><a href={waLink(wa)} target="_blank" rel="noopener noreferrer" className="hover:text-white">واتساب المتجر</a></li>
          </ul>
          {social.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {social.map(([k, v]) => (
                <a key={k} href={v} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-ink-700 px-2.5 py-1 text-xs text-ink-200 hover:border-brand-500">{socialLabels[k]}</a>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="border-t border-ink-800">
        <div className="container flex flex-col items-center justify-between gap-2 py-5 text-xs text-ink-400 sm:flex-row">
          <span>© {new Date().getFullYear()} {s.nameAr} · {s.nameEn}. جميع الحقوق محفوظة.</span>
          <span>الأسعار بالدينار العراقي · الدفع عند الاستلام</span>
        </div>
      </div>
    </footer>
  );
}
