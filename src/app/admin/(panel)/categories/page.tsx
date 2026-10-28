import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { Badge, Card, Check, Field, PageHeader, Select } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { ICON_KEYS } from "@/components/ui/icons";
import { deleteCategory, saveCategory } from "./actions";
import type { Category } from "@prisma/client";

export const metadata = { title: "الأقسام" };

function CategoryForm({ c, parents }: { c?: Category; parents: Category[] }) {
  return (
    <ActionForm action={saveCategory} submitLabel={c ? "حفظ" : "إضافة قسم"} className="grid gap-3 md:grid-cols-4 md:items-end" inline>
      {c && <input type="hidden" name="id" value={c.id} />}
      <Field label="الاسم بالعربي" name="nameAr" defaultValue={c?.nameAr} required />
      <Field label="الاسم بالإنجليزي" name="nameEn" defaultValue={c?.nameEn} dir="ltr" />
      <Field label="المعرّف (slug)" name="slug" defaultValue={c?.slug} dir="ltr" />
      <Select label="القسم الأب" name="parentId" defaultValue={c?.parentId} empty="— قسم رئيسي —" options={parents.filter((p) => p.id !== c?.id).map((p) => ({ value: p.id, label: p.nameAr }))} />
      <Select label="الأيقونة" name="icon" defaultValue={c?.icon} empty="افتراضية" options={ICON_KEYS.map((k) => ({ value: k, label: k }))} />
      <Field label="الترتيب" name="sortOrder" defaultValue={c?.sortOrder ?? 0} dir="ltr" />
      <Field label="الوصف" name="description" defaultValue={c?.description} />
      <div className="flex gap-4 pb-2"><Check label="مفعّل" name="isActive" defaultChecked={c?.isActive ?? true} /><Check label="مميز" name="isFeatured" defaultChecked={c?.isFeatured} /></div>
    </ActionForm>
  );
}

export default async function CategoriesPage() {
  await requireStaff("catalog");
  const all = await prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { nameAr: "asc" }], include: { _count: { select: { products: true } } } });
  const tops = all.filter((c) => !c.parentId);
  return (
    <>
      <PageHeader title="الأقسام" subtitle="قسم رئيسي ← أقسام فرعية. الترتيب الأصغر يظهر أولاً." />
      <Card title="قسم جديد" className="mb-6"><CategoryForm parents={tops} /></Card>
      <div className="space-y-3">
        {tops.map((t) => (
          <details key={t.id} className="card p-4">
            <summary className="flex cursor-pointer flex-wrap items-center gap-2 font-semibold">
              {t.nameAr} <span className="text-xs font-normal text-ink-400" dir="ltr">/{t.slug}</span>
              <Badge>{all.filter((c) => c.parentId === t.id).length} فرعي</Badge>
              <Badge tone="blue">{t._count.products} منتج مباشر</Badge>
              {!t.isActive && <Badge tone="red">معطل</Badge>}
            </summary>
            <div className="mt-4 space-y-4">
              <CategoryForm c={t} parents={tops} />
              <ActionForm action={deleteCategory} submitLabel="حذف القسم" submitClass="btn-ghost btn-sm text-red-600" confirm="حذف هذا القسم نهائياً؟"><input type="hidden" name="id" value={t.id} /></ActionForm>
              <div className="space-y-3 border-s-2 border-ink-100 ps-4">
                {all.filter((c) => c.parentId === t.id).map((c) => (
                  <details key={c.id} className="rounded-lg border border-ink-100 p-3">
                    <summary className="cursor-pointer text-sm">{c.nameAr} <span className="text-xs text-ink-400">· {c._count.products} منتج {!c.isActive && "· معطل"}</span></summary>
                    <div className="mt-3 space-y-2">
                      <CategoryForm c={c} parents={tops} />
                      <ActionForm action={deleteCategory} submitLabel="حذف" submitClass="btn-ghost btn-sm text-red-600" confirm="حذف هذا القسم؟"><input type="hidden" name="id" value={c.id} /></ActionForm>
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </details>
        ))}
      </div>
    </>
  );
}
