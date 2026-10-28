import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { COMPAT_LABELS } from "@/lib/constants";
import { Badge, Card, Check, Field, PageHeader } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { deleteDeviceEntity, saveModel, saveVariant } from "../../actions";

export const metadata = { title: "موديل" };

export default async function ModelAdmin({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff("catalog");
  const { id } = await params;
  const m = await prisma.deviceModel.findUnique({
    where: { id },
    include: { family: { include: { manufacturer: true } }, variants: true, compat: { include: { product: { select: { id: true, nameAr: true, sku: true } }, variant: true } } },
  });
  if (!m) notFound();
  return (
    <>
      <PageHeader title={m.name} subtitle={<Link href={`/admin/devices/${m.family.manufacturerId}`} className="text-brand-600">← {m.family.manufacturer.name} · {m.family.name}</Link>} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="بيانات الموديل">
          <ActionForm action={saveModel}>
            <input type="hidden" name="id" value={m.id} />
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="الاسم" name="name" defaultValue={m.name} required dir="ltr" />
              <Field label="المعرّف (يظهر في الروابط)" name="slug" defaultValue={m.slug} dir="ltr" />
              <Field label="أرقام الموديل الرسمية" name="modelNumbers" defaultValue={m.modelNumbers} dir="ltr" hint="مفصولة بفواصل — يمكن للزبون البحث بها" />
              <Field label="أسماء بديلة للبحث" name="aliases" defaultValue={m.aliases} hint="مثل: ايفون 13 برو، 13pro" />
              <Field label="سنة الإصدار" name="releaseYear" defaultValue={m.releaseYear} dir="ltr" />
              <Field label="الترتيب" name="sortOrder" defaultValue={m.sortOrder} dir="ltr" />
            </div>
            <Check label="مفعّل (يظهر للزبائن)" name="isActive" defaultChecked={m.isActive} />
          </ActionForm>
          <div className="mt-3"><ActionForm action={deleteDeviceEntity} submitLabel="حذف الموديل" submitClass="btn-ghost btn-sm text-red-600" confirm="حذف الموديل؟"><input type="hidden" name="kind" value="model" /><input type="hidden" name="id" value={m.id} /></ActionForm></div>
        </Card>
        <Card title="النسخ (Variants)">
          <p className="mb-3 text-xs text-ink-500">مثال: نسخة 4G و5G، أو نسخ إقليمية بأرقام موديل مختلفة قد تختلف قطعها.</p>
          <ul className="mb-4 divide-y divide-ink-100 text-sm">
            {m.variants.map((v) => (
              <li key={v.id} className="flex items-center justify-between py-2">
                <span>{v.name} {v.modelNumber && <span className="font-mono text-xs text-ink-400" dir="ltr">({v.modelNumber})</span>}</span>
                <ActionForm action={deleteDeviceEntity} submitLabel="حذف" submitClass="btn-ghost btn-sm text-red-600" className="contents" inline confirm="حذف النسخة وتوافقاتها؟"><input type="hidden" name="kind" value="variant" /><input type="hidden" name="id" value={v.id} /></ActionForm>
              </li>
            ))}
          </ul>
          <ActionForm action={saveVariant} submitLabel="إضافة نسخة" submitClass="btn-secondary" className="grid gap-3 sm:grid-cols-3 sm:items-end" inline resetOnSuccess>
            <input type="hidden" name="modelId" value={m.id} />
            <Field label="اسم النسخة" name="name" required />
            <Field label="رقم الموديل" name="modelNumber" dir="ltr" />
          </ActionForm>
        </Card>
        <Card title={`المنتجات المتوافقة (${m.compat.length})`} className="xl:col-span-2">
          {m.compat.length ? (
            <ul className="divide-y divide-ink-100 text-sm">
              {m.compat.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-2">
                  <Link href={`/admin/products/${c.product.id}`} className="text-brand-600">{c.product.nameAr} <span className="font-mono text-xs text-ink-400" dir="ltr">{c.product.sku}</span></Link>
                  <span className="flex gap-2">{c.variant && <Badge>{c.variant.name}</Badge>}<Badge tone={c.status === "VERIFIED" ? "green" : c.status === "UNVERIFIED" ? "amber" : "gray"}>{COMPAT_LABELS[c.status]}</Badge></span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-ink-400">لا توجد منتجات مرتبطة. اربطها من صفحة المنتج.</p>}
        </Card>
      </div>
    </>
  );
}
