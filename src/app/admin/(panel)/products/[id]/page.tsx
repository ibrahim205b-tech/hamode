import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { prisma } from "@/lib/db";
import { can, requireStaff } from "@/lib/auth";
import { formatDateTime, formatIQD } from "@/lib/format";
import { COMPAT_LABELS, MOVEMENT_LABELS } from "@/lib/constants";
import { Badge, Card, Field, Notice, PageHeader, Select } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { ProductFields } from "../ProductFields";
import { addCompat, addRelation, compatAction, imageAction, removeRelation, updateProduct, uploadImages } from "../actions";
import { adjustInventory } from "../../inventory/actions";

export const metadata = { title: "تعديل منتج" };

export default async function EditProduct({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const user = await requireStaff("products");
  const { id } = await params;
  const p = await prisma.product.findUnique({
    where: { id },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      compat: { include: { model: { include: { family: { include: { manufacturer: true } } } }, variant: true }, orderBy: { model: { name: "asc" } } },
      relations: { include: { to: { select: { id: true, sku: true, nameAr: true } } } },
      movements: { orderBy: { createdAt: "desc" }, take: 15, include: { user: { select: { name: true } } } },
    },
  });
  if (!p) notFound();
  const allowPricing = can(user, "products.cost");
  const manufacturers = await prisma.manufacturer.findMany({
    orderBy: { sortOrder: "asc" },
    include: { families: { orderBy: { sortOrder: "asc" }, include: { models: { orderBy: { sortOrder: "asc" }, include: { variants: true } } } } },
  });
  const created = (await searchParams).created;

  return (
    <>
      <PageHeader
        title={p.nameAr}
        subtitle={<><span className="font-mono" dir="ltr">{p.sku}</span> · المخزون: <strong className="tabular">{p.stockQty}</strong> · {formatIQD(p.price)} {p.isDemo && <Badge tone="amber">منتج تجريبي</Badge>}</>}
        actions={<Link href={`/product/${p.slug}`} target="_blank" className="btn-secondary btn-sm"><ExternalLink className="h-4 w-4" /> عرض في المتجر</Link>}
      />
      {created && <div className="mb-4"><Notice tone="ok">تم إنشاء المنتج. أضف الصور والأجهزة المتوافقة أدناه.</Notice></div>}
      <div className="grid gap-6 2xl:grid-cols-[1fr_440px]">
        <Card title="بيانات المنتج">
          <ActionForm action={updateProduct} submitLabel="حفظ التعديلات">
            <input type="hidden" name="id" value={p.id} />
            <ProductFields p={p} allowPricing={allowPricing} />
          </ActionForm>
        </Card>

        <div className="space-y-6">
          <Card title={`الصور (${p.images.length})`}>
            <div className="mb-4 grid grid-cols-3 gap-2">
              {p.images.map((im, i) => (
                <div key={im.id} className="group relative aspect-square overflow-hidden rounded-lg border border-ink-100 bg-ink-50">
                  <Image src={`/api/images/${im.uploadId}`} alt={im.alt ?? ""} fill sizes="140px" className="object-contain p-1" />
                  {i === 0 && <span className="absolute start-1 top-1 rounded bg-brand-500 px-1.5 text-[10px] text-white">الرئيسية</span>}
                  <div className="absolute inset-x-1 bottom-1 flex gap-1">
                    {i > 0 && <ActionForm action={imageAction} submitLabel="رئيسية" submitClass="btn btn-sm !px-1.5 !py-0.5 bg-white/90 text-[10px]" className="contents" inline><input type="hidden" name="imageId" value={im.id} /><input type="hidden" name="op" value="first" /></ActionForm>}
                    <ActionForm action={imageAction} submitLabel="حذف" submitClass="btn btn-sm !px-1.5 !py-0.5 bg-red-600 text-[10px] text-white" className="contents" inline confirm="حذف هذه الصورة؟"><input type="hidden" name="imageId" value={im.id} /><input type="hidden" name="op" value="delete" /></ActionForm>
                  </div>
                </div>
              ))}
            </div>
            <ActionForm action={uploadImages} submitLabel="رفع الصور" submitClass="btn-secondary" resetOnSuccess>
              <input type="hidden" name="id" value={p.id} />
              <input type="file" name="images" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="block w-full text-sm" aria-label="اختيار الصور" />
              <p className="text-xs text-ink-400">JPG/PNG/WebP حتى 8 ميغابايت للصورة، تُضغط تلقائياً. الحد 12 صورة.</p>
            </ActionForm>
          </Card>

          <Card title="تعديل المخزون">
            <ActionForm action={adjustInventory} submitLabel="تنفيذ" resetOnSuccess>
              <input type="hidden" name="productId" value={p.id} />
              <div className="grid grid-cols-2 gap-3">
                <Select label="العملية" name="mode" options={[{ value: "in", label: "إدخال (+)" }, { value: "out", label: "إخراج (-)" }, { value: "count", label: "جرد: تحديد الرصيد الفعلي" }]} />
                <Field label="الكمية" name="quantity" dir="ltr" required />
                {allowPricing && <Field label="تكلفة الوحدة (للإدخال)" name="unitCost" dir="ltr" />}
                <Field label="السبب" name="reason" required placeholder="تالف، جرد، إرجاع…" className={allowPricing ? "" : "col-span-2"} />
              </div>
            </ActionForm>
            {p.movements.length > 0 && (
              <ul className="mt-4 divide-y divide-ink-100 text-xs">
                {p.movements.map((m) => (
                  <li key={m.id} className="flex justify-between gap-2 py-1.5">
                    <span>{MOVEMENT_LABELS[m.type]} {m.reference && <span className="font-mono">({m.reference})</span>} · {m.user?.name ?? "النظام"} · <span className="tabular">{formatDateTime(m.createdAt)}</span>{m.reason && <span className="block text-ink-400">{m.reason}</span>}</span>
                    <span className={`shrink-0 font-semibold tabular ${m.quantity > 0 ? "text-green-700" : "text-red-600"}`} dir="ltr">{m.quantity > 0 ? "+" : ""}{m.quantity} → {m.balanceAfter}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title={`الأجهزة المتوافقة (${p.compat.length})`}>
            {p.compat.length > 0 && (
              <ul className="mb-4 divide-y divide-ink-100 text-sm">
                {p.compat.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span><span dir="ltr">{c.model.name}</span>{c.variant && <span className="text-ink-400"> ({c.variant.name})</span>} <span className="text-xs text-ink-400">· {c.model.family.manufacturer.name}</span></span>
                    <span className="flex items-center gap-1">
                      <ActionForm action={compatAction} submitLabel="تغيير" submitClass="btn-ghost btn-sm" className="flex items-center gap-1" inline>
                        <input type="hidden" name="compatId" value={c.id} /><input type="hidden" name="op" value="status" />
                        <select name="status" defaultValue={c.status} className="input !w-auto !py-1 text-xs" aria-label="حالة التوافق">
                          {Object.entries(COMPAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      </ActionForm>
                      <ActionForm action={compatAction} submitLabel="حذف" submitClass="btn-ghost btn-sm text-red-600" className="contents" inline confirm="إزالة هذا التوافق؟">
                        <input type="hidden" name="compatId" value={c.id} /><input type="hidden" name="op" value="delete" />
                      </ActionForm>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <ActionForm action={addCompat} submitLabel="إضافة التوافق" submitClass="btn-secondary">
              <input type="hidden" name="id" value={p.id} />
              <div>
                <label className="label" htmlFor="modelIds">الموديلات (اضغط Ctrl لاختيار أكثر من موديل)</label>
                <select id="modelIds" name="modelIds" multiple size={8} className="input">
                  {manufacturers.map((m) => m.families.map((f) => (
                    <optgroup key={f.id} label={`${m.name} · ${f.name}`}>
                      {f.models.map((mo) => <option key={mo.id} value={mo.id}>{mo.name}</option>)}
                    </optgroup>
                  )))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Select label="حالة التوافق" name="status" defaultValue="UNVERIFIED" options={Object.entries(COMPAT_LABELS).map(([value, label]) => ({ value, label }))} />
                <Select label="نسخة محددة (اختياري، لموديل واحد)" name="variantId" empty="كل النسخ" options={manufacturers.flatMap((m) => m.families.flatMap((f) => f.models.flatMap((mo) => mo.variants.map((v) => ({ value: v.id, label: `${mo.name} — ${v.name}` })))))} />
              </div>
              <Field label="ملاحظة" name="note" />
              <p className="text-xs text-ink-500">لا تفترض أن الموديلات المتشابهة بالاسم تتشارك القطع. استخدم «توافق مؤكد» فقط بعد التحقق الفعلي.</p>
            </ActionForm>
          </Card>

          <Card title="منتجات مرتبطة وبدائل">
            {p.relations.length > 0 && (
              <ul className="mb-4 divide-y divide-ink-100 text-sm">
                {p.relations.map((r) => (
                  <li key={r.id} className="flex items-center justify-between py-2">
                    <span><Badge tone={r.type === "ALTERNATIVE" ? "amber" : "blue"}>{r.type === "ALTERNATIVE" ? "بديل" : "مرتبط"}</Badge> <Link href={`/admin/products/${r.to.id}`} className="hover:underline">{r.to.nameAr}</Link></span>
                    <ActionForm action={removeRelation} submitLabel="حذف" submitClass="btn-ghost btn-sm text-red-600" className="contents" inline><input type="hidden" name="relId" value={r.id} /></ActionForm>
                  </li>
                ))}
              </ul>
            )}
            <ActionForm action={addRelation} submitLabel="إضافة" submitClass="btn-secondary" className="grid grid-cols-2 items-end gap-3" inline resetOnSuccess>
              <input type="hidden" name="id" value={p.id} />
              <Field label="SKU المنتج الآخر" name="sku" dir="ltr" required />
              <Select label="النوع" name="type" options={[{ value: "RELATED", label: "منتج مرتبط" }, { value: "ALTERNATIVE", label: "قطعة بديلة" }]} />
            </ActionForm>
          </Card>
        </div>
      </div>
    </>
  );
}
