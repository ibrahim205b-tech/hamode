import type { Metadata } from "next";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { getSettings, whatsappIntl } from "@/lib/settings";
import { toLocalIraqi, waLink } from "@/lib/whatsapp";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";

export const metadata: Metadata = { title: "تواصل معنا", alternates: { canonical: "/contact" } };

export default async function ContactPage() {
  const s = await getSettings();
  const rows = [
    s.contactPhone && { Icon: Phone, label: "الهاتف", value: <a href={`tel:${s.contactPhone}`} dir="ltr" className="link">{s.contactPhone}</a> },
    s.email && { Icon: Mail, label: "البريد الإلكتروني", value: <a href={`mailto:${s.email}`} className="link">{s.email}</a> },
    s.address && { Icon: MapPin, label: "العنوان", value: s.mapUrl ? <a href={s.mapUrl} target="_blank" rel="noopener noreferrer" className="link">{s.address}</a> : s.address },
    s.workingHours && { Icon: Clock, label: "أوقات العمل", value: <span className="whitespace-pre-line">{s.workingHours}</span> },
  ].filter(Boolean) as { Icon: typeof Phone; label: string; value: React.ReactNode }[];
  return (
    <div className="container max-w-3xl py-10">
      <h1 className="text-2xl font-bold text-white sm:text-3xl">تواصل معنا</h1>
      <div className="card mt-6 p-6">
        <a href={waLink(whatsappIntl(s), `السلام عليكم، لدي استفسار من موقع ${s.nameAr}`)} target="_blank" rel="noopener noreferrer" className="btn-whatsapp btn-lg w-full sm:w-auto">
          <WhatsAppIcon className="h-5 w-5" /> واتساب: <span dir="ltr">{toLocalIraqi(s.whatsappNumber)}</span>
        </a>
        {rows.length > 0 && (
          <dl className="mt-6 space-y-4">
            {rows.map((r) => (
              <div key={r.label} className="flex gap-3"><r.Icon className="mt-0.5 h-5 w-5 text-cyan-400" /><div><dt className="text-sm text-ink-400">{r.label}</dt><dd className="text-ink-100">{r.value}</dd></div></div>
            ))}
          </dl>
        )}
      </div>
    </div>
  );
}
