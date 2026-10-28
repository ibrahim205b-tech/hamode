"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Smartphone, ArrowLeft } from "lucide-react";

export type DeviceTree = { slug: string; name: string; families: { name: string; models: { slug: string; name: string }[] }[] }[];
type Comp = { slug: string; nameAr: string };

export function DeviceSelector({ tree, components }: { tree: DeviceTree; components: Comp[] }) {
  const router = useRouter();
  const [man, setMan] = useState("");
  const [model, setModel] = useState("");
  const [comp, setComp] = useState("");
  const families = useMemo(() => tree.find((m) => m.slug === man)?.families ?? [], [tree, man]);

  const go = () => {
    if (!man) return;
    if (!model) return router.push(`/devices/${man}`);
    const sp = new URLSearchParams({ model });
    if (comp) sp.set("component", comp);
    router.push(`/products?${sp}`);
  };

  return (
    <div className="card relative overflow-hidden p-5 sm:p-6">
      <div className="pointer-events-none absolute -end-16 -top-16 h-40 w-40 rounded-full bg-brand-500/20 blur-3xl" />
      <div className="mb-4 flex items-center gap-2.5">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-gradient text-ink-950"><Smartphone className="h-5 w-5" /></span>
        <div>
          <h2 className="font-bold text-white">اختر جهازك</h2>
          <p className="text-xs text-ink-300">نعرض لك القطع المتوافقة مع موديلك بالضبط</p>
        </div>
      </div>
      <div className="space-y-3">
        <div>
          <label className="label" htmlFor="ds-man">الشركة المصنعة</label>
          <select id="ds-man" className="input" value={man} onChange={(e) => { setMan(e.target.value); setModel(""); }}>
            <option value="">اختر الشركة…</option>
            {tree.map((m) => <option key={m.slug} value={m.slug}>{m.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="ds-model">الموديل</label>
          <select id="ds-model" className="input" value={model} onChange={(e) => setModel(e.target.value)} disabled={!man}>
            <option value="">{man ? "كل الموديلات…" : "اختر الشركة أولاً"}</option>
            {families.map((f) => (
              <optgroup key={f.name} label={f.name}>
                {f.models.map((m) => <option key={m.slug} value={m.slug}>{m.name}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="ds-comp">نوع القطعة (اختياري)</label>
          <select id="ds-comp" className="input" value={comp} onChange={(e) => setComp(e.target.value)} disabled={!model}>
            <option value="">كل القطع</option>
            {components.map((c) => <option key={c.slug} value={c.slug}>{c.nameAr}</option>)}
          </select>
        </div>
        <button type="button" onClick={go} disabled={!man} className="btn-primary w-full">
          عرض القطع المتوافقة <ArrowLeft className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
