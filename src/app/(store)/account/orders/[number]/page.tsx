import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { OrderSummary, StatusTimeline } from "@/components/store/OrderDetails";
import { ReorderButton } from "./ReorderButton";

export const metadata: Metadata = { title: "تفاصيل الطلب", robots: { index: false } };

export default async function AccountOrderPage({ params }: { params: Promise<{ number: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/account/login");
  const { number } = await params;
  // التحقق من الملكية: الطلب يجب أن يعود لسجل زبون هذا المستخدم
  const order = await prisma.order.findFirst({
    where: { number: decodeURIComponent(number), customer: { userId: user.id } },
    include: { items: { include: { product: { select: { id: true, slug: true, sku: true, nameAr: true, price: true, status: true, images: { take: 1, select: { uploadId: true } } } } } }, history: { orderBy: { createdAt: "asc" } } },
  });
  if (!order) notFound();
  const reorder = order.items
    .filter((i) => i.product && i.product.status === "ACTIVE")
    .map((i) => ({ productId: i.product!.id, slug: i.product!.slug, sku: i.product!.sku, nameAr: i.product!.nameAr, imageId: i.product!.images[0]?.uploadId ?? null, seenPrice: i.product!.price, quantity: i.quantity }));
  return (
    <div className="container max-w-4xl py-8">
      <Link href="/account" className="link text-sm">← العودة إلى حسابي</Link>
      <h1 className="mb-2 mt-3 text-2xl font-bold text-white">الطلب <span className="font-mono" dir="ltr">{order.number}</span></h1>
      <p className="mb-6 text-sm text-ink-300 tabular">{formatDateTime(order.createdAt)}</p>
      <StatusTimeline order={order} />
      <div className="mt-6"><OrderSummary order={order} /></div>
      {reorder.length > 0 && <div className="mt-6"><ReorderButton items={reorder} /></div>}
    </div>
  );
}
