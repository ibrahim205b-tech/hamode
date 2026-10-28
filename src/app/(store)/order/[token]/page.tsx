import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Info } from "lucide-react";
import { prisma } from "@/lib/db";
import { sha256 } from "@/lib/security";
import { getSettings, whatsappIntl } from "@/lib/settings";
import { orderShareMessage, waLink } from "@/lib/whatsapp";
import { formatDateTime } from "@/lib/format";
import { ORDER_STATUS_LABELS } from "@/lib/constants";
import { OrderSummary, StatusTimeline } from "@/components/store/OrderDetails";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";

export const metadata: Metadata = { title: "تفاصيل الطلب", robots: { index: false, follow: false } };

export default async function OrderPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ new?: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{20,80}$/.test(token)) notFound();
  const order = await prisma.order.findUnique({ where: { accessTokenHash: sha256(token) }, include: { items: true, history: { orderBy: { createdAt: "asc" } } } });
  if (!order) notFound();
  const isNew = (await searchParams).new === "1";
  const s = await getSettings();
  const msg = orderShareMessage({
    number: order.number,
    lines: order.items.map((i) => ({ name: i.nameAr, sku: i.sku, quantity: i.quantity, unitPrice: i.unitPrice })),
    subtotal: order.subtotal, discountTotal: order.discountTotal, deliveryFee: order.deliveryFee, total: order.total,
    customerName: order.customerName, governorate: order.governorate, area: order.area,
  });

  return (
    <div className="container max-w-4xl py-8">
      {isNew && (
        <div className="mb-6 rounded-2xl border border-success/40 bg-success/10 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-8 w-8 shrink-0 text-green-400" />
            <div>
              <h1 className="text-xl font-bold text-white sm:text-2xl">تم تسجيل طلبك في المتجر بنجاح</h1>
              <p className="mt-1 text-ink-200">رقم طلبك: <strong className="font-mono text-white" dir="ltr">{order.number}</strong> — احتفظ به لتتبع الطلب.</p>
              <p className="mt-2 text-sm leading-7 text-ink-300">سيتواصل معك المتجر لتأكيد الطلب. احفظ هذه الصفحة (رابطها خاص بك) لمتابعة حالة الطلب.</p>
            </div>
          </div>
        </div>
      )}
      {!isNew && <h1 className="mb-4 text-2xl font-bold text-white">الطلب <span className="font-mono" dir="ltr">{order.number}</span></h1>}

      <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-ink-300">
        <span>التاريخ: <span className="tabular">{formatDateTime(order.createdAt)}</span></span>
        <span>الحالة: <strong className="text-white">{ORDER_STATUS_LABELS[order.status]}</strong></span>
      </div>

      <StatusTimeline order={order} />

      <section className="mt-6 rounded-2xl border border-whatsapp/30 bg-whatsapp/5 p-5" aria-labelledby="wa-h">
        <h2 id="wa-h" className="font-semibold text-white">إرسال ملخص الطلب عبر واتساب (اختياري)</h2>
        <p className="mt-2 flex gap-2 text-sm leading-7 text-ink-300">
          <Info className="mt-1 h-4 w-4 shrink-0 text-cyan-400" />
          طلبك مسجّل في الموقع بالفعل. فتح واتساب خطوة منفصلة: سيُفتح التطبيق برسالة جاهزة، ولن تصل الرسالة إلا بعد أن تضغط «إرسال» بنفسك.
        </p>
        <a href={waLink(whatsappIntl(s), msg)} target="_blank" rel="noopener noreferrer" className="btn-whatsapp mt-4">
          <WhatsAppIcon className="h-5 w-5" /> فتح واتساب برسالة الطلب
        </a>
      </section>

      <div className="mt-6"><OrderSummary order={order} /></div>

      <section className="card mt-6 p-5 text-sm">
        <h2 className="mb-3 font-semibold text-white">بيانات التوصيل</h2>
        <p className="text-ink-200">{order.customerName} · <span dir="ltr">{order.phone}</span></p>
        <p className="mt-1 text-ink-300">{order.governorate} - {order.area} - {order.address}</p>
        {order.trackingNumber && <p className="mt-2 text-ink-300">رقم الشحنة: <span className="font-mono" dir="ltr">{order.trackingNumber}</span> {order.shippingCarrier && `(${order.shippingCarrier})`}</p>}
      </section>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/products" className="btn-secondary">متابعة التسوق</Link>
        <Link href="/track" className="btn-ghost">تتبع طلب آخر</Link>
      </div>
    </div>
  );
}
