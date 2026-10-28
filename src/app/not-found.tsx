import Link from "next/link";
import { LogoMark } from "@/components/ui/Logo";

export default function NotFound() {
  return (
    <main id="main" className="grid min-h-[70vh] place-items-center px-4 text-center">
      <div>
        <LogoMark size={64} className="mx-auto mb-6" />
        <p className="font-mono text-5xl font-bold text-white">404</p>
        <h1 className="mt-3 text-xl font-bold text-white">الصفحة غير موجودة</h1>
        <p className="mt-2 text-ink-300">ربما تم نقل المنتج أو تغيير الرابط.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/" className="btn-primary">الرئيسية</Link>
          <Link href="/products" className="btn-secondary">تصفح المنتجات</Link>
        </div>
      </div>
    </main>
  );
}
