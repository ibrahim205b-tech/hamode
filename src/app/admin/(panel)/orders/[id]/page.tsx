import Link from "next/link";
import { notFound } from "next/navigation";
import { Printer, Receipt } from "lucide-react";
import { prisma } from "@/lib/db";
import { can, requireStaff } from "@/lib/auth";
import { allowedTransitions } from "@/lib/orders";
import { formatDateTime, formatIQD } from "@/lib/format";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/constants";
import { toInternationalIraqi, waLink } from "@/lib/whatsapp";
import { Badge, Card, Field, PageHeader, TextArea } from "@/components/admin/ui";
import { STATUS_TONE } from "@/components/admin/status";
import { ActionForm } from "@/components/admin/ActionForm";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { recordPayment, updateDeliveryFee, updateShipping, updateStatus } from "../actions";

export const metadata = { title: "تفاصيل الطلب" };

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStaff("orders");
  const { id } = await params;
  const o = await prisma.order.findUnique({
    where: { id },
    include: {
      items: { include: { product: { select: { id: true, stockQty: true } } } },
      history: { orderBy: { createdAt: "asc" }, include: { user: { select: { name: true } } } },
      payments: { orderBy: { receivedAt: "asc" }, include: { user: { select: { name: true } } } },
      customer: { select: { id: true, _count: { select: { orders: true } } } },
    },
  });
  if (!o) notFound();
  const next = allowedTransitions(o.status);
  const paid = o.payments.reduce((a, p) => a + p.amount, 0);
  const custWa = toInternationalIraqi(o.phone);
  const showCost = can(user, "products.cost");
  const cost = o.items.reduce((a, i) => (i.unitCost == null || a == null ? null : a + i.unitCost * i.quantity), 0 as number | null);

  return (
    <>
      <PageHeader
        title={`الطلب ${o.number}`}
        subtitle={<>أُنشئ {formatDateTime(o.createdAt)} · <Badge tone={STATUS_TONE[o.status]}>{ORDER_STATUS_LABELS[o.status]}</Badge> · <Badge tone={o.paymentStatus === "PAID" ? "green" : "gray"}>{PAYMENT_STATUS_LABELS[o.paymentStatus]}</Badge></>}
        actions={
          <>
            <Link href={`/admin/print/invoice/${o.id}`} target="_blank" className="btn-secondary btn-sm"><Printer className="h-4 w-4" /> فاتورة A4</Link>
            <Link href={`/admin/print/invoice/${o.id}?paper=80`} target="_blank" className="btn-secondary btn-sm"><Receipt className="h-4 w-4" /> إيصال 80مم</Link>
            <Link href={`/admin/print/invoice/${o.id}?paper=58`} target="_blank" className="btn-secondary btn-sm"><Receipt className="h-4 w-4" /> إيصال 58مم</Link>
            {custWa && <a href={waLink(custWa, `مرحباً ${o.customerName}، بخصوص طلبك رقم ${o.number} من حمودي الخبير:\n`)} target="_blank" rel="noopener noreferrer" className="btn-whatsapp btn-sm"><WhatsAppIcon className="h-4 w-4" /> مراسلة الزبون</a>}
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card title="المنتجات">
            <div className="overflow-x-auto">
              <table className="table-admin">
                <thead><tr><th>المنتج</th><th>SKU</th><th>الكمية</th><th>سعر الوحدة</th><th>المجموع</th>{showCost && <th>التكلفة</th>}<th>المخزون الحالي</th></tr></thead>
                <tbody>
                  {o.items.map((i) => (
                    <tr key={i.id}>
                      <td>{i.product ? <Link href={`/admin/products/${i.product.id}`} className="text-brand-600 hover:underline">{i.nameAr}</Link> : i.nameAr}</td>
                      <td className="font-mono text-xs" dir="ltr">{i.sku}</td>
                      <td className="tabular">{i.quantity}</td>
                      <td className="tabular">{formatIQD(i.unitPrice)}</td>
                      <td className="font-semibold tabular">{formatIQD(i.lineTotal)}</td>
                      {showCost && <td className="tabular text-ink-500">{i.unitCost != null ? formatIQD(i.unitCost * i.quantity) : "—"}</td>}
                      <td className="tabular">{i.product?.stockQty ?? "محذوف"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="mt-4 ms-auto max-w-xs space-y-1.5 text-sm tabular">
              <div className="flex justify-between"><dt>المجموع الفرعي</dt><dd>{formatIQD(o.subtotal)}</dd></div>
              {o.discountTotal > 0 && <div className="flex justify-between text-brand-600"><dt>الخصم ({o.discountCode})</dt><dd>-{formatIQD(o.discountTotal)}</dd></div>}
              <div className="flex justify-between"><dt>التوصيل ({o.deliveryMethod})</dt><dd>{formatIQD(o.deliveryFee)}</dd></div>
              <div className="flex justify-between border-t border-ink-100 pt-1.5 text-base font-bold"><dt>الإجمالي</dt><dd>{formatIQD(o.total)}</dd></div>
              <div className="flex justify-between text-ink-500"><dt>المقبوض</dt><dd>{formatIQD(paid)}</dd></div>
              {showCost && cost != null && <div className="flex justify-between text-ink-500"><dt>ربح إجمالي تقديري</dt><dd>{formatIQD(o.subtotal - o.discountTotal - cost)}</dd></div>}
            </dl>
          </Card>

          <Card title="سجل الحالات">
            <ol className="space-y-3 border-s-2 border-ink-100 ps-4 text-sm">
              {o.history.map((h) => (
                <li key={h.id}>
                  <p><strong>{ORDER_STATUS_LABELS[h.toStatus]}</strong> <span className="text-xs text-ink-400 tabular">· {formatDateTime(h.createdAt)} · {h.user?.name ?? "النظام"}</span></p>
                  {h.note && <p className="text-ink-500">{h.note}</p>}
                </li>
              ))}
            </ol>
          </Card>

          <Card title="المدفوعات">
            {o.payments.length ? (
              <ul className="mb-4 divide-y divide-ink-100 text-sm">
                {o.payments.map((p) => <li key={p.id} className="flex justify-between py-2"><span>{p.note || "دفعة نقدية"} <span className="text-xs text-ink-400">· {p.user?.name} · {formatDateTime(p.receivedAt)}</span></span><span className={`font-semibold tabular ${p.amount < 0 ? "text-red-600" : ""}`}>{formatIQD(p.amount)}</span></li>)}
              </ul>
            ) : <p className="mb-4 text-sm text-ink-400">لم تُسجّل أي دفعة.</p>}
            <ActionForm action={recordPayment} submitLabel="تسجيل دفعة" submitClass="btn-secondary" className="grid gap-3 sm:grid-cols-3 sm:items-end" resetOnSuccess inline>
              <input type="hidden" name="id" value={o.id} />
              <Field label="المبلغ (سالب للاسترجاع)" name="amount" defaultValue={Math.max(0, o.total - paid) || ""} dir="ltr" />
              <Field label="ملاحظة" name="note" placeholder="استلام نقدي من المندوب" />
            </ActionForm>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="تغيير الحالة">
            {next.length ? (
              <ActionForm action={updateStatus} submitLabel="تحديث الحالة">
                <input type="hidden" name="id" value={o.id} />
                <div>
                  <label className="label" htmlFor="st">الحالة الجديدة</label>
                  <select id="st" name="status" className="input" required>
                    {next.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>)}
                  </select>
                </div>
                <TextArea label="ملاحظة (إلزامية عند الإلغاء — سبب الإلغاء)" name="note" rows={2} />
                <p className="text-xs leading-6 text-ink-500">عند الإلغاء تُعاد الكميات إلى المخزون تلقائياً ويبقى الطلب محفوظاً للتدقيق، ويُستبعد من تقارير المبيعات.</p>
              </ActionForm>
            ) : <p className="text-sm text-ink-500">الطلب في حالة نهائية ({ORDER_STATUS_LABELS[o.status]}).</p>}
          </Card>

          <Card title="الزبون والتوصيل">
            <dl className="space-y-1.5 text-sm">
              <div><dt className="inline text-ink-500">الاسم: </dt><dd className="inline">{o.customerName}</dd></div>
              <div><dt className="inline text-ink-500">الهاتف: </dt><dd className="inline tabular" dir="ltr">{o.phone}</dd></div>
              <div><dt className="inline text-ink-500">العنوان: </dt><dd className="inline">{o.governorate} - {o.area} - {o.address}</dd></div>
              {o.notes && <div><dt className="inline text-ink-500">ملاحظات الزبون: </dt><dd className="inline">{o.notes}</dd></div>}
              <div><Link href={`/admin/customers/${o.customer.id}`} className="text-brand-600 hover:underline">ملف الزبون ({o.customer._count.orders} طلب)</Link></div>
            </dl>
          </Card>

          <Card title="أجرة التوصيل">
            <ActionForm action={updateDeliveryFee} submitLabel="تعديل الأجرة" submitClass="btn-secondary">
              <input type="hidden" name="id" value={o.id} />
              <Field label="أجرة التوصيل (د.ع)" name="deliveryFee" defaultValue={o.deliveryFee} dir="ltr" hint="يُعاد حساب الإجمالي تلقائياً ويُسجل التعديل في سجل الطلب" />
            </ActionForm>
          </Card>

          <Card title="الشحن والملاحظات الداخلية">
            <ActionForm action={updateShipping}>
              <input type="hidden" name="id" value={o.id} />
              <Field label="شركة التوصيل / المندوب" name="shippingCarrier" defaultValue={o.shippingCarrier} />
              <Field label="رقم الشحنة" name="trackingNumber" defaultValue={o.trackingNumber} dir="ltr" />
              <TextArea label="ملاحظة داخلية (لا تظهر للزبون)" name="internalNote" defaultValue={o.internalNote} rows={2} />
            </ActionForm>
          </Card>
        </div>
      </div>
    </>
  );
}
