import type { Metadata } from "next";
import { TrackForm } from "./TrackForm";

export const metadata: Metadata = { title: "تتبع طلبك", alternates: { canonical: "/track" } };

export default function TrackPage() {
  return (
    <div className="container max-w-3xl py-8">
      <h1 className="text-2xl font-bold text-white sm:text-3xl">تتبع طلبك</h1>
      <p className="mb-6 mt-2 text-sm text-ink-300">أدخل رقم الطلب ورقم الهاتف الذي استخدمته عند الطلب لعرض الحالة.</p>
      <TrackForm />
    </div>
  );
}
