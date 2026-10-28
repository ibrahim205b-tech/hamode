import type { Discount } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { isoDay } from "@/lib/format";
import { Badge, Card, Check, Field, PageHeader, Select } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { saveDiscount } from "./actions";

export const metadata = { title: "أكواد الخصم" };

function DiscountForm({ d }: { d?: Discount }) {
  return (
    <ActionForm action={saveDiscount} submitLabel={d ? "حفظ" : "إنشاء"} className="grid gap-3 md:grid-cols-5 md:items-end" inline resetOnSuccess={!d}>
      {d && <input type="hidden" name="id" value={d.id} />}
      <Field label="الكود" name="code" defaultValue={d?.code} required dir="ltr" />
      <Select label="النوع" name="type" defaultValue={d?.type ?? "PERCENT"} options={[{ value: "PERCENT", label: "نسبة %" }, { value: "FIXED", label: "مبلغ ثابت" }]} />
      <Field label="القيمة" name="value" defaultValue={d?.value} required dir="ltr" />
      <Field label="حد أدنى للمجموع" name="minSubtotal" defaultValue={d?.minSubtotal} dir="ltr" />
      <Field label="أقصى عدد استخدام" name="maxUses" defaultValue={d?.maxUses} dir="ltr" />
      <Field label="يبدأ" name="startsAt" type="date" defaultValue={d?.startsAt ? isoDay(d.startsAt) : ""} />
      <Field label="ينتهي" name="endsAt" type="date" defaultValue={d?.endsAt ? isoDay(d.endsAt) : ""} />
      <Field label="وصف داخلي" name="description" defaultValue={d?.description} className="md:col-span-2" />
      <div className="pb-2"><Check label="مفعّل" name="isActive" defaultChecked={d?.isActive ?? true} /></div>
    </ActionForm>
  );
}

export default async function DiscountsPage() {
  await requireStaff("discounts");
  const rows = await prisma.discount.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <>
      <PageHeader title="أكواد الخصم" subtitle="تُطبق على مجموع المنتجات (بدون التوصيل) ويتم التحقق منها على الخادم" />
      <Card title="كود جديد" className="mb-6"><DiscountForm /></Card>
      <div className="space-y-3">
        {rows.map((d) => (
          <Card key={d.id} title={<span className="font-mono" dir="ltr">{d.code}</span>} actions={<span className="flex gap-2"><Badge tone={d.isActive ? "green" : "gray"}>{d.isActive ? "مفعّل" : "معطل"}</Badge><Badge>استُخدم {d.usedCount}{d.maxUses ? ` / ${d.maxUses}` : ""}</Badge></span>}>
            <DiscountForm d={d} />
          </Card>
        ))}
      </div>
    </>
  );
}
