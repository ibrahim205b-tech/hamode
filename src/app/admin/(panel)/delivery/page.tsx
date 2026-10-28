import type { DeliveryMethod, GovernorateRate } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { IRAQ_GOVERNORATES } from "@/lib/constants";
import { Badge, Card, Check, Field, Notice, PageHeader, Select } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { saveDeliveryMethod } from "./actions";

export const metadata = { title: "التوصيل" };

function MethodForm({ m }: { m?: DeliveryMethod & { rates: GovernorateRate[] } }) {
  return (
    <ActionForm action={saveDeliveryMethod} submitLabel={m ? "حفظ" : "إضافة طريقة"}>
      {m && <input type="hidden" name="id" value={m.id} />}
      <div className="grid gap-3 md:grid-cols-4">
        <Field label="الاسم" name="nameAr" defaultValue={m?.nameAr} required />
        <Select label="النوع" name="kind" defaultValue={m?.kind ?? "DELIVERY"} options={[{ value: "DELIVERY", label: "توصيل" }, { value: "PICKUP", label: "استلام من المحل (مجاني)" }]} />
        <Field label="الأجرة الافتراضية (د.ع)" name="baseFee" defaultValue={m?.baseFee ?? 0} dir="ltr" hint="تُستخدم للمحافظات غير المحددة أدناه" />
        <Field label="توصيل مجاني فوق (اختياري)" name="freeOver" defaultValue={m?.freeOver} dir="ltr" />
        <Field label="الوصف للزبون" name="description" defaultValue={m?.description} className="md:col-span-2" />
        <Field label="الترتيب" name="sortOrder" defaultValue={m?.sortOrder ?? 0} dir="ltr" />
        <div className="pt-7"><Check label="مفعّلة" name="isActive" defaultChecked={m?.isActive ?? false} /></div>
      </div>
      <details>
        <summary className="cursor-pointer text-sm text-brand-600">أجور مخصصة حسب المحافظة</summary>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {IRAQ_GOVERNORATES.map((g, i) => <Field key={g} label={g} name={`rate_${i}`} defaultValue={m?.rates.find((r) => r.governorate === g)?.fee} dir="ltr" />)}
        </div>
      </details>
    </ActionForm>
  );
}

export default async function DeliveryPage() {
  await requireStaff("settings");
  const methods = await prisma.deliveryMethod.findMany({ orderBy: { sortOrder: "asc" }, include: { rates: true } });
  const active = methods.filter((m) => m.isActive).length;
  return (
    <>
      <PageHeader title="طرق وأجور التوصيل" />
      {!active && <div className="mb-4"><Notice tone="warn">لا توجد طريقة توصيل مفعّلة. الطلبات ستُقبل وتظهر للزبون عبارة «تُحدد أجرة التوصيل عند التأكيد»، ويمكنك تعديل الأجرة من صفحة الطلب.</Notice></div>}
      <div className="space-y-4">
        {methods.map((m) => <Card key={m.id} title={m.nameAr} actions={<Badge tone={m.isActive ? "green" : "gray"}>{m.isActive ? "مفعّلة" : "معطلة"}</Badge>}><MethodForm m={m} /></Card>)}
        <Card title="طريقة جديدة"><MethodForm /></Card>
      </div>
    </>
  );
}
