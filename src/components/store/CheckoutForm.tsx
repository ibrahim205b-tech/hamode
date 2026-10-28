"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Loader2, Lock, ShoppingBag } from "lucide-react";
import { useCart } from "./CartProvider";
import { useQuote } from "./useQuote";
import { formatIQD } from "@/lib/format";
import { EmptyState } from "../ui/Empty";

type Method = { id: string; nameAr: string; description: string | null; kind: "DELIVERY" | "PICKUP" };
type Address = { governorate: string; area: string; address: string };

const KEY = "he_checkout_key";

function newKey() {
  const a = new Uint8Array(24);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function CheckoutForm({
  governorates, methods, prefill, addresses, isLoggedIn, note,
}: { governorates: readonly string[]; methods: Method[]; prefill: { name: string; phone: string }; addresses: Address[]; isLoggedIn: boolean; note: string }) {
  const router = useRouter();
  const { items, ready, clear } = useCart();
  const [form, setForm] = useState({
    customerName: prefill.name, phone: prefill.phone, governorate: addresses[0]?.governorate ?? "", area: addresses[0]?.area ?? "",
    address: addresses[0]?.address ?? "", notes: "", deliveryMethodId: methods[0]?.id ?? "", saveAddress: isLoggedIn && !addresses.length,
  });
  const [codeInput, setCodeInput] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverIssues, setServerIssues] = useState<{ message: string }[]>([]);
  const keyRef = useRef<string>("");
  const { quote, loading } = useQuote({ governorate: form.governorate, deliveryMethodId: form.deliveryMethodId, discountCode: code });

  useEffect(() => {
    try {
      keyRef.current = sessionStorage.getItem(KEY) || newKey();
      sessionStorage.setItem(KEY, keyRef.current);
    } catch {
      keyRef.current = newKey();
    }
  }, []);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value }));

  if (!ready) return <div className="skeleton h-96 w-full rounded-2xl" />;
  if (!items.length && !submitting) {
    return <EmptyState icon={<ShoppingBag className="h-7 w-7" />} title="السلة فارغة" text="أضف منتجات إلى السلة قبل إتمام الطلب." action={<Link href="/products" className="btn-primary">تصفح المنتجات</Link>} />;
  }
  const method = methods.find((m) => m.id === form.deliveryMethodId);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setServerIssues([]);
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotencyKey: keyRef.current,
          customerName: form.customerName,
          phone: form.phone,
          governorate: form.governorate,
          area: method?.kind === "PICKUP" && !form.area ? "استلام من المحل" : form.area,
          address: method?.kind === "PICKUP" && !form.address ? "استلام من المحل" : form.address,
          notes: form.notes || null,
          deliveryMethodId: form.deliveryMethodId || null,
          discountCode: code || null,
          paymentMethod: "COD",
          saveAddress: form.saveAddress,
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, seenPrice: i.seenPrice })),
        }),
      });
      const data = await res.json().catch(() => ({ ok: false, error: "استجابة غير متوقعة من الخادم" }));
      if (data.ok) {
        try { sessionStorage.removeItem(KEY); } catch {}
        clear();
        router.replace(`/order/${data.token}?new=1`);
        return;
      }
      setError(data.error || "تعذر إتمام الطلب");
      if (Array.isArray(data.issues)) setServerIssues(data.issues);
      setSubmitting(false);
    } catch {
      setError("انقطع الاتصال. تحقق من الإنترنت ثم أعد المحاولة — لن يتكرر الطلب إذا كان قد سُجّل.");
      setSubmitting(false);
    }
  };

  const issues = [...serverIssues, ...(quote?.issues ?? [])];
  const canSubmit = !!quote?.ok && !quote.issues.length && !loading && !submitting && (method?.kind === "PICKUP" || quote.deliveryFee != null);

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_380px]" noValidate={false}>
      <div className="space-y-6">
        <fieldset className="card p-5 sm:p-6">
          <legend className="sr-only">بيانات الزبون</legend>
          <h2 className="mb-4 text-lg font-bold text-white">بيانات التواصل</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="c-name">الاسم الكامل *</label>
              <input id="c-name" className="input" required minLength={2} maxLength={80} autoComplete="name" value={form.customerName} onChange={set("customerName")} />
            </div>
            <div>
              <label className="label" htmlFor="c-phone">رقم الهاتف *</label>
              <input id="c-phone" className="input text-start" dir="ltr" required inputMode="tel" autoComplete="tel" placeholder="07XXXXXXXXX" pattern="[0-9+\s٠-٩]{10,16}" value={form.phone} onChange={set("phone")} />
            </div>
          </div>
        </fieldset>

        <fieldset className="card p-5 sm:p-6">
          <legend className="sr-only">التوصيل</legend>
          <h2 className="mb-4 text-lg font-bold text-white">التوصيل</h2>
          {methods.length > 1 && (
            <div className="mb-4 grid gap-2 sm:grid-cols-2">
              {methods.map((m) => (
                <label key={m.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition ${form.deliveryMethodId === m.id ? "border-brand-500 bg-brand-500/10" : "border-ink-600 hover:border-ink-500"}`}>
                  <input type="radio" name="dm" value={m.id} checked={form.deliveryMethodId === m.id} onChange={set("deliveryMethodId")} className="mt-1 accent-brand-500" />
                  <span><span className="block text-sm font-semibold text-white">{m.nameAr}</span>{m.description && <span className="mt-0.5 block text-xs text-ink-400">{m.description}</span>}</span>
                </label>
              ))}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="c-gov">المحافظة *</label>
              <select id="c-gov" className="input" required value={form.governorate} onChange={set("governorate")}>
                <option value="">اختر المحافظة</option>
                {governorates.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="c-area">القضاء / المنطقة {method?.kind !== "PICKUP" && "*"}</label>
              <input id="c-area" className="input" required={method?.kind !== "PICKUP"} maxLength={80} value={form.area} onChange={set("area")} />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="c-addr">العنوان بالتفصيل {method?.kind !== "PICKUP" && "*"}</label>
              <textarea id="c-addr" className="input min-h-[84px]" required={method?.kind !== "PICKUP"} maxLength={300} placeholder="الحي، الشارع، أقرب نقطة دالة" value={form.address} onChange={set("address")} />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="c-notes">ملاحظات (اختياري)</label>
              <textarea id="c-notes" className="input min-h-[70px]" maxLength={500} placeholder="مثال: موديل الجهاز بالضبط، وقت مناسب للاتصال" value={form.notes} onChange={set("notes")} />
            </div>
            {isLoggedIn && (
              <label className="flex items-center gap-2 text-sm text-ink-200 sm:col-span-2">
                <input type="checkbox" checked={form.saveAddress} onChange={set("saveAddress")} className="h-4 w-4 accent-brand-500" /> احفظ هذا العنوان في حسابي
              </label>
            )}
          </div>
        </fieldset>

        <fieldset className="card p-5 sm:p-6">
          <legend className="sr-only">الدفع</legend>
          <h2 className="mb-3 text-lg font-bold text-white">طريقة الدفع</h2>
          <label className="flex items-center gap-3 rounded-xl border border-brand-500 bg-brand-500/10 p-3.5">
            <input type="radio" checked readOnly className="accent-brand-500" />
            <span><span className="block text-sm font-semibold text-white">الدفع نقداً عند الاستلام</span><span className="text-xs text-ink-400">ادفع عند استلام طلبك</span></span>
          </label>
        </fieldset>
      </div>

      <aside className="card h-fit p-5 lg:sticky lg:top-32">
        <h2 className="mb-4 text-lg font-bold text-white">ملخص الطلب</h2>
        <ul className="mb-4 max-h-64 space-y-2.5 overflow-auto text-sm">
          {quote?.lines.map((l) => (
            <li key={l.productId} className="flex justify-between gap-3">
              <span className="min-w-0 text-ink-200"><span className="line-clamp-1">{l.nameAr}</span><span className="text-xs text-ink-400 tabular">{l.quantity} × {formatIQD(l.unitPrice)}</span></span>
              <span className="shrink-0 font-medium tabular">{formatIQD(l.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <div className="mb-4 flex gap-2">
          <label htmlFor="c-code" className="sr-only">كود الخصم</label>
          <input id="c-code" className="input !py-2" placeholder="كود خصم" value={codeInput} onChange={(e) => setCodeInput(e.target.value.toUpperCase())} dir="ltr" />
          <button type="button" className="btn-secondary btn-sm shrink-0" onClick={() => setCode(codeInput.trim())}>تطبيق</button>
        </div>
        <dl className="space-y-2 text-sm tabular">
          <div className="flex justify-between"><dt className="text-ink-300">المجموع الفرعي</dt><dd>{quote ? formatIQD(quote.subtotal) : "…"}</dd></div>
          {!!quote?.discountTotal && <div className="flex justify-between text-cyan-300"><dt>الخصم ({quote.discountCode})</dt><dd>-{formatIQD(quote.discountTotal)}</dd></div>}
          <div className="flex justify-between">
            <dt className="text-ink-300">التوصيل</dt>
            <dd>{!quote ? "…" : quote.deliveryPending ? "يُحدد عند التأكيد" : quote.deliveryFee == null ? "اختر المحافظة" : quote.deliveryFee === 0 ? "مجاني" : formatIQD(quote.deliveryFee)}</dd>
          </div>
        </dl>
        <div className="my-4 h-px bg-ink-700" />
        <div className="flex items-center justify-between">
          <span className="font-semibold">الإجمالي{quote?.deliveryPending ? " (بدون التوصيل)" : ""}</span>
          <span className="text-2xl font-bold text-white tabular">{quote ? formatIQD(quote.total) : "…"}</span>
        </div>

        {issues.length > 0 && (
          <div className="mt-4 space-y-2" role="alert">
            {issues.map((i, k) => (
              <p key={k} className="flex gap-2 rounded-lg bg-warning/10 p-2.5 text-xs leading-6 text-amber-100"><AlertTriangle className="mt-1 h-3.5 w-3.5 shrink-0" />{i.message}</p>
            ))}
            {quote && quote.issues.some((i) => i.kind !== "discount") && <Link href="/cart" className="link text-xs">مراجعة السلة</Link>}
          </div>
        )}
        {error && <p className="mt-4 rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-red-200" role="alert">{error}</p>}

        <button type="submit" disabled={!canSubmit} className="btn-primary btn-lg mt-5 w-full">
          {submitting ? <><Loader2 className="h-5 w-5 animate-spin" /> جارٍ تسجيل الطلب…</> : <><Lock className="h-4 w-4" /> تأكيد الطلب</>}
        </button>
        {note && <p className="mt-3 text-xs leading-6 text-ink-300">{note}</p>}
        <p className="mt-3 text-xs leading-6 text-ink-400">بالضغط على «تأكيد الطلب» يُسجَّل طلبك في المتجر وتحصل على رقم طلب. الأسعار والمخزون يتم التحقق منها على الخادم.</p>
      </aside>
    </form>
  );
}
