import type { Metadata } from "next";
import { CartView } from "@/components/store/CartView";
import { getSettings, whatsappIntl } from "@/lib/settings";

export const metadata: Metadata = { title: "سلة التسوق", robots: { index: false } };

export default async function CartPage() {
  const s = await getSettings();
  return (
    <div className="container py-8">
      <h1 className="mb-6 text-2xl font-bold text-white sm:text-3xl">سلة التسوق</h1>
      <CartView waNumber={whatsappIntl(s)} />
    </div>
  );
}
