import { prisma } from "@/lib/db";
import { requireStaff, ROLE_PERMISSIONS } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/constants";
import { Badge, Card, Field, PageHeader, Select } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { createStaff, updateStaff } from "./actions";

export const metadata = { title: "المستخدمون" };
const roleOpts = [{ value: "STAFF", label: "موظف" }, { value: "ADMIN", label: "مدير" }, { value: "OWNER", label: "مالك" }];

export default async function UsersPage() {
  const me = await requireStaff("users");
  const users = await prisma.user.findMany({ where: { role: { in: ["OWNER", "ADMIN", "STAFF"] } }, orderBy: { createdAt: "asc" }, include: { _count: { select: { sessions: true } } } });
  return (
    <>
      <PageHeader title="المستخدمون الإداريون" subtitle="المالك: كل الصلاحيات · المدير: كل شيء عدا المستخدمين · الموظف: الطلبات والمخزون والمنتجات بدون الأسعار والتقارير" />
      <Card title="مستخدم جديد" className="mb-6">
        <ActionForm action={createStaff} submitLabel="إنشاء" className="grid gap-3 md:grid-cols-5 md:items-end" inline resetOnSuccess>
          <Field label="الاسم" name="name" required />
          <Field label="البريد" name="email" type="email" dir="ltr" required />
          <Select label="الدور" name="role" options={roleOpts} />
          <Field label="كلمة مرور مؤقتة" name="password" type="password" required />
        </ActionForm>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        {users.map((u) => (
          <Card key={u.id} title={<>{u.name} {u.id === me.id && <Badge tone="blue">أنت</Badge>}</>} actions={<span className="flex gap-1"><Badge tone="cyan">{ROLE_LABELS[u.role]}</Badge><Badge tone={u.isActive ? "green" : "red"}>{u.isActive ? "نشط" : "معطل"}</Badge></span>}>
            <p className="mb-3 text-sm text-ink-500" dir="ltr">{u.email}</p>
            <p className="mb-3 text-xs text-ink-400">آخر دخول: {u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "—"} · جلسات نشطة: {u._count.sessions} · الصلاحيات: {ROLE_PERMISSIONS[u.role].length}</p>
            <div className="flex flex-wrap items-end gap-2">
              <ActionForm action={updateStaff} submitLabel="تغيير الدور" submitClass="btn-secondary btn-sm" className="flex items-end gap-2" inline>
                <input type="hidden" name="id" value={u.id} /><input type="hidden" name="op" value="role" />
                <select name="role" defaultValue={u.role} className="input !w-auto !py-1.5" aria-label="الدور">{roleOpts.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}</select>
              </ActionForm>
              <ActionForm action={updateStaff} submitLabel={u.isActive ? "تعطيل" : "تفعيل"} submitClass="btn-ghost btn-sm" className="contents" inline confirm="تأكيد؟"><input type="hidden" name="id" value={u.id} /><input type="hidden" name="op" value="toggle" /></ActionForm>
              <ActionForm action={updateStaff} submitLabel="إنهاء الجلسات" submitClass="btn-ghost btn-sm" className="contents" inline><input type="hidden" name="id" value={u.id} /><input type="hidden" name="op" value="logout" /></ActionForm>
            </div>
            <details className="mt-3">
              <summary className="cursor-pointer text-sm text-brand-600">تعيين كلمة مرور جديدة</summary>
              <ActionForm action={updateStaff} submitLabel="حفظ" submitClass="btn-secondary btn-sm" className="mt-2 flex items-end gap-2" inline resetOnSuccess>
                <input type="hidden" name="id" value={u.id} /><input type="hidden" name="op" value="password" />
                <Field label="كلمة المرور" name="password" type="password" required />
              </ActionForm>
            </details>
          </Card>
        ))}
      </div>
    </>
  );
}
