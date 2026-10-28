"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="grid min-h-[70vh] place-items-center px-4 text-center">
      <div>
        <h1 className="text-2xl font-bold text-white">حدث خطأ غير متوقع</h1>
        <p className="mt-2 text-ink-300">لم يتم فقدان أي بيانات. حاول مرة أخرى، وإذا تكررت المشكلة تواصل معنا عبر واتساب.</p>
        <div className="mt-6 flex justify-center gap-3">
          <button onClick={reset} className="btn-primary">إعادة المحاولة</button>
          <Link href="/" className="btn-secondary">الرئيسية</Link>
        </div>
      </div>
    </main>
  );
}
