import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { formatDateTime, formatIQD } from "@/lib/format";
import { ORDER_STATUS_LABELS } from "@/lib/constants";
import { toInternationalIraqi, waLink } from "@/lib/whatsapp";
import { Badge, Card, PageHeader, TextArea } from "@/components/admin/ui";
import { STATUS_TONE } from "@/components/admin/status";
import { ActionForm } from "@/components/admin/ActionForm";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { generateResetLink, saveCustomerNotes } from "../actions";

export const metadata = { title: "ملف زبون" };

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff("customers");
  const { id } = await params;
  const c = await prisma.customer.findUnique({ where: { id }, include: { user: { select: { id: true, lastLoginAt: true, isActive: true } }, addresses: true, orders: { orderBy: { createdAt: "desc" }, take: 100 } } });
  if (!c) notFound();
  const delivered = c.orders.filter((o) => o.status === "DELIVERED");
  const wa = toInternationalIraqi(c.phone);
  return (
    <>
      <PageHeader title={c.name} subtitle={<span dir="ltr">{c.phone}</span>} actions={wa && <a href={waLink(wa)} target="_blank" rel="noopener noreferrer" className="btn-whatsapp btn-sm"><WhatsAppIcon className="h-4 w-4" /> واتساب</a>} />
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card title={`الطلبات (${c.orders.length}) — مكتملة: ${formatIQD(delivered.reduce((a, o) => a + o.total, 0))}`}>
          <table className="table-admin"><thead><tr><th>الرقم</th><th>التاريخ</th><th>الحالة</th><th>الإجمالي</th></tr></thead><tbody>
            {c.orders.map((o) => <tr key={o.id}><td><Link href={`/admin/orders/${o.id}`} className="font-mono text-brand-600" dir="ltr">{o.number}</Link></td><td className="text-xs tabular">{formatDateTime(o.createdAt)}</td><td><Badge tone={STATUS_TONE[o.status]}>{ORDER_STATUS_LABELS[o.status]}</Badge></td><td className="tabular">{formatIQD(o.total)}</td></tr>)}
          </tbody></table>
        </Card>
        <div className="space-y-6">
          <Card title="الحساب">
            {c.user ? (
              <>
                <p className="mb-3 text-sm">حساب مسجل · آخر دخول: {c.user.lastLoginAt ? formatDateTime(c.user.lastLoginAt) : "—"}</p>
                <ActionForm action={generateResetLink} submitLabel="توليد رابط إعادة تعيين كلمة المرور" submitClass="btn-secondary btn-sm">
                  <input type="hidden" name="id" value={c.id} />
                  <p className="text-xs leading-6 text-ink-500">تحقق أولاً أن الطلب وارد من نفس رقم الزبون. الرابط صالح ساعة ولمرة واحدة؛ انسخه وأرسله للزبون.</p>
                </ActionForm>
              </>
            ) : <p className="text-sm text-ink-500">زبون ضيف (بدون حساب).</p>}
          </Card>
          <Card title="العناوين">
            {c.addresses.length ? <ul className="space-y-2 text-sm">{c.addresses.map((a) => <li key={a.id}>{a.label && <b>{a.label}: </b>}{a.governorate} - {a.area} - {a.address}</li>)}</ul> : <p className="text-sm text-ink-400">لا توجد عناوين محفوظة.</p>}
          </Card>
          <Card title="ملاحظات داخلية">
            <ActionForm action={saveCustomerNotes}><input type="hidden" name="id" value={c.id} /><TextArea label="ملاحظات" name="notes" defaultValue={c.notes} /></ActionForm>
          </Card>
        </div>
      </div>
    </>
  );
}
