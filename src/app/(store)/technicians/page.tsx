import type { Metadata } from "next";
import { Wrench } from "lucide-react";
import { getSettings, whatsappIntl } from "@/lib/settings";
import { waLink } from "@/lib/whatsapp";
import { CatalogView } from "@/components/store/CatalogView";
import { parseFilters } from "@/lib/search";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";

export const metadata: Metadata = { title: "قسم الفنيين", alternates: { canonical: "/technicians" } };

export default async function TechniciansPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const s = await getSettings();
  return (
    <>
      <div className="container pt-8">
        <div className="relative overflow-hidden rounded-3xl border border-ink-700 bg-ink-900 p-6 sm:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(60%_100%_at_100%_0%,rgba(34,211,238,0.14),transparent_60%)]" />
          <div className="relative">
            <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-brand-gradient text-ink-950"><Wrench className="h-6 w-6" /></span>
            <h1 className="text-2xl font-bold text-white sm:text-3xl">{s.technicians.title}</h1>
            <p className="mt-3 max-w-2xl leading-8 text-ink-300">{s.technicians.text}</p>
            <a href={waLink(whatsappIntl(s), "السلام عليكم، أنا فني صيانة وأود الاستفسار عن أسعار الجملة.")} target="_blank" rel="noopener noreferrer" className="btn-whatsapp mt-5">
              <WhatsAppIcon className="h-5 w-5" /> استفسار أسعار الجملة
            </a>
          </div>
        </div>
      </div>
      <CatalogView filters={{ ...parseFilters(await searchParams), technician: true }} basePath="/technicians" title="منتجات مخصصة للفنيين" />
    </>
  );
}
