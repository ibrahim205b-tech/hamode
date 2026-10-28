import type { Metadata } from "next";
import Link from "next/link";
import { getDeviceTree } from "@/lib/catalog";

export const metadata: Metadata = { title: "تسوق حسب الجهاز", alternates: { canonical: "/devices" } };

export default async function DevicesPage() {
  const tree = await getDeviceTree();
  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold text-white sm:text-3xl">تسوق حسب الجهاز</h1>
      <p className="mt-2 text-sm text-ink-300">اختر الشركة ثم الموديل لعرض القطع المتوافقة معه.</p>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {tree.map((m) => (
          <Link key={m.slug} href={`/devices/${m.slug}`} className="card group p-5 transition hover:border-brand-500/50">
            <span className="block text-lg font-bold text-white" dir="ltr">{m.name}</span>
            <span className="mt-1 block text-xs text-ink-400 tabular">{m.families.reduce((a, f) => a + f.models.length, 0)} موديل</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
