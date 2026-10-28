import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { Card, Field, PageHeader } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { deleteAttribute, saveAttribute } from "./actions";

export const metadata = { title: "أنواع القطع والحالات" };

export default async function AttributesPage() {
  await requireStaff("catalog");
  const [comps, conds] = await Promise.all([
    prisma.componentType.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { products: true } } } }),
    prisma.productCondition.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { products: true } } } }),
  ]);
  return (
    <>
      <PageHeader title="أنواع القطع وحالات المنتج" />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="أنواع القطع (للبحث حسب الجهاز)">
          <div className="space-y-2">
            {comps.map((c) => (
              <div key={c.id} className="flex flex-wrap items-end gap-2 rounded-lg border border-ink-100 p-2">
                <ActionForm action={saveAttribute} submitLabel="حفظ" submitClass="btn-secondary btn-sm" className="flex flex-1 flex-wrap items-end gap-2" inline>
                  <input type="hidden" name="kind" value="component" /><input type="hidden" name="id" value={c.id} />
                  <Field label="بالعربي" name="nameAr" defaultValue={c.nameAr} className="w-36" />
                  <Field label="بالإنجليزي" name="nameEn" defaultValue={c.nameEn} dir="ltr" className="w-36" />
                  <Field label="المعرّف" name="slug" defaultValue={c.slug} dir="ltr" className="w-32" />
                  <Field label="ترتيب" name="sortOrder" defaultValue={c.sortOrder} dir="ltr" className="w-16" />
                </ActionForm>
                <span className="pb-2 text-xs text-ink-400">{c._count.products} منتج</span>
                <ActionForm action={deleteAttribute} submitLabel="حذف" submitClass="btn-ghost btn-sm text-red-600" className="contents" inline confirm="حذف؟"><input type="hidden" name="kind" value="component" /><input type="hidden" name="id" value={c.id} /></ActionForm>
              </div>
            ))}
          </div>
          <h3 className="mb-2 mt-5 text-sm font-semibold">إضافة نوع</h3>
          <ActionForm action={saveAttribute} submitLabel="إضافة" className="flex flex-wrap items-end gap-2" inline resetOnSuccess>
            <input type="hidden" name="kind" value="component" />
            <Field label="بالعربي" name="nameAr" required />
            <Field label="بالإنجليزي" name="nameEn" dir="ltr" />
            <Field label="ترتيب" name="sortOrder" defaultValue={0} dir="ltr" className="w-20" />
          </ActionForm>
        </Card>
        <Card title="حالات المنتج (جديد، مستعمل مفحوص…)">
          <div className="space-y-2">
            {conds.map((c) => (
              <div key={c.id} className="flex flex-wrap items-end gap-2 rounded-lg border border-ink-100 p-2">
                <ActionForm action={saveAttribute} submitLabel="حفظ" submitClass="btn-secondary btn-sm" className="flex flex-1 flex-wrap items-end gap-2" inline>
                  <input type="hidden" name="kind" value="condition" /><input type="hidden" name="id" value={c.id} />
                  <Field label="الاسم" name="nameAr" defaultValue={c.nameAr} className="w-40" />
                  <Field label="الوصف" name="description" defaultValue={c.description} className="w-56" />
                  <Field label="المعرّف" name="slug" defaultValue={c.slug} dir="ltr" className="w-36" />
                  <Field label="ترتيب" name="sortOrder" defaultValue={c.sortOrder} dir="ltr" className="w-16" />
                </ActionForm>
                <span className="pb-2 text-xs text-ink-400">{c._count.products} منتج</span>
                <ActionForm action={deleteAttribute} submitLabel="حذف" submitClass="btn-ghost btn-sm text-red-600" className="contents" inline confirm="حذف؟"><input type="hidden" name="kind" value="condition" /><input type="hidden" name="id" value={c.id} /></ActionForm>
              </div>
            ))}
          </div>
          <h3 className="mb-2 mt-5 text-sm font-semibold">إضافة حالة</h3>
          <ActionForm action={saveAttribute} submitLabel="إضافة" className="flex flex-wrap items-end gap-2" inline resetOnSuccess>
            <input type="hidden" name="kind" value="condition" />
            <Field label="الاسم" name="nameAr" required />
            <Field label="المعرّف (إنجليزي)" name="slug" dir="ltr" />
            <Field label="الوصف" name="description" />
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
