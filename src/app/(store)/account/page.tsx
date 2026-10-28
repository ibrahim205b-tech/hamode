import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut, Package, Trash2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser, isStaffRole } from "@/lib/auth";
import { formatDateTime, formatIQD } from "@/lib/format";
import { IRAQ_GOVERNORATES, ORDER_STATUS_LABELS } from "@/lib/constants";
import { logout, deleteAddress } from "./actions";
import { AddressForm, PasswordForm, ProfileForm } from "./AuthForms";

export const metadata: Metadata = { title: "حسابي", robots: { index: false } };

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/account/login");
  if (isStaffRole(user.role)) redirect("/admin");
  const customer = await prisma.customer.findUnique({
    where: { userId: user.id },
    include: { addresses: { orderBy: { createdAt: "desc" } }, orders: { orderBy: { createdAt: "desc" }, take: 50, include: { _count: { select: { items: true } } } } },
  });
  return (
    <div className="container py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">مرحباً، {user.name}</h1>
          <p className="mt-1 text-sm text-ink-300" dir="ltr">{user.phone}</p>
        </div>
        <form action={logout}><button className="btn-secondary"><LogOut className="h-4 w-4" /> تسجيل الخروج</button></form>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="card p-5" aria-labelledby="orders-h">
          <h2 id="orders-h" className="mb-4 text-lg font-bold text-white">طلباتي</h2>
          {customer?.orders.length ? (
            <ul className="divide-y divide-ink-700">
              {customer.orders.map((o) => (
                <li key={o.id}>
                  <Link href={`/account/orders/${o.number}`} className="flex flex-wrap items-center justify-between gap-2 py-3 hover:text-cyan-300">
                    <span><span className="font-mono font-semibold" dir="ltr">{o.number}</span><span className="ms-3 text-xs text-ink-400 tabular">{formatDateTime(o.createdAt)}</span></span>
                    <span className="flex items-center gap-3 text-sm"><span className="chip border-ink-600 bg-ink-800">{ORDER_STATUS_LABELS[o.status]}</span><span className="tabular">{formatIQD(o.total)}</span></span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center py-10 text-center text-ink-300"><Package className="mb-3 h-10 w-10 text-ink-500" />لا توجد طلبات بعد.<Link href="/products" className="link mt-2 text-sm">ابدأ التسوق</Link></div>
          )}
          <p className="mt-4 text-xs text-ink-400">تظهر هنا الطلبات التي أُنشئت أثناء تسجيل الدخول. للطلبات كضيف استخدم صفحة <Link href="/track" className="link">تتبع الطلب</Link>.</p>
        </section>
        <div className="space-y-6">
          <section className="card p-5"><h2 className="mb-3 font-bold text-white">بياناتي</h2><ProfileForm name={user.name} /></section>
          <section className="card p-5"><h2 className="mb-3 font-bold text-white">تغيير كلمة المرور</h2><PasswordForm /></section>
        </div>
      </div>
      <section className="card mt-6 p-5" aria-labelledby="addr-h">
        <h2 id="addr-h" className="mb-4 text-lg font-bold text-white">عناويني</h2>
        {customer?.addresses.length ? (
          <ul className="mb-5 grid gap-3 sm:grid-cols-2">
            {customer.addresses.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-3 rounded-xl border border-ink-700 p-3 text-sm">
                <span>{a.label && <strong className="block text-white">{a.label}</strong>}{a.governorate} - {a.area}<br /><span className="text-ink-300">{a.address}</span></span>
                <form action={deleteAddress}><input type="hidden" name="id" value={a.id} /><button className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 hover:bg-danger/10 hover:text-red-300" aria-label="حذف العنوان"><Trash2 className="h-4 w-4" /></button></form>
              </li>
            ))}
          </ul>
        ) : <p className="mb-4 text-sm text-ink-300">لا توجد عناوين محفوظة.</p>}
        <AddressForm governorates={IRAQ_GOVERNORATES} />
      </section>
    </div>
  );
}
