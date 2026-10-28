import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { IRAQ_GOVERNORATES } from "@/lib/constants";
import { CheckoutForm } from "@/components/store/CheckoutForm";

export const metadata: Metadata = { title: "إتمام الطلب", robots: { index: false } };

export default async function CheckoutPage() {
  const [user, s, methods] = await Promise.all([
    getCurrentUser(),
    getSettings(),
    prisma.deliveryMethod.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { id: true, nameAr: true, description: true, kind: true } }),
  ]);
  const customer = user ? await prisma.customer.findUnique({ where: { userId: user.id }, include: { addresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] } } }) : null;
  return (
    <div className="container py-8">
      <h1 className="mb-6 text-2xl font-bold text-white sm:text-3xl">إتمام الطلب</h1>
      {!s.order.codEnabled ? (
        <p className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-amber-100">استقبال الطلبات عبر الموقع متوقف مؤقتاً. يمكنك التواصل معنا عبر واتساب.</p>
      ) : (
        <CheckoutForm
          governorates={IRAQ_GOVERNORATES}
          methods={methods}
          isLoggedIn={!!user}
          prefill={{ name: customer?.name ?? user?.name ?? "", phone: customer?.phone ?? user?.phone ?? "" }}
          addresses={customer?.addresses.map((a) => ({ governorate: a.governorate, area: a.area, address: a.address })) ?? []}
          note={s.order.checkoutNote}
        />
      )}
    </div>
  );
}
