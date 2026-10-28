import type { Product } from "@prisma/client";
import { prisma } from "@/lib/db";
import { Check, Field, Select, TextArea } from "@/components/admin/ui";

export async function ProductFields({ p, allowPricing, isNew }: { p?: Product | null; allowPricing: boolean; isNew?: boolean }) {
  const [cats, comps, conds] = await Promise.all([
    prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }], include: { parent: { select: { nameAr: true, sortOrder: true } } } }),
    prisma.componentType.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.productCondition.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  const catOptions = cats
    .filter((c) => !c.parentId)
    .flatMap((top) => [
      { value: top.id, label: `${top.nameAr} (القسم الرئيسي)`, group: top.nameAr },
      ...cats.filter((c) => c.parentId === top.id).map((c) => ({ value: c.id, label: c.nameAr, group: top.nameAr })),
    ]);
  const specsText = Array.isArray(p?.specs) ? (p!.specs as { label: string; value: string }[]).map((s) => `${s.label}: ${s.value}`).join("\n") : "";
  return (
    <div className="space-y-6">
      <fieldset className="grid gap-4 md:grid-cols-2">
        <legend className="mb-2 font-bold">المعلومات الأساسية</legend>
        <Field label="اسم المنتج بالعربي" name="nameAr" defaultValue={p?.nameAr} required />
        <Field label="الاسم بالإنجليزي (اختياري)" name="nameEn" defaultValue={p?.nameEn} dir="ltr" />
        <Field label="رمز المنتج SKU" name="sku" defaultValue={p?.sku} required dir="ltr" hint="فريد لكل منتج، مثال: SCR-IP13P-OLED" />
        <Field label="الباركود (اختياري)" name="barcode" defaultValue={p?.barcode} dir="ltr" />
        <Field label="رابط المنتج (slug)" name="slug" defaultValue={p?.slug} dir="ltr" hint={isNew ? "اتركه فارغاً ليُولّد تلقائياً" : "تغييره يغيّر رابط صفحة المنتج"} />
        <Select label="الحالة في المتجر" name="status" defaultValue={p?.status ?? "ACTIVE"} options={[{ value: "ACTIVE", label: "منشور" }, { value: "DRAFT", label: "مسودة (مخفي)" }, { value: "ARCHIVED", label: "مؤرشف (مخفي)" }]} />
        <Select label="القسم" name="categoryId" defaultValue={p?.categoryId} options={catOptions} required empty="اختر القسم…" />
        <Select label="نوع القطعة" name="componentTypeId" defaultValue={p?.componentTypeId} options={comps.map((c) => ({ value: c.id, label: c.nameAr }))} empty="— بدون —" />
        <Select label="حالة المنتج" name="conditionId" defaultValue={p?.conditionId} options={conds.map((c) => ({ value: c.id, label: c.nameAr }))} empty="— بدون —" />
        <Field label="درجة الجودة" name="qualityGrade" defaultValue={p?.qualityGrade} placeholder="مثال: درجة أولى / Service Pack" hint="لا تكتب «أصلي» إلا إذا تحققت من ذلك" />
        <Field label="الشركة المصنعة للقطعة" name="partBrand" defaultValue={p?.partBrand} />
        <Field label="أرقام القطعة (Part numbers)" name="partNumbers" defaultValue={p?.partNumbers} dir="ltr" />
        <div className="flex flex-wrap gap-6 md:col-span-2">
          <Check label="منتج مميز (يظهر في الرئيسية)" name="isFeatured" defaultChecked={p?.isFeatured} />
          <Check label="مخصص للفنيين" name="technicianOnly" defaultChecked={p?.technicianOnly} />
        </div>
      </fieldset>

      <fieldset className="grid gap-4 md:grid-cols-3">
        <legend className="mb-2 font-bold">الأسعار (دينار عراقي)</legend>
        {!allowPricing && <p className="text-sm text-amber-700 md:col-span-3">تعديل الأسعار والتكلفة يتطلب صلاحية مدير. القيم الحالية معروضة للقراءة فقط.</p>}
        {allowPricing ? (
          <>
            <Field label="سعر البيع" name="price" defaultValue={p?.price} required dir="ltr" />
            <Field label="السعر السابق (للخصم الحقيقي فقط)" name="compareAtPrice" defaultValue={p?.compareAtPrice} dir="ltr" />
            <Field label="سعر التكلفة (سري)" name="costPrice" defaultValue={p?.costPrice} dir="ltr" hint="لا يظهر للزبائن — يُستخدم لحساب الربح" />
            <Field label="سعر الجملة" name="wholesalePrice" defaultValue={p?.wholesalePrice} dir="ltr" />
            <Field label="أقل كمية لسعر الجملة" name="wholesaleMinQty" defaultValue={p?.wholesaleMinQty} dir="ltr" />
          </>
        ) : (
          <p className="text-sm md:col-span-3">سعر البيع: <strong className="tabular">{p?.price?.toLocaleString("en-US")}</strong></p>
        )}
      </fieldset>

      <fieldset className="grid gap-4 md:grid-cols-3">
        <legend className="mb-2 font-bold">المخزون</legend>
        {isNew ? <Field label="الكمية الافتتاحية" name="initialStock" defaultValue={0} dir="ltr" hint="تُسجل كحركة إدخال مخزون" /> : <p className="text-sm text-ink-500 md:col-span-1">الرصيد الحالي: <strong className="tabular text-ink-900">{p?.stockQty}</strong> — يُعدّل من قسم «تعديل المخزون» أدناه لضمان التسجيل.</p>}
        <Field label="حد التنبيه للمخزون المنخفض" name="lowStockThreshold" defaultValue={p?.lowStockThreshold} dir="ltr" hint="فارغ = القيمة العامة من الإعدادات" />
      </fieldset>

      <fieldset className="grid gap-4 md:grid-cols-2">
        <legend className="mb-2 font-bold">الوصف والملاحظات</legend>
        <TextArea label="الوصف" name="descriptionAr" defaultValue={p?.descriptionAr} rows={4} className="md:col-span-2" />
        <TextArea label="المواصفات الفنية (سطر لكل مواصفة: الاسم: القيمة)" name="specs" defaultValue={specsText} rows={4} placeholder={"نوع اللوحة: OLED\nالحجم: 6.1 إنش"} />
        <TextArea label="ملاحظات التركيب" name="installationNotes" defaultValue={p?.installationNotes} rows={4} />
        <TextArea label="تحذير التوافق (يظهر بشكل بارز)" name="compatibilityNote" defaultValue={p?.compatibilityNote} rows={2} />
        <TextArea label="معلومات الضمان" name="warrantyText" defaultValue={p?.warrantyText} rows={2} hint="اتركه فارغاً إذا لا يوجد ضمان" />
        <TextArea label="ملاحظة التوصيل" name="deliveryNote" defaultValue={p?.deliveryNote} rows={2} />
        <TextArea label="كلمات بحث إضافية" name="searchAliases" defaultValue={p?.searchAliases} rows={2} hint="أسماء شائعة يبحث بها الزبائن، مثل: شاشه ايفون 13 برو، lcd 13pro" />
      </fieldset>
    </div>
  );
}
