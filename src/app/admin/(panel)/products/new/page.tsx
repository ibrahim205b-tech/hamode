import { requireStaff } from "@/lib/auth";
import { Card, PageHeader } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { ProductFields } from "../ProductFields";
import { createProduct } from "../actions";

export const metadata = { title: "منتج جديد" };

export default async function NewProduct() {
  await requireStaff("products.cost");
  return (
    <>
      <PageHeader title="إضافة منتج جديد" subtitle="بعد الحفظ يمكنك رفع الصور وربط الأجهزة المتوافقة" />
      <Card>
        <ActionForm action={createProduct} submitLabel="حفظ المنتج">
          <ProductFields allowPricing isNew />
        </ActionForm>
      </Card>
    </>
  );
}
