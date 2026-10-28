import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { Badge, Card, Check, Field, PageHeader } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { deleteDeviceEntity, saveFamily, saveManufacturer, saveModel } from "../actions";

export const metadata = { title: "شركة مصنعة" };

export default async function ManufacturerAdmin({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff("catalog");
  const { id } = await params;
  const m = await prisma.manufacturer.findUnique({
    where: { id },
    include: { families: { orderBy: { sortOrder: "asc" }, include: { models: { orderBy: { sortOrder: "asc" }, include: { _count: { select: { compat: true, variants: true } } } } } } },
  });
  if (!m) notFound();
  return (
    <>
      <PageHeader title={m.name} subtitle={<Link href="/admin/devices" className="text-brand-600">← كل الشركات</Link>} />
      <Card title="بيانات الشركة" className="mb-6">
        <ActionForm action={saveManufacturer} className="grid gap-3 md:grid-cols-5 md:items-end" inline>
          <input type="hidden" name="id" value={m.id} />
          <Field label="الاسم" name="name" defaultValue={m.name} required dir="ltr" />
          <Field label="بالعربي" name="nameAr" defaultValue={m.nameAr} />
          <Field label="المعرّف" name="slug" defaultValue={m.slug} dir="ltr" />
          <Field label="الترتيب" name="sortOrder" defaultValue={m.sortOrder} dir="ltr" />
          <div className="pb-2"><Check label="مفعّلة" name="isActive" defaultChecked={m.isActive} /></div>
        </ActionForm>
        <div className="mt-3"><ActionForm action={deleteDeviceEntity} submitLabel="حذف الشركة" submitClass="btn-ghost btn-sm text-red-600" confirm="حذف الشركة؟"><input type="hidden" name="kind" value="manufacturer" /><input type="hidden" name="id" value={m.id} /></ActionForm></div>
      </Card>
      <Card title="إضافة سلسلة أجهزة" className="mb-6">
        <ActionForm action={saveFamily} submitLabel="إضافة" className="grid gap-3 md:grid-cols-4 md:items-end" inline resetOnSuccess>
          <input type="hidden" name="manufacturerId" value={m.id} />
          <Field label="اسم السلسلة" name="name" required dir="ltr" placeholder="Galaxy A Series" />
          <Field label="المعرّف" name="slug" dir="ltr" />
          <Field label="الترتيب" name="sortOrder" defaultValue={0} dir="ltr" />
          <div className="pb-2"><Check label="مفعّلة" name="isActive" defaultChecked /></div>
        </ActionForm>
      </Card>
      <div className="space-y-4">
        {m.families.map((f) => (
          <Card key={f.id} title={<span dir="ltr">{f.name}</span>} actions={!f.isActive && <Badge tone="red">معطلة</Badge>}>
            <details className="mb-4">
              <summary className="cursor-pointer text-sm text-brand-600">تعديل السلسلة</summary>
              <div className="mt-3 space-y-2">
                <ActionForm action={saveFamily} className="grid gap-3 md:grid-cols-4 md:items-end" inline>
                  <input type="hidden" name="id" value={f.id} /><input type="hidden" name="manufacturerId" value={m.id} />
                  <Field label="الاسم" name="name" defaultValue={f.name} required dir="ltr" />
                  <Field label="المعرّف" name="slug" defaultValue={f.slug} dir="ltr" />
                  <Field label="الترتيب" name="sortOrder" defaultValue={f.sortOrder} dir="ltr" />
                  <div className="pb-2"><Check label="مفعّلة" name="isActive" defaultChecked={f.isActive} /></div>
                </ActionForm>
                <ActionForm action={deleteDeviceEntity} submitLabel="حذف السلسلة" submitClass="btn-ghost btn-sm text-red-600" confirm="حذف؟"><input type="hidden" name="kind" value="family" /><input type="hidden" name="id" value={f.id} /></ActionForm>
              </div>
            </details>
            <div className="mb-4 flex flex-wrap gap-2">
              {f.models.map((mo) => (
                <Link key={mo.id} href={`/admin/devices/model/${mo.id}`} className={`rounded-lg border px-3 py-1.5 text-sm hover:border-brand-500 ${mo.isActive ? "border-ink-100" : "border-red-200 text-ink-400 line-through"}`} dir="ltr">
                  {mo.name} <span className="text-xs text-ink-400">({mo._count.compat})</span>
                </Link>
              ))}
            </div>
            <ActionForm action={saveModel} submitLabel="إضافة موديل" submitClass="btn-secondary" className="grid gap-3 md:grid-cols-5 md:items-end" inline resetOnSuccess>
              <input type="hidden" name="familyId" value={f.id} />
              <Field label="اسم الموديل" name="name" required dir="ltr" placeholder="Galaxy A55" />
              <Field label="أرقام الموديل" name="modelNumbers" dir="ltr" placeholder="SM-A556B, SM-A556E" />
              <Field label="سنة الإصدار" name="releaseYear" dir="ltr" />
              <Field label="الترتيب" name="sortOrder" defaultValue={0} dir="ltr" />
              <input type="hidden" name="isActive" value="on" />
            </ActionForm>
          </Card>
        ))}
      </div>
    </>
  );
}
