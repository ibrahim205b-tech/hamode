import Image from "next/image";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { getSettings, whatsappIntl } from "@/lib/settings";
import { waLink } from "@/lib/whatsapp";
import { Card, Check, Field, Notice, PageHeader, TextArea } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { removeDemoProducts, saveStoreSettings, uploadLogo } from "./actions";

export const metadata = { title: "الإعدادات" };

export default async function SettingsPage() {
  await requireStaff("settings");
  const [s, cats, demoCount] = await Promise.all([
    getSettings(),
    prisma.category.findMany({ where: { parentId: null }, orderBy: { sortOrder: "asc" }, select: { id: true, nameAr: true } }),
    prisma.product.count({ where: { isDemo: true } }),
  ]);
  const wa = whatsappIntl(s);
  return (
    <>
      <PageHeader title="إعدادات المتجر" subtitle="كل التغييرات تُحفظ في قاعدة البيانات وتظهر فوراً في الموقع" />
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card>
          <ActionForm action={saveStoreSettings} submitLabel="حفظ كل الإعدادات" className="space-y-8">
            <fieldset className="grid gap-4 md:grid-cols-2">
              <legend className="mb-2 text-lg font-bold">الهوية والتواصل</legend>
              <Field label="اسم المتجر بالعربي" name="nameAr" defaultValue={s.nameAr} required />
              <Field label="الاسم بالإنجليزي" name="nameEn" defaultValue={s.nameEn} dir="ltr" />
              <Field label="الوصف المختصر" name="tagline" defaultValue={s.tagline} className="md:col-span-2" />
              <Field label="رقم واتساب الرسمي" name="whatsappNumber" defaultValue={s.whatsappNumber} dir="ltr" required hint={`يُستخدم في كل أزرار واتساب. الرابط الحالي: wa.me/${wa}`} />
              <Field label="هاتف الاتصال (اختياري)" name="contactPhone" defaultValue={s.contactPhone} dir="ltr" />
              <Field label="البريد الإلكتروني (اختياري)" name="email" defaultValue={s.email} dir="ltr" />
              <Field label="العنوان (اختياري)" name="address" defaultValue={s.address} />
              <Field label="رابط الخريطة (اختياري)" name="mapUrl" defaultValue={s.mapUrl} dir="ltr" />
              <TextArea label="أوقات العمل (اختياري)" name="workingHours" defaultValue={s.workingHours} rows={2} />
              <p className="text-xs text-ink-500 md:col-span-2">الحقول الفارغة لا تظهر في الموقع.</p>
            </fieldset>

            <fieldset className="grid gap-4 md:grid-cols-3">
              <legend className="mb-2 text-lg font-bold">روابط التواصل الاجتماعي</legend>
              {(["facebook", "instagram", "tiktok", "telegram", "youtube"] as const).map((k) => <Field key={k} label={k} name={k} defaultValue={s.social[k]} dir="ltr" placeholder="https://" />)}
            </fieldset>

            <fieldset className="grid gap-4 md:grid-cols-2">
              <legend className="mb-2 text-lg font-bold">الصفحة الرئيسية</legend>
              <div className="md:col-span-2"><Check label="إظهار شريط الإعلان" name="announcementEnabled" defaultChecked={s.announcement.enabled} /></div>
              <Field label="نص الإعلان" name="announcementText" defaultValue={s.announcement.text} />
              <Field label="رابط الإعلان (اختياري)" name="announcementLink" defaultValue={s.announcement.link} dir="ltr" placeholder="/products?offers=1" />
              <Field label="العنوان الرئيسي" name="heroTitle" defaultValue={s.hero.title} />
              <TextArea label="النص التعريفي" name="heroSubtitle" defaultValue={s.hero.subtitle} rows={2} />
              <div className="md:col-span-2">
                <p className="label">الأقسام المعروضة في الرئيسية (بدون اختيار = كل الأقسام الرئيسية)</p>
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  {cats.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="featuredCategoryIds" value={c.id} defaultChecked={s.featuredCategoryIds.includes(c.id)} className="accent-brand-500" /> {c.nameAr}</label>
                  ))}
                </div>
              </div>
              <div className="md:col-span-2"><Check label="إظهار قسم الفنيين" name="techEnabled" defaultChecked={s.technicians.enabled} /></div>
              <Field label="عنوان قسم الفنيين" name="techTitle" defaultValue={s.technicians.title} />
              <TextArea label="نص قسم الفنيين" name="techText" defaultValue={s.technicians.text} rows={2} />
              <div className="md:col-span-2">
                <p className="label">عناصر الثقة (تظهر فقط إذا كتبتها — اكتب معلومات حقيقية فقط)</p>
                <div className="grid gap-3 md:grid-cols-2">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="grid gap-2 rounded-lg border border-ink-100 p-3">
                      <input name={`trust_title_${i}`} defaultValue={s.trustItems[i]?.title} placeholder="العنوان" className="input" aria-label={`عنوان العنصر ${i + 1}`} />
                      <input name={`trust_text_${i}`} defaultValue={s.trustItems[i]?.text} placeholder="الوصف" className="input" aria-label={`وصف العنصر ${i + 1}`} />
                    </div>
                  ))}
                </div>
              </div>
            </fieldset>

            <fieldset className="grid gap-4 md:grid-cols-3">
              <legend className="mb-2 text-lg font-bold">الطلبات والمخزون</legend>
              <Check label="استقبال الطلبات (الدفع عند الاستلام)" name="codEnabled" defaultChecked={s.order.codEnabled} />
              <Check label="إظهار الكمية المتوفرة للزبائن" name="showStockQty" defaultChecked={s.inventory.showStockQty} />
              <Check label="إظهار المنتجات التجريبية" name="showDemoProducts" defaultChecked={s.showDemoProducts} />
              <Field label="الحد الأدنى للطلب (د.ع)" name="minOrderTotal" defaultValue={s.order.minOrderTotal} dir="ltr" />
              <Field label="أقصى كمية للمنتج في الطلب" name="maxQtyPerItem" defaultValue={s.order.maxQtyPerItem} dir="ltr" />
              <Field label="حد المخزون المنخفض الافتراضي" name="defaultLowStock" defaultValue={s.inventory.defaultLowStock} dir="ltr" />
              <TextArea label="ملاحظة في صفحة إتمام الطلب" name="checkoutNote" defaultValue={s.order.checkoutNote} rows={2} className="md:col-span-3" />
            </fieldset>

            <fieldset className="grid gap-4 md:grid-cols-2">
              <legend className="mb-2 text-lg font-bold">الفاتورة</legend>
              <Field label="نص أسفل الفاتورة" name="invoiceFooter" defaultValue={s.invoice.footerText} />
              <TextArea label="ملاحظة الضمان في الفاتورة" name="invoiceWarranty" defaultValue={s.invoice.warrantyNote} rows={2} />
              <Check label="إظهار الشعار في الفاتورة" name="invoiceLogo" defaultChecked={s.invoice.showLogo} />
            </fieldset>

            <fieldset className="grid gap-4 md:grid-cols-2">
              <legend className="mb-2 text-lg font-bold">السياسات (تظهر صفحة كل سياسة فقط إذا كُتبت)</legend>
              <TextArea label="سياسة التوصيل" name="p_shipping" defaultValue={s.policies.shipping} rows={4} />
              <TextArea label="الاستبدال والإرجاع" name="p_returns" defaultValue={s.policies.returns} rows={4} />
              <TextArea label="الضمان" name="p_warranty" defaultValue={s.policies.warranty} rows={4} />
              <TextArea label="الخصوصية" name="p_privacy" defaultValue={s.policies.privacy} rows={4} />
              <TextArea label="الشروط والأحكام" name="p_terms" defaultValue={s.policies.terms} rows={4} />
            </fieldset>

            <fieldset className="grid gap-4 md:grid-cols-2">
              <legend className="mb-2 text-lg font-bold">محركات البحث والبحث الداخلي</legend>
              <Field label="عنوان الموقع لمحركات البحث" name="seoTitle" defaultValue={s.seo.title} />
              <Field label="الكلمات المفتاحية" name="seoKeywords" defaultValue={s.seo.keywords} />
              <TextArea label="وصف الموقع لمحركات البحث" name="seoDescription" defaultValue={s.seo.description} rows={2} />
              <TextArea label="مرادفات البحث (سطر لكل مجموعة: كلمة = مرادف، مرادف)" name="synonyms" defaultValue={s.search.synonyms} rows={3} placeholder={"بازر = سماعه خارجيه، loudspeaker\nسوكت = منفذ شحن"} />
            </fieldset>
          </ActionForm>
        </Card>

        <div className="space-y-6">
          <Card title="اختبار واتساب">
            <p className="mb-3 text-sm">كل الأزرار في الموقع تستخدم: <b dir="ltr">wa.me/{wa}</b></p>
            <a href={waLink(wa, "رسالة اختبار من لوحة التحكم")} target="_blank" rel="noopener noreferrer" className="btn-whatsapp btn-sm">فتح رابط اختبار</a>
          </Card>
          <Card title="شعار مخصص (اختياري)">
            {s.logoUploadId ? <div className="relative mb-3 h-20 w-20 rounded bg-ink-900"><Image src={`/api/images/${s.logoUploadId}`} alt="الشعار" fill className="object-contain p-1" /></div> : <p className="mb-3 text-sm text-ink-500">يُستخدم الشعار الافتراضي المصمم للمتجر.</p>}
            <ActionForm action={uploadLogo} submitLabel="رفع" submitClass="btn-secondary btn-sm">
              <input type="file" name="logo" accept="image/png,image/webp,image/jpeg" className="block w-full text-sm" aria-label="ملف الشعار" />
            </ActionForm>
            {s.logoUploadId && <div className="mt-2"><ActionForm action={uploadLogo} submitLabel="العودة للشعار الافتراضي" submitClass="btn-ghost btn-sm"><input type="hidden" name="remove" value="1" /></ActionForm></div>}
          </Card>
          <Card title="البيانات التجريبية">
            {demoCount ? (
              <>
                <Notice tone="warn">يوجد {demoCount} منتج تجريبي. احذفها عند إضافة منتجاتك الحقيقية.</Notice>
                <div className="mt-3"><ActionForm action={removeDemoProducts} submitLabel="حذف كل المنتجات التجريبية" submitClass="btn-danger btn-sm" confirm="حذف كل المنتجات التجريبية؟ لا يمكن التراجع." /></div>
              </>
            ) : <p className="text-sm text-ink-500">لا توجد منتجات تجريبية.</p>}
          </Card>
        </div>
      </div>
    </>
  );
}
