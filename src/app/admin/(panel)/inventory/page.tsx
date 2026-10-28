import Link from "next/link";
import type { MovementType, Prisma } from "@prisma/client";
import { Download } from "lucide-react";
import { prisma } from "@/lib/db";
import { can, requireStaff } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { formatDateTime, formatIQD } from "@/lib/format";
import { MOVEMENT_LABELS } from "@/lib/constants";
import { inventoryValuation, lowStockList } from "@/lib/reports";
import { Badge, Card, EmptyRow, Field, PageHeader, Pager, Select, Stat, Table } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { adjustInventory } from "./actions";

export const metadata = { title: "المخزون" };
const PER = 50;

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ sku?: string; type?: string; low?: string; page?: string }> }) {
  const user = await requireStaff("inventory");
  const sp = await searchParams;
  const s = await getSettings();
  const page = Math.max(1, parseInt(sp.page || "1") || 1);
  const where: Prisma.InventoryMovementWhereInput = {};
  if (sp.sku) where.product = { sku: { contains: sp.sku.toUpperCase() } };
  if (sp.type && sp.type in MOVEMENT_LABELS) where.type = sp.type as MovementType;
  const showCost = can(user, "products.cost");
  const [moves, total, low, valuation] = await Promise.all([
    prisma.inventoryMovement.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER, include: { product: { select: { id: true, sku: true, nameAr: true } }, user: { select: { name: true } } } }),
    prisma.inventoryMovement.count({ where }),
    lowStockList(s.inventory.defaultLowStock),
    showCost ? inventoryValuation() : Promise.resolve(null),
  ]);
  const href = (p: number) => `/admin/inventory?${new URLSearchParams(Object.entries({ ...sp, page: String(p) }).filter(([, v]) => v) as [string, string][])}`;
  return (
    <>
      <PageHeader title="المخزون" actions={<a href="/admin/export/movements?preset=30" className="btn-secondary btn-sm"><Download className="h-4 w-4" /> تصدير الحركات (30 يوماً)</a>} />
      {valuation && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="قيمة المخزون بالتكلفة" value={formatIQD(valuation.value)} hint="الرصيد × آخر تكلفة (بدون التجريبي)" />
          <Stat label="إجمالي القطع" value={valuation.units} />
          <Stat label="منتجات بدون تكلفة" value={valuation.uncosted} tone={valuation.uncosted ? "warn" : "default"} hint="لا تدخل في التقييم" />
          <Stat label="منخفض المخزون" value={low.length} tone={low.length ? "danger" : "ok"} href="/admin/inventory?low=1" />
        </div>
      )}
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div>
          {sp.low ? (
            <Table>
              <thead><tr><th>SKU</th><th>المنتج</th><th>الرصيد</th><th>حد التنبيه</th></tr></thead>
              <tbody>{low.length ? low.map((p) => <tr key={p.id}><td className="font-mono text-xs" dir="ltr">{p.sku}</td><td><Link href={`/admin/products/${p.id}`} className="text-brand-600">{p.nameAr}</Link></td><td><Badge tone={p.stockQty ? "amber" : "red"}>{p.stockQty}</Badge></td><td className="tabular">{p.threshold}</td></tr>) : <EmptyRow cols={4} text="لا توجد منتجات منخفضة" />}</tbody>
            </Table>
          ) : (
            <>
              <form className="card mb-4 flex flex-wrap gap-3 p-4">
                <input name="sku" defaultValue={sp.sku} placeholder="SKU" className="input !w-48" dir="ltr" aria-label="SKU" />
                <select name="type" defaultValue={sp.type ?? ""} className="input !w-auto" aria-label="النوع"><option value="">كل الأنواع</option>{Object.entries(MOVEMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                <button className="btn-primary">تصفية</button>
                <Link href="/admin/inventory?low=1" className="btn-secondary">المنخفض فقط</Link>
              </form>
              <Table>
                <thead><tr><th>التاريخ</th><th>المنتج</th><th>النوع</th><th>الكمية</th><th>الرصيد بعدها</th>{showCost && <th>تكلفة الوحدة</th>}<th>السبب / المرجع</th><th>المستخدم</th></tr></thead>
                <tbody>
                  {moves.length ? moves.map((m) => (
                    <tr key={m.id}>
                      <td className="whitespace-nowrap text-xs tabular">{formatDateTime(m.createdAt)}</td>
                      <td><Link href={`/admin/products/${m.product.id}`} className="text-brand-600">{m.product.nameAr}</Link> <span className="font-mono text-xs text-ink-400" dir="ltr">{m.product.sku}</span></td>
                      <td>{MOVEMENT_LABELS[m.type]}</td>
                      <td className={`font-semibold tabular ${m.quantity > 0 ? "text-green-700" : "text-red-600"}`} dir="ltr">{m.quantity > 0 ? "+" : ""}{m.quantity}</td>
                      <td className="tabular">{m.balanceAfter}</td>
                      {showCost && <td className="tabular">{m.unitCost != null ? formatIQD(m.unitCost) : "—"}</td>}
                      <td className="text-xs">{m.reason}{m.reference && <span className="block font-mono" dir="ltr">{m.reference}</span>}</td>
                      <td className="text-xs">{m.user?.name ?? "النظام"}</td>
                    </tr>
                  )) : <EmptyRow cols={8} />}
                </tbody>
              </Table>
              <Pager page={page} pages={Math.ceil(total / PER)} href={href} />
            </>
          )}
        </div>
        <Card title="تعديل مخزون سريع">
          <ActionForm action={adjustInventory} submitLabel="تنفيذ" resetOnSuccess>
            <Field label="SKU المنتج" name="sku" dir="ltr" required />
            <Select label="العملية" name="mode" options={[{ value: "in", label: "إدخال (+)" }, { value: "out", label: "إخراج (-)" }, { value: "count", label: "جرد: تحديد الرصيد الفعلي" }]} />
            <Field label="الكمية" name="quantity" dir="ltr" required />
            {showCost && <Field label="تكلفة الوحدة (اختياري للإدخال)" name="unitCost" dir="ltr" />}
            <Field label="السبب" name="reason" required placeholder="مثال: تالف أثناء الفحص" />
            <p className="text-xs leading-6 text-ink-500">لا يُسمح بأن يصبح الرصيد سالباً. كل عملية تُسجل باسمك ووقتها. لإدخال بضاعة من مورد استخدم «المشتريات» لربطها بالتكلفة والمورد.</p>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
