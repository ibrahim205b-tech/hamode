import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { formatDate, formatIQD } from "@/lib/format";
import { PAYMENT_STATUS_LABELS, PURCHASE_STATUS_LABELS } from "@/lib/constants";
import { Badge, EmptyRow, PageHeader, Table } from "@/components/admin/ui";

export const metadata = { title: "المشتريات" };

export default async function PurchasesPage({ searchParams }: { searchParams: Promise<{ supplier?: string }> }) {
  await requireStaff("purchases");
  const { supplier } = await searchParams;
  const rows = await prisma.purchaseOrder.findMany({ where: supplier ? { supplierId: supplier } : {}, orderBy: { orderDate: "desc" }, take: 300, include: { supplier: true, _count: { select: { items: true } } } });
  return (
    <>
      <PageHeader title="المشتريات" subtitle="تكاليف الشراء — منفصلة عن إيرادات المبيعات" actions={<Link href="/admin/purchases/new" className="btn-primary btn-sm">أمر شراء جديد</Link>} />
      <Table>
        <thead><tr><th>الرقم</th><th>المورد</th><th>التاريخ</th><th>البنود</th><th>الإجمالي</th><th>المدفوع</th><th>الحالة</th><th>الدفع</th></tr></thead>
        <tbody>
          {rows.length ? rows.map((p) => (
            <tr key={p.id}>
              <td><Link href={`/admin/purchases/${p.id}`} className="font-mono text-brand-600" dir="ltr">{p.number}</Link></td>
              <td>{p.supplier.name}</td><td className="text-xs tabular">{formatDate(p.orderDate)}</td><td className="tabular">{p._count.items}</td>
              <td className="tabular">{formatIQD(p.total)}</td><td className="tabular">{formatIQD(p.amountPaid)}</td>
              <td><Badge tone={p.status === "RECEIVED" ? "green" : p.status === "CANCELLED" ? "red" : "amber"}>{PURCHASE_STATUS_LABELS[p.status]}</Badge></td>
              <td><Badge tone={p.paymentStatus === "PAID" ? "green" : "gray"}>{PAYMENT_STATUS_LABELS[p.paymentStatus]}</Badge></td>
            </tr>
          )) : <EmptyRow cols={8} text="لا توجد أوامر شراء" />}
        </tbody>
      </Table>
    </>
  );
}
