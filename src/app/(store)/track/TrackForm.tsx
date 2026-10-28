"use client";

import { useActionForm } from "@/components/ui/useActionForm";
import { Loader2, PackageSearch } from "lucide-react";
import { trackOrder, type TrackState } from "./actions";

export function TrackForm() {
  const { state, pending, onSubmit } = useActionForm<TrackState>(trackOrder, {});
  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="card grid gap-4 p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end sm:p-6">
        <div>
          <label className="label" htmlFor="t-num">رقم الطلب</label>
          <input id="t-num" name="number" className="input font-mono" dir="ltr" placeholder="HE261028-XXXXX" required />
        </div>
        <div>
          <label className="label" htmlFor="t-phone">رقم الهاتف المستخدم في الطلب</label>
          <input id="t-phone" name="phone" className="input" dir="ltr" inputMode="tel" placeholder="07XXXXXXXXX" required />
        </div>
        <button className="btn-primary h-[42px]" disabled={pending}>{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageSearch className="h-4 w-4" />} تتبع</button>
      </form>
      {state.error && <p className="rounded-xl border border-danger/40 bg-danger/10 p-4 text-sm text-red-200" role="alert">{state.error}</p>}
      {state.result && (
        <div className="card p-5 sm:p-6" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-mono text-lg font-bold text-white" dir="ltr">{state.result.number}</h2>
            <span className={`chip py-1 text-sm ${state.result.cancelled ? "border-danger/40 bg-danger/10 text-red-200" : "border-brand-500/40 bg-brand-500/10 text-brand-300"}`}>{state.result.status}</span>
          </div>
          <p className="mt-2 text-sm text-ink-300">بتاريخ <span className="tabular">{state.result.date}</span> · {state.result.items} منتج · الإجمالي <span className="tabular">{state.result.total}</span></p>
          <ol className="mt-4 space-y-2 border-s-2 border-ink-700 ps-4">
            {state.result.history.map((h, i) => (
              <li key={i} className="text-sm"><span className="font-medium text-white">{h.label}</span> <span className="text-xs text-ink-400 tabular">— {h.at}</span></li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
