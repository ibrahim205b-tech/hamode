import { Header } from "@/components/store/Header";
import { Footer } from "@/components/store/Footer";
import { WhatsAppFloat } from "@/components/store/WhatsAppFloat";
import { getSettings, whatsappIntl } from "@/lib/settings";
import { waLink } from "@/lib/whatsapp";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  return (
    <>
      <Header />
      <main id="main" className="min-h-[60vh]">{children}</main>
      <Footer />
      <WhatsAppFloat href={waLink(whatsappIntl(s), `السلام عليكم، لدي استفسار من موقع ${s.nameAr}`)} />
    </>
  );
}
