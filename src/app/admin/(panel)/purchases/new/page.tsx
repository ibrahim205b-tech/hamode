import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { isoDay } from "@/lib/format";
import { Card, Field, PageHeader, Select, TextArea } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { createPurchase } from "../actions";
import { LinesEditor } from "../LinesEditor";

export const metadata = { title: "أمر شراء جديد" };

export default async function NewPurchase() {
  await requireStaff("purchases");
  const suppliers = await prisma.supplier.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
  return (
    <>
      <PageHeader title="أمر شراء جديد" />
      <Card>
        {suppliers.length ? (
          <ActionForm action={createPurchase} submitLabel="حفظ أمر الشراء">
            <div className="grid gap-3 md:grid-cols-3">
              <Select label="المورد" name="supplierId" required empty="اختر…" options={suppliers.map((s) => ({ value: s.id, label: s.name }))} />
              <Field label="تاريخ الشراء" name="orderDate" type="date" defaultValue={isoDay(new Date())} />
              <TextArea label="ملاحظات" name="notes" rows={1} />
            </div>
            <LinesEditor />
            <p className="text-xs text-ink-500">لن يتغير المخزون حتى تضغط «استلام البضاعة» في صفحة أمر الشراء.</p>
          </ActionForm>
        ) : <p className="text-sm">أضف مورداً أولاً من صفحة الموردين.</p>}
      </Card>
    </>
  );
}
