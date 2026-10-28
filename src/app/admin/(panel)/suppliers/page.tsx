import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { formatIQD } from "@/lib/format";
import { Badge, Card, Check, Field, PageHeader, TextArea } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { saveSupplier } from "./actions";

export const metadata = { title: "الموردون" };

export default async function SuppliersPage() {
  await requireStaff("suppliers");
  const suppliers = await prisma.supplier.findMany({ orderBy: { name: "asc" }, include: { purchases: { where: { status: "RECEIVED" }, select: { total: true, amountPaid: true } }, _count: { select: { purchases: true } } } });
  return (
    <>
      <PageHeader title="الموردون" actions={<Link href="/admin/purchases/new" className="btn-primary btn-sm">أمر شراء جديد</Link>} />
      <Card title="مورد جديد" className="mb-6">
        <ActionForm action={saveSupplier} submitLabel="إضافة" className="grid gap-3 md:grid-cols-4 md:items-end" inline resetOnSuccess>
          <Field label="الاسم" name="name" required />
          <Field label="الهاتف" name="phone" dir="ltr" />
          <Field label="اسم المسؤول" name="contactName" />
          <Field label="العنوان" name="address" />
        </ActionForm>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        {suppliers.map((s) => {
          const total = s.purchases.reduce((a, p) => a + p.total, 0);
          const paid = s.purchases.reduce((a, p) => a + p.amountPaid, 0);
          return (
            <Card key={s.id} title={s.name} actions={!s.isActive && <Badge tone="red">غير نشط</Badge>}>
              <p className="mb-3 text-sm text-ink-600">{s._count.purchases} أمر شراء · مشتريات مستلمة {formatIQD(total)} · مستحق {formatIQD(total - paid)} · <Link href={`/admin/purchases?supplier=${s.id}`} className="text-brand-600">السجل</Link></p>
              <details>
                <summary className="cursor-pointer text-sm text-brand-600">تعديل</summary>
                <ActionForm action={saveSupplier} className="mt-3 grid gap-3 md:grid-cols-2">
                  <input type="hidden" name="id" value={s.id} />
                  <Field label="الاسم" name="name" defaultValue={s.name} required />
                  <Field label="الهاتف" name="phone" defaultValue={s.phone} dir="ltr" />
                  <Field label="اسم المسؤول" name="contactName" defaultValue={s.contactName} />
                  <Field label="العنوان" name="address" defaultValue={s.address} />
                  <TextArea label="ملاحظات" name="notes" defaultValue={s.notes} className="md:col-span-2" />
                  <Check label="نشط" name="isActive" defaultChecked={s.isActive} />
                </ActionForm>
              </details>
            </Card>
          );
        })}
      </div>
    </>
  );
}
