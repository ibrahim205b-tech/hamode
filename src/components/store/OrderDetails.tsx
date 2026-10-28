import { CheckCircle2, Circle, XCircle } from "lucide-react";
import type { Order, OrderItem, OrderStatusHistory } from "@prisma/client";
import { ORDER_STATUS_FLOW, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/constants";
import { formatDateTime, formatIQD } from "@/lib/format";

export function StatusTimeline({ order }: { order: Order & { history: OrderStatusHistory[] } }) {
  if (order.status === "CANCELLED") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-danger/40 bg-danger/10 p-4 text-red-200">
        <XCircle className="h-6 w-6" /> <div><p className="font-semibold">تم إلغاء الطلب</p>{order.cancelReason && <p className="text-sm">السبب: {order.cancelReason}</p>}</div>
      </div>
    );
  }
  const steps = ORDER_STATUS_FLOW.filter((s) => s !== "AWAITING_CONFIRMATION" || order.history.some((h) => h.toStatus === s));
  const idx = steps.indexOf(order.status);
  return (
    <ol className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {steps.map((s, i) => {
        const done = i <= idx;
        const at = order.history.find((h) => h.toStatus === s)?.createdAt;
        return (
          <li key={s} className={`rounded-xl border p-3 ${done ? "border-brand-500/50 bg-brand-500/10" : "border-ink-700 bg-ink-900"}`}>
            {done ? <CheckCircle2 className="mb-1.5 h-5 w-5 text-cyan-400" /> : <Circle className="mb-1.5 h-5 w-5 text-ink-500" />}
            <p className={`text-sm font-semibold ${done ? "text-white" : "text-ink-400"}`}>{ORDER_STATUS_LABELS[s]}</p>
            {at && <p className="mt-0.5 text-[11px] text-ink-400 tabular">{formatDateTime(at)}</p>}
          </li>
        );
      })}
    </ol>
  );
}

export function OrderSummary({ order }: { order: Order & { items: OrderItem[] } }) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-ink-850 text-xs text-ink-400">
            <tr><th className="p-3 text-start">المنتج</th><th className="p-3 text-start">الكمية</th><th className="p-3 text-start">السعر</th><th className="p-3 text-start">المجموع</th></tr>
          </thead>
          <tbody>
            {order.items.map((i) => (
              <tr key={i.id} className="border-t border-ink-700/70">
                <td className="p-3"><p className="font-medium text-white">{i.nameAr}</p><p className="font-mono text-xs text-ink-400" dir="ltr">{i.sku}</p></td>
                <td className="p-3 tabular">{i.quantity}</td>
                <td className="p-3 tabular whitespace-nowrap">{formatIQD(i.unitPrice)}</td>
                <td className="p-3 tabular whitespace-nowrap font-semibold">{formatIQD(i.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="space-y-2 border-t border-ink-700 p-4 text-sm tabular">
        <div className="flex justify-between"><dt className="text-ink-300">المجموع الفرعي</dt><dd>{formatIQD(order.subtotal)}</dd></div>
        {order.discountTotal > 0 && <div className="flex justify-between text-cyan-300"><dt>الخصم {order.discountCode && `(${order.discountCode})`}</dt><dd>-{formatIQD(order.discountTotal)}</dd></div>}
        <div className="flex justify-between"><dt className="text-ink-300">التوصيل ({order.deliveryMethod})</dt><dd>{formatIQD(order.deliveryFee)}</dd></div>
        <div className="flex justify-between border-t border-ink-700 pt-2 text-base font-bold text-white"><dt>الإجمالي</dt><dd>{formatIQD(order.total)}</dd></div>
        <div className="flex justify-between text-xs text-ink-400"><dt>الدفع</dt><dd>الدفع عند الاستلام · {PAYMENT_STATUS_LABELS[order.paymentStatus]}</dd></div>
      </dl>
    </div>
  );
}
