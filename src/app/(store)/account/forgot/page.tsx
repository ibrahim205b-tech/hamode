import type { Metadata } from "next";
import { getSettings, whatsappIntl } from "@/lib/settings";
import { waLink } from "@/lib/whatsapp";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";

export const metadata: Metadata = { title: "نسيت كلمة المرور", robots: { index: false } };

export default async function ForgotPage() {
  const s = await getSettings();
  return (
    <div className="container max-w-md py-12">
      <div className="card p-6 sm:p-8">
        <h1 className="mb-3 text-2xl font-bold text-white">نسيت كلمة المرور؟</h1>
        <p className="text-sm leading-7 text-ink-300">
          لحماية حسابك، تتم إعادة تعيين كلمة المرور عبر المتجر: راسلنا على واتساب من نفس الرقم المسجل في حسابك، وسنرسل لك رابطاً آمناً لمرة واحدة صالحاً لمدة ساعة.
        </p>
        <a href={waLink(whatsappIntl(s), "السلام عليكم، نسيت كلمة مرور حسابي في الموقع وأحتاج رابط إعادة التعيين.")} target="_blank" rel="noopener noreferrer" className="btn-whatsapp mt-5 w-full">
          <WhatsAppIcon className="h-5 w-5" /> طلب رابط إعادة التعيين
        </a>
      </div>
    </div>
  );
}
