import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { EmptyRow, PageHeader, Pager, Table } from "@/components/admin/ui";

export const metadata = { title: "سجل العمليات" };
const PER = 60;

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ action?: string; page?: string }> }) {
  await requireStaff("audit");
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page || "1") || 1);
  const where = sp.action ? { action: { startsWith: sp.action } } : {};
  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER, include: { user: { select: { name: true } } } }),
    prisma.auditLog.count({ where }),
  ]);
  return (
    <>
      <PageHeader title="سجل العمليات" subtitle="كل العمليات الحساسة مسجلة مع المستخدم والوقت وعنوان IP — لا يمكن تعديل السجل من الواجهة" />
      <form className="card mb-4 flex gap-3 p-4"><input name="action" defaultValue={sp.action} placeholder="نوع العملية (مثال: order، product، inventory)" className="input" dir="ltr" aria-label="نوع العملية" /><button className="btn-primary">تصفية</button></form>
      <Table>
        <thead><tr><th>الوقت</th><th>المستخدم</th><th>العملية</th><th>الكيان</th><th>التفاصيل</th><th>IP</th></tr></thead>
        <tbody>
          {rows.length ? rows.map((a) => (
            <tr key={a.id}>
              <td className="whitespace-nowrap text-xs tabular">{formatDateTime(a.createdAt)}</td>
              <td>{a.user?.name ?? "—"}</td>
              <td className="font-mono text-xs" dir="ltr">{a.action}</td>
              <td className="font-mono text-xs" dir="ltr">{a.entityType}{a.entityId ? `:${a.entityId.slice(0, 10)}` : ""}</td>
              <td className="max-w-md truncate font-mono text-[11px] text-ink-500" dir="ltr" title={a.details ? JSON.stringify(a.details) : ""}>{a.details ? JSON.stringify(a.details) : ""}</td>
              <td className="font-mono text-xs" dir="ltr">{a.ip}</td>
            </tr>
          )) : <EmptyRow cols={6} />}
        </tbody>
      </Table>
      <Pager page={page} pages={Math.ceil(total / PER)} href={(p) => `/admin/audit?action=${sp.action ?? ""}&page=${p}`} />
    </>
  );
}
