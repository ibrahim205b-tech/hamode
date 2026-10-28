import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { formatDate, formatDateTime, formatIQD } from "@/lib/format";
import { PAYMENT_STATUS_LABELS, PURCHASE_STATUS_LABELS } from "@/lib/constants";
import { Badge, Card, Field, PageHeader } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { cancelPurchase, purchasePayment, receivePurchase } from "../actions";

export const metadata = { title: "أمر شراء" };

export default async function PurchaseDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff("purchases");
  const { id } = await params;
  const po = await prisma.purchaseOrder.findUnique({ where: { id }, include: { supplier: true, createdBy: { select: { name: true } }, items: { include: { product: { select: { id: true, sku: true, nameAr: true } } } } } });
  if (!po) notFound();
  const open = po.status === "DRAFT" || po.status === "ORDERED";
  return (
    <>
      <PageHeader title={`أمر شراء ${po.number}`} subtitle={<>{po.supplier.name} · {formatDate(po.orderDate)} · <Badge tone={po.status === "RECEIVED" ? "green" : po.status === "CANCELLED" ? "red" : "amber"}>{PURCHASE_STATUS_LABELS[po.status]}</Badge> {po.receivedAt && `· استُلم ${formatDateTime(po.receivedAt)}`}</>} />
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <Card title="البنود">
          <table className="table-admin"><thead><tr><th>المنتج</th><th>SKU</th><th>الكمية</th><th>تكلفة الوحدة</th><th>المجموع</th></tr></thead><tbody>
            {po.items.map((i) => <tr key={i.id}><td><Link href={`/admin/products/${i.product.id}`} className="text-brand-600">{i.product.nameAr}</Link></td><td className="font-mono text-xs" dir="ltr">{i.product.sku}</td><td className="tabular">{i.quantity}</td><td className="tabular">{formatIQD(i.unitCost)}</td><td className="tabular">{formatIQD(i.unitCost * i.quantity)}</td></tr>)}
          </tbody></table>
          <p className="mt-3 text-end font-bold tabular">الإجمالي: {formatIQD(po.total)}</p>
          {po.notes && <p className="mt-2 text-sm text-ink-500">ملاحظات: {po.notes}</p>}
          <p className="mt-2 text-xs text-ink-400">أنشأه: {po.createdBy?.name ?? "—"}</p>
        </Card>
        <div className="space-y-6">
          {open && (
            <Card title="الاستلام">
              <ActionForm action={receivePurchase} submitLabel="استلام البضاعة وإضافتها للمخزون" confirm="تأكيد استلام كل البنود؟ ستُضاف الكميات للمخزون."><input type="hidden" name="id" value={po.id} /></ActionForm>
              <div className="mt-3"><ActionForm action={cancelPurchase} submitLabel="إلغاء أمر الشراء" submitClass="btn-ghost btn-sm text-red-600" confirm="إلغاء؟"><input type="hidden" name="id" value={po.id} /></ActionForm></div>
            </Card>
          )}
          <Card title={`الدفع للمورد — ${PAYMENT_STATUS_LABELS[po.paymentStatus]}`}>
            <ActionForm action={purchasePayment}>
              <input type="hidden" name="id" value={po.id} />
              <Field label="إجمالي المدفوع للمورد (د.ع)" name="amountPaid" defaultValue={po.amountPaid} dir="ltr" />
            </ActionForm>
          </Card>
        </div>
      </div>
    </>
  );
}
