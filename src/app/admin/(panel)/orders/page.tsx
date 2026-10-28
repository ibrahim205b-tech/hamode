import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { formatDateTime, formatIQD, baghdadDayStart } from "@/lib/format";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/constants";
import { Badge, EmptyRow, PageHeader, Pager, Table } from "@/components/admin/ui";
import { STATUS_TONE } from "@/components/admin/status";
import { ordersWhere, type OrderFilterParams } from "@/lib/admin-queries";
import { Download } from "lucide-react";

export const metadata = { title: "الطلبات" };
const PER = 30;

type SP = Promise<OrderFilterParams & { page?: string }>;

export default async function OrdersPage({ searchParams }: { searchParams: SP }) {
  await requireStaff("orders");
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page || "1") || 1);
  const where = ordersWhere(sp);
  const [orders, total] = await Promise.all([
    prisma.order.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER, include: { _count: { select: { items: true } } } }),
    prisma.order.count({ where }),
  ]);
  const qs = (p: number) => { const u = new URLSearchParams(Object.entries({ ...sp, page: String(p) }).filter(([, v]) => v) as [string, string][]); return `/admin/orders?${u}`; };
  const exportQs = new URLSearchParams(Object.entries(sp).filter(([k, v]) => v && k !== "page") as [string, string][]);
  return (
    <>
      <PageHeader title="الطلبات" subtitle={`${total} طلب`} actions={<a href={`/admin/export/orders?${exportQs}`} className="btn-secondary btn-sm"><Download className="h-4 w-4" /> تصدير CSV</a>} />
      <form className="card no-print mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <input name="q" defaultValue={sp.q} placeholder="رقم الطلب، الهاتف، أو الاسم" className="input lg:col-span-2" aria-label="بحث" />
        <select name="status" defaultValue={sp.status ?? ""} className="input" aria-label="الحالة">
          <option value="">كل الحالات</option>
          {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <div className="flex gap-2 lg:col-span-2">
          <input type="date" name="from" defaultValue={sp.from} className="input" aria-label="من تاريخ" />
          <input type="date" name="to" defaultValue={sp.to} className="input" aria-label="إلى تاريخ" />
          <button className="btn-primary">بحث</button>
        </div>
      </form>
      <Table>
        <thead><tr><th>رقم الطلب</th><th>التاريخ</th><th>الزبون</th><th>الهاتف</th><th>المحافظة</th><th>المنتجات</th><th>الإجمالي</th><th>الحالة</th><th>الدفع</th></tr></thead>
        <tbody>
          {orders.length ? orders.map((o) => (
            <tr key={o.id}>
              <td><Link href={`/admin/orders/${o.id}`} className="font-mono font-semibold text-brand-600 hover:underline" dir="ltr">{o.number}</Link></td>
              <td className="whitespace-nowrap text-xs tabular">{formatDateTime(o.createdAt)}</td>
              <td>{o.customerName}</td>
              <td className="tabular" dir="ltr">{o.phone}</td>
              <td>{o.governorate}</td>
              <td className="tabular">{o._count.items}</td>
              <td className="whitespace-nowrap font-semibold tabular">{formatIQD(o.total)}</td>
              <td><Badge tone={STATUS_TONE[o.status]}>{ORDER_STATUS_LABELS[o.status]}</Badge></td>
              <td><Badge tone={o.paymentStatus === "PAID" ? "green" : "gray"}>{PAYMENT_STATUS_LABELS[o.paymentStatus]}</Badge></td>
            </tr>
          )) : <EmptyRow cols={9} text="لا توجد طلبات مطابقة" />}
        </tbody>
      </Table>
      <Pager page={page} pages={Math.ceil(total / PER)} href={qs} />
    </>
  );
}
