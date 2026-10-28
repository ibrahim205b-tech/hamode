import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Download } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { toLocalIraqi } from "@/lib/whatsapp";
import { Badge, EmptyRow, PageHeader, Pager, Table } from "@/components/admin/ui";

export const metadata = { title: "الزبائن" };
const PER = 40;

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requireStaff("customers");
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page || "1") || 1);
  const q = (sp.q || "").trim();
  const phone = toLocalIraqi(q);
  const where: Prisma.CustomerWhereInput = q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, ...(phone ? [{ phone }] : [{ phone: { contains: q.replace(/\D/g, "") || "__" } }])] } : {};
  const [rows, total] = await Promise.all([
    prisma.customer.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER, include: { _count: { select: { orders: true } }, orders: { where: { status: "DELIVERED" }, select: { total: true } } } }),
    prisma.customer.count({ where }),
  ]);
  return (
    <>
      <PageHeader title="الزبائن" subtitle={`${total} زبون — بيانات خاصة، للموظفين المصرح لهم فقط`} actions={<a href="/admin/export/customers" className="btn-secondary btn-sm"><Download className="h-4 w-4" /> تصدير</a>} />
      <form className="card mb-4 flex gap-3 p-4"><input name="q" defaultValue={q} placeholder="الاسم أو رقم الهاتف" className="input" aria-label="بحث" /><button className="btn-primary">بحث</button></form>
      <Table>
        <thead><tr><th>الاسم</th><th>الهاتف</th><th>الحساب</th><th>الطلبات</th><th>مشتريات مكتملة</th><th>منذ</th></tr></thead>
        <tbody>
          {rows.length ? rows.map((c) => (
            <tr key={c.id}>
              <td><Link href={`/admin/customers/${c.id}`} className="text-brand-600 hover:underline">{c.name}</Link></td>
              <td className="tabular" dir="ltr">{c.phone}</td>
              <td>{c.userId ? <Badge tone="blue">مسجل</Badge> : <Badge>ضيف</Badge>}</td>
              <td className="tabular">{c._count.orders}</td>
              <td className="tabular">{c.orders.reduce((a, o) => a + o.total, 0).toLocaleString("en-US")} د.ع</td>
              <td className="text-xs tabular">{formatDate(c.createdAt)}</td>
            </tr>
          )) : <EmptyRow cols={6} />}
        </tbody>
      </Table>
      <Pager page={page} pages={Math.ceil(total / PER)} href={(p) => `/admin/customers?q=${encodeURIComponent(q)}&page=${p}`} />
    </>
  );
}
