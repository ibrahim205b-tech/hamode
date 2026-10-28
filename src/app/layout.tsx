import type { Metadata, Viewport } from "next";
import "@fontsource/ibm-plex-sans-arabic/400.css";
import "@fontsource/ibm-plex-sans-arabic/500.css";
import "@fontsource/ibm-plex-sans-arabic/600.css";
import "@fontsource/ibm-plex-sans-arabic/700.css";
import "./globals.css";
import "./print.css";
import { getSettings, siteUrl } from "@/lib/settings";
import { CartProvider } from "@/components/store/CartProvider";
import { BASE_PATH, DEMO_STATIC } from "@/lib/demo";

// كل الصفحات تُعرض من قاعدة البيانات مباشرة حتى تنعكس تغييرات الإعدادات (مثل رقم واتساب) فوراً
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  const title = s.seo.title || `${s.nameAr} | ${s.nameEn} — قطع غيار الهواتف في العراق`;
  const description =
    s.seo.description || `${s.nameAr}: شاشات، بطاريات، منافذ شحن، كاميرات، قطع بورد، أدوات ومستلزمات صيانة الهواتف وإكسسوارات. ابحث حسب موديل جهازك واطلب مع الدفع عند الاستلام.`;
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: title, template: `%s | ${s.nameAr}` },
    description,
    keywords: s.seo.keywords || undefined,
    applicationName: s.nameEn,
    openGraph: { type: "website", locale: "ar_IQ", siteName: `${s.nameAr} | ${s.nameEn}`, title, description },
    twitter: { card: "summary_large_image", title, description },
    alternates: { canonical: "/" },
    icons: { icon: `${BASE_PATH}/icon.svg` },
    // نسخة العرض التجريبية لا تُفهرس في محركات البحث
    ...(DEMO_STATIC ? { robots: { index: false, follow: false } } : {}),
  };
}

export const viewport: Viewport = {
  themeColor: "#05070B",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-brand-500 focus:px-4 focus:py-2 focus:text-white">
          تخطَّ إلى المحتوى
        </a>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
