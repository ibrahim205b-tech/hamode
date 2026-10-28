import Link from "next/link";
import Image from "next/image";
import type { Prisma, ProductStatus } from "@prisma/client";
import { Plus, Upload } from "lucide-react";
import { prisma } from "@/lib/db";
import { can, requireStaff } from "@/lib/auth";
import { formatIQD } from "@/lib/format";
import { searchWhere } from "@/lib/search";
import { Badge, EmptyRow, PageHeader, Pager, Table } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { reindexAllAction } from "./actions";

export const metadata = { title: "المنتجات" };
const PER = 40;

export default async function ProductsAdmin({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; category?: string; demo?: string; page?: string }> }) {
  const user = await requireStaff("products");
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page || "1") || 1);
  const and: Prisma.ProductWhereInput[] = [];
  if (sp.q) {
    const sw = await searchWhere(sp.q);
    and.push({ OR: [{ sku: { contains: sp.q.toUpperCase() } }, { barcode: sp.q }, ...(sw ? [sw] : [])] });
  }
  if (sp.status && ["ACTIVE", "DRAFT", "ARCHIVED"].includes(sp.status)) and.push({ status: sp.status as ProductStatus });
  if (sp.category) and.push({ OR: [{ categoryId: sp.category }, { category: { parentId: sp.category } }] });
  if (sp.demo === "1") and.push({ isDemo: true });
  const where = { AND: and };
  const [items, total, cats] = await Promise.all([
    prisma.product.findMany({ where, orderBy: { updatedAt: "desc" }, skip: (page - 1) * PER, take: PER, include: { category: { select: { nameAr: true } }, images: { take: 1, orderBy: { sortOrder: "asc" } }, _count: { select: { compat: true } } } }),
    prisma.product.count({ where }),
    prisma.category.findMany({ where: { parentId: null }, orderBy: { sortOrder: "asc" }, select: { id: true, nameAr: true } }),
  ]);
  const href = (p: number) => `/admin/products?${new URLSearchParams(Object.entries({ ...sp, page: String(p) }).filter(([, v]) => v) as [string, string][])}`;
  const showCost = can(user, "products.cost");
  return (
    <>
      <PageHeader
        title="المنتجات"
        subtitle={`${total} منتج`}
        actions={
          <>
            {showCost && <Link href="/admin/products/new" className="btn-primary btn-sm"><Plus className="h-4 w-4" /> منتج جديد</Link>}
            <Link href="/admin/products/import" className="btn-secondary btn-sm"><Upload className="h-4 w-4" /> استيراد / تصدير</Link>
            {can(user, "catalog") && <ActionForm action={reindexAllAction} submitLabel="إعادة فهرسة البحث" submitClass="btn-ghost btn-sm" className="flex items-center gap-2" inline />}
          </>
        }
      />
      <form className="card mb-4 grid gap-3 p-4 sm:grid-cols-4">
        <input name="q" defaultValue={sp.q} placeholder="الاسم، SKU، الباركود، الموديل…" className="input sm:col-span-2" aria-label="بحث" />
        <select name="category" defaultValue={sp.category ?? ""} className="input" aria-label="القسم"><option value="">كل الأقسام</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.nameAr}</option>)}</select>
        <div className="flex gap-2">
          <select name="status" defaultValue={sp.status ?? ""} className="input" aria-label="الحالة"><option value="">كل الحالات</option><option value="ACTIVE">منشور</option><option value="DRAFT">مسودة</option><option value="ARCHIVED">مؤرشف</option></select>
          <button className="btn-primary">بحث</button>
        </div>
      </form>
      <Table>
        <thead><tr><th></th><th>المنتج</th><th>SKU</th><th>القسم</th><th>السعر</th>{showCost && <th>التكلفة</th>}<th>المخزون</th><th>التوافق</th><th>الحالة</th></tr></thead>
        <tbody>
          {items.length ? items.map((p) => (
            <tr key={p.id}>
              <td className="w-12">{p.images[0] ? <span className="relative block h-10 w-10 overflow-hidden rounded bg-ink-50"><Image src={`/api/images/${p.images[0].uploadId}`} alt="" fill sizes="40px" className="object-contain" /></span> : <span className="block h-10 w-10 rounded bg-ink-100" />}</td>
              <td><Link href={`/admin/products/${p.id}`} className="font-medium text-brand-600 hover:underline">{p.nameAr}</Link> {p.isDemo && <Badge tone="amber">تجريبي</Badge>}</td>
              <td className="font-mono text-xs" dir="ltr">{p.sku}</td>
              <td className="text-xs">{p.category.nameAr}</td>
              <td className="whitespace-nowrap tabular">{formatIQD(p.price)}</td>
              {showCost && <td className="whitespace-nowrap tabular text-ink-500">{p.costPrice != null ? formatIQD(p.costPrice) : "—"}</td>}
              <td><Badge tone={p.stockQty === 0 ? "red" : p.stockQty <= (p.lowStockThreshold ?? 3) ? "amber" : "green"}>{p.stockQty}</Badge></td>
              <td className="tabular">{p._count.compat}</td>
              <td><Badge tone={p.status === "ACTIVE" ? "green" : "gray"}>{p.status === "ACTIVE" ? "منشور" : p.status === "DRAFT" ? "مسودة" : "مؤرشف"}</Badge></td>
            </tr>
          )) : <EmptyRow cols={9} text="لا توجد منتجات" />}
        </tbody>
      </Table>
      <Pager page={page} pages={Math.ceil(total / PER)} href={href} />
    </>
  );
}
