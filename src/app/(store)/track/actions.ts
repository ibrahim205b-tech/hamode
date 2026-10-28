"use server";

import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { toLocalIraqi } from "@/lib/whatsapp";
import { ORDER_STATUS_LABELS } from "@/lib/constants";
import { formatDateTime, formatIQD } from "@/lib/format";

export type TrackState = { error?: string; result?: { number: string; status: string; date: string; total: string; items: number; history: { label: string; at: string }[]; cancelled: boolean } };

/** التتبع يتطلب رقم الطلب + رقم الهاتف المستخدم في الطلب، مع تحديد للمحاولات */
export async function trackOrder(_prev: TrackState, fd: FormData): Promise<TrackState> {
  const ip = await clientIp();
  if (!(await rateLimit(`track:${ip}`, 15, 600))) return { error: "محاولات كثيرة. حاول بعد 10 دقائق." };
  const number = String(fd.get("number") || "").trim().toUpperCase().slice(0, 30);
  const phone = toLocalIraqi(String(fd.get("phone") || ""));
  if (!number || !phone) return { error: "أدخل رقم الطلب ورقم الهاتف بشكل صحيح" };
  const o = await prisma.order.findUnique({ where: { number }, include: { history: { orderBy: { createdAt: "asc" } }, _count: { select: { items: true } } } });
  if (!o || o.phone !== phone) return { error: "لم يتم العثور على طلب بهذه البيانات" };
  return {
    result: {
      number: o.number,
      status: ORDER_STATUS_LABELS[o.status],
      date: formatDateTime(o.createdAt),
      total: formatIQD(o.total),
      items: o._count.items,
      cancelled: o.status === "CANCELLED",
      history: o.history.map((h) => ({ label: ORDER_STATUS_LABELS[h.toStatus], at: formatDateTime(h.createdAt) })),
    },
  };
}
