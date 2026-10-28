import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { Badge, Card, Check, Field, PageHeader } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { saveManufacturer } from "./actions";

export const metadata = { title: "الأجهزة والتوافق" };

export default async function DevicesAdmin() {
  await requireStaff("catalog");
  const mans = await prisma.manufacturer.findMany({ orderBy: { sortOrder: "asc" }, include: { families: { include: { _count: { select: { models: true } } } } } });
  return (
    <>
      <PageHeader title="الأجهزة والتوافق" subtitle="الشركة ← السلسلة ← الموديل ← النسخة. التوافق يُربط من صفحة كل منتج أو موديل." />
      <Card title="إضافة شركة مصنعة" className="mb-6">
        <ActionForm action={saveManufacturer} submitLabel="إضافة" className="grid gap-3 md:grid-cols-5 md:items-end" inline resetOnSuccess>
          <Field label="الاسم (إنجليزي)" name="name" required dir="ltr" />
          <Field label="الاسم بالعربي" name="nameAr" />
          <Field label="المعرّف" name="slug" dir="ltr" />
          <Field label="الترتيب" name="sortOrder" defaultValue={0} dir="ltr" />
          <div className="pb-2"><Check label="مفعّلة" name="isActive" defaultChecked /></div>
        </ActionForm>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {mans.map((m) => (
          <Link key={m.id} href={`/admin/devices/${m.id}`} className="card p-4 transition hover:shadow-md">
            <p className="font-bold" dir="ltr">{m.name}</p>
            <p className="mt-1 text-xs text-ink-500">{m.families.length} سلسلة · {m.families.reduce((a, f) => a + f._count.models, 0)} موديل</p>
            {!m.isActive && <Badge tone="red">معطلة</Badge>}
          </Link>
        ))}
      </div>
    </>
  );
}
