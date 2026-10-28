import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { getSettings, whatsappIntl } from "@/lib/settings";
import { formatDateTime, formatIQD } from "@/lib/format";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/constants";
import { toLocalIraqi } from "@/lib/whatsapp";
import { LogoMark } from "@/components/ui/Logo";
import { PrintBar } from "../../PrintBar";

export const metadata = { title: "فاتورة" };

export default async function InvoicePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ paper?: string }> }) {
  await requireStaff("orders");
  const { id } = await params;
  const paper = (await searchParams).paper;
  const thermal = paper === "58" || paper === "80";
  const [o, s] = await Promise.all([prisma.order.findUnique({ where: { id }, include: { items: true, payments: true } }), getSettings()]);
  if (!o) notFound();
  const wa = toLocalIraqi(whatsappIntl(s));
  const paid = o.payments.reduce((a, p) => a + p.amount, 0);

  return (
    <div className="min-h-screen bg-white">
      {/* حجم الصفحة حسب نوع الورق */}
      <style>{thermal ? `@page { size: ${paper}mm auto; margin: 0; }` : `@page { size: A4; margin: 12mm; }`}</style>
      <PrintBar
        extra={
          <>
            <Link href={`/admin/print/invoice/${o.id}`} className={`btn-sm btn ${!thermal ? "bg-ink-100" : ""}`}>A4</Link>
            <Link href={`/admin/print/invoice/${o.id}?paper=80`} className={`btn-sm btn ${paper === "80" ? "bg-ink-100" : ""}`}>80 مم</Link>
            <Link href={`/admin/print/invoice/${o.id}?paper=58`} className={`btn-sm btn ${paper === "58" ? "bg-ink-100" : ""}`}>58 مم</Link>
            <Link href={`/admin/orders/${o.id}`} className="btn-ghost btn-sm">رجوع للطلب</Link>
          </>
        }
      />
      <div className={`invoice print-area mx-auto ${thermal ? `receipt-${paper} my-4` : "my-6 max-w-[210mm] p-8 shadow-soft"}`}>
        <header className={`flex ${thermal ? "flex-col items-center text-center" : "items-start justify-between"} gap-3 border-b border-ink-100 pb-3`}>
          <div className={`flex items-center gap-2 ${thermal ? "flex-col" : ""}`}>
            {s.invoice.showLogo && <LogoMark size={thermal ? 34 : 52} />}
            <div>
              <p className={`font-bold ${thermal ? "text-sm" : "text-xl"}`}>{s.nameAr}</p>
              <p className="text-[10px] font-semibold tracking-[0.2em] text-brand-600" dir="ltr">{s.nameEn}</p>
            </div>
          </div>
          <div className={`text-xs leading-5 ${thermal ? "" : "text-end"}`}>
            {wa && <p>واتساب: <span dir="ltr">{wa}</span></p>}
            {s.contactPhone && <p>هاتف: <span dir="ltr">{s.contactPhone}</span></p>}
            {s.address && <p>{s.address}</p>}
          </div>
        </header>

        <section className={`mt-3 grid gap-2 text-xs ${thermal ? "" : "grid-cols-2"}`}>
          <div>
            <p className={`font-bold ${thermal ? "text-sm" : "text-base"}`}>فاتورة / طلب رقم <span className="num" dir="ltr">{o.number}</span></p>
            <p>التاريخ: <span className="num">{formatDateTime(o.createdAt)}</span></p>
            <p>حالة الطلب: {ORDER_STATUS_LABELS[o.status]}</p>
            <p>الدفع: {PAYMENT_METHOD_LABELS[o.paymentMethod] ?? o.paymentMethod} — {PAYMENT_STATUS_LABELS[o.paymentStatus]}</p>
          </div>
          <div className={thermal ? "" : "text-end"}>
            <p className="font-bold">الزبون: {o.customerName}</p>
            <p dir="ltr" className={`num ${thermal ? "text-end" : ""}`}>{o.phone}</p>
            <p>{o.governorate} - {o.area}</p>
            <p>{o.address}</p>
          </div>
        </section>

        <table className="mt-4 text-xs">
          <thead>
            <tr><th>المنتج</th><th className="wide-only">SKU</th><th>الكمية</th><th>السعر</th><th>المجموع</th></tr>
          </thead>
          <tbody>
            {o.items.map((i) => (
              <tr key={i.id}>
                <td>{i.nameAr}{thermal && <div className="font-mono text-[9px] text-ink-500" dir="ltr">{i.sku}</div>}</td>
                <td className="wide-only font-mono" dir="ltr">{i.sku}</td>
                <td className="num">{i.quantity}</td>
                <td className="num">{formatIQD(i.unitPrice)}</td>
                <td className="num">{formatIQD(i.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className={`mt-3 space-y-1 text-xs ${thermal ? "" : "ms-auto w-72"}`}>
          <div className="flex justify-between"><dt>المجموع الفرعي</dt><dd className="num">{formatIQD(o.subtotal)}</dd></div>
          {o.discountTotal > 0 && <div className="flex justify-between"><dt>الخصم</dt><dd className="num">-{formatIQD(o.discountTotal)}</dd></div>}
          <div className="flex justify-between"><dt>التوصيل</dt><dd className="num">{formatIQD(o.deliveryFee)}</dd></div>
          <div className="flex justify-between border-t border-ink-900 pt-1 text-sm font-bold"><dt>الإجمالي</dt><dd className="num">{formatIQD(o.total)}</dd></div>
          {paid !== 0 && <div className="flex justify-between"><dt>المدفوع</dt><dd className="num">{formatIQD(paid)}</dd></div>}
          {paid !== 0 && o.total - paid > 0 && <div className="flex justify-between"><dt>المتبقي</dt><dd className="num">{formatIQD(o.total - paid)}</dd></div>}
        </dl>

        {(s.invoice.warrantyNote || s.invoice.footerText) && (
          <footer className="mt-5 border-t border-ink-100 pt-3 text-center text-[11px] leading-5">
            {s.invoice.warrantyNote && <p className="whitespace-pre-line">{s.invoice.warrantyNote}</p>}
            {s.invoice.footerText && <p className="mt-1 font-semibold">{s.invoice.footerText}</p>}
          </footer>
        )}
      </div>
    </div>
  );
}
