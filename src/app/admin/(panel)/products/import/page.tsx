import { requireStaff } from "@/lib/auth";
import { PRODUCT_CSV_COLUMNS } from "@/lib/product-csv";
import { Card, Check, Notice, PageHeader } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { Download } from "lucide-react";
import { importCsv } from "./actions";

export const metadata = { title: "استيراد وتصدير المخزون" };

export default async function ImportPage() {
  await requireStaff("products");
  return (
    <>
      <PageHeader title="استيراد وتصدير المنتجات (CSV / Excel)" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="تصدير">
          <p className="mb-4 text-sm leading-7 text-ink-600">ملف CSV بترميز UTF-8 يفتح مباشرة في Excel بالعربية. يمكنك تعديله ثم إعادة استيراده لتحديث الأسعار والكميات بالجملة.</p>
          <div className="flex flex-wrap gap-2">
            <a href="/admin/export/products" className="btn-primary"><Download className="h-4 w-4" /> تصدير كل المنتجات</a>
            <a href="/admin/export/products?template=1" className="btn-secondary"><Download className="h-4 w-4" /> قالب فارغ</a>
            <a href="/admin/export/catalog-reference" className="btn-secondary"><Download className="h-4 w-4" /> مرجع الأقسام والموديلات</a>
          </div>
        </Card>
        <Card title="استيراد">
          <ActionForm action={importCsv} submitLabel="رفع ومعالجة">
            <input type="file" name="file" accept=".csv,text/csv" required className="block w-full text-sm" aria-label="ملف CSV" />
            <Check label="فحص فقط بدون حفظ (موصى به أولاً)" name="dryRun" defaultChecked />
          </ActionForm>
          <div className="mt-4"><Notice tone="info">
            يتم التحقق من كل الأسطر أولاً — إذا وُجد خطأ واحد لا يُطبق أي تغيير. المنتجات تُطابق حسب SKU: الموجود يُحدّث والجديد يُنشأ. عمود stockQty يحدد الرصيد الجديد ويُسجل الفرق كحركة مخزون «استيراد».
          </Notice></div>
        </Card>
      </div>
      <Card title="أعمدة الملف" className="mt-6">
        <ul className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {PRODUCT_CSV_COLUMNS.map((c) => <li key={c}><code className="rounded bg-ink-100 px-1.5 font-mono text-xs" dir="ltr">{c}</code></li>)}
        </ul>
        <ul className="mt-4 list-disc space-y-1 ps-5 text-sm leading-7 text-ink-600">
          <li><b>category / componentType / condition</b>: تُكتب بالمعرّف (slug) — راجع ملف «مرجع الأقسام والموديلات».</li>
          <li><b>الأسعار</b>: أرقام صحيحة بالدينار بدون فواصل أو بفواصل آلاف.</li>
          <li><b>status</b>: ACTIVE (منشور) أو DRAFT (مسودة) أو ARCHIVED.</li>
          <li><b>compatibleModels</b>: معرّفات الموديلات مفصولة بـ | مع الحالة اختيارياً، مثال: <code dir="ltr" className="font-mono">iphone-13-pro:VERIFIED|iphone-13:UNKNOWN</code></li>
        </ul>
      </Card>
    </>
  );
}
