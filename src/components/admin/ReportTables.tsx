import Link from "next/link";
import { formatDateTime, formatIQD, formatNumber } from "@/lib/format";
import { MOVEMENT_LABELS } from "@/lib/constants";
import type * as R from "@/lib/reports";

type Data = {
  summary: Awaited<ReturnType<typeof R.salesSummary>>;
  periods: Awaited<ReturnType<typeof R.salesByPeriod>>;
  products: Awaited<ReturnType<typeof R.salesByProduct>>;
  categories: Awaited<ReturnType<typeof R.salesByCategory>>;
  manufacturers: Awaited<ReturnType<typeof R.salesByDevice>>;
  models: Awaited<ReturnType<typeof R.salesByDevice>>;
  valuation: Awaited<ReturnType<typeof R.inventoryValuation>>;
  movements: Awaited<ReturnType<typeof R.movementSummary>>;
  cancelled: Awaited<ReturnType<typeof R.cancelledOrders>>;
  suppliers: Awaited<ReturnType<typeof R.supplierPurchases>>;
  lowStock: Awaited<ReturnType<typeof R.lowStockList>>;
};

function T({ head, children, empty }: { head: string[]; children: React.ReactNode; empty?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="table-admin">
        <thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>{empty ? <tr><td colSpan={head.length} className="py-6 text-center text-ink-400">لا توجد بيانات في هذه الفترة</td></tr> : children}</tbody>
      </table>
    </div>
  );
}

function Sec({ title, children, note }: { title: string; children: React.ReactNode; note?: string }) {
  return (
    <section className="card mb-6 break-inside-avoid p-5">
      <h2 className="mb-1 font-bold">{title}</h2>
      {note && <p className="mb-3 text-xs text-ink-500">{note}</p>}
      {children}
    </section>
  );
}

export function ReportTables({ d, sections, links = true }: { d: Data; sections: Set<string>; links?: boolean }) {
  const s = d.summary;
  const box = (label: string, value: string, hint?: string) => (
    <div className="rounded-xl border border-ink-100 p-3"><p className="text-xs text-ink-500">{label}</p><p className="mt-1 text-lg font-bold tabular">{value}</p>{hint && <p className="text-[11px] text-ink-400">{hint}</p>}</div>
  );
  return (
    <>
      {sections.has("summary") && (
        <Sec title="ملخص المبيعات المكتملة" note="المبيعات = الطلبات المُسلّمة فقط حسب تاريخ التسليم. الطلبات الملغاة مستبعدة.">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {box("عدد الطلبات المُسلّمة", formatNumber(s.orders))}
            {box("إجمالي المبيعات (قبل الخصم)", formatIQD(s.gross))}
            {box("الخصومات", formatIQD(s.discounts))}
            {box("صافي المبيعات", formatIQD(s.net), "إجمالي − خصومات، بدون التوصيل")}
            {box("أجور التوصيل", formatIQD(s.delivery))}
            {box("المستحق من الزبائن", formatIQD(s.collectedFromCustomers), "صافي المبيعات + التوصيل")}
            {box("النقد المقبوض فعلياً", formatIQD(s.cashReceived), `${s.paymentsCount} دفعة مسجلة حسب تاريخ القبض`)}
            {box("تكلفة البضاعة المباعة", formatIQD(s.cogs), `تغطية بيانات التكلفة: ${Math.round(s.costCoverage * 100)}%`)}
            {box("الربح الإجمالي التقديري", s.grossProfit == null ? "لا تتوفر بيانات تكلفة" : formatIQD(s.grossProfit), s.costCoverage < 1 && s.grossProfit != null ? "محسوب للبنود التي لها تكلفة فقط" : undefined)}
            {box("طلبات ملغاة", `${s.cancelledCount} · ${formatIQD(s.cancelledValue)}`, "حسب تاريخ الإلغاء — غير محسوبة في المبيعات")}
          </div>
        </Sec>
      )}
      {sections.has("periods") && (
        <Sec title="المبيعات حسب الفترة">
          <T head={["الفترة", "الطلبات", "الإجمالي", "الخصومات", "الصافي", "التوصيل"]} empty={!d.periods.length}>
            {d.periods.map((p) => <tr key={p.period}><td className="tabular">{p.period}</td><td className="tabular">{p.orders}</td><td className="tabular">{formatIQD(p.gross)}</td><td className="tabular">{formatIQD(p.discounts)}</td><td className="tabular font-semibold">{formatIQD(p.net)}</td><td className="tabular">{formatIQD(p.delivery)}</td></tr>)}
          </T>
        </Sec>
      )}
      {sections.has("products") && (
        <Sec title="المبيعات حسب المنتج" note="الربح يُعرض فقط عند توفر تكلفة لكل الكميات المباعة من المنتج.">
          <T head={["SKU", "المنتج", "الكمية", "الإيراد", "التكلفة", "الربح التقديري"]} empty={!d.products.length}>
            {d.products.map((p) => <tr key={p.sku}><td className="font-mono text-xs" dir="ltr">{p.sku}</td><td>{p.name}</td><td className="tabular">{p.qty}</td><td className="tabular">{formatIQD(p.revenue)}</td><td className="tabular">{p.cost == null ? "—" : formatIQD(p.cost)}</td><td className="tabular">{p.profit == null ? "—" : formatIQD(p.profit)}</td></tr>)}
          </T>
        </Sec>
      )}
      {sections.has("categories") && (
        <Sec title="المبيعات حسب القسم الرئيسي">
          <T head={["القسم", "الكمية", "الإيراد"]} empty={!d.categories.length}>
            {d.categories.map((c) => <tr key={c.name}><td>{c.name}</td><td className="tabular">{c.qty}</td><td className="tabular">{formatIQD(c.revenue)}</td></tr>)}
          </T>
        </Sec>
      )}
      {sections.has("devices") && (
        <>
          <Sec title="المبيعات حسب الشركة المصنعة للجهاز" note="يُنسب كل بند لكل شركة/موديل متوافق معه، لذلك قد يتجاوز المجموع إجمالي المبيعات.">
            <T head={["الشركة", "الكمية", "الإيراد"]} empty={!d.manufacturers.length}>
              {d.manufacturers.map((c) => <tr key={c.name}><td dir="ltr" className="text-start">{c.name}</td><td className="tabular">{c.qty}</td><td className="tabular">{formatIQD(c.revenue)}</td></tr>)}
            </T>
          </Sec>
          <Sec title="المبيعات حسب موديل الجهاز">
            <T head={["الموديل", "الكمية", "الإيراد"]} empty={!d.models.length}>
              {d.models.map((c) => <tr key={c.name}><td dir="ltr" className="text-start">{c.name}</td><td className="tabular">{c.qty}</td><td className="tabular">{formatIQD(c.revenue)}</td></tr>)}
            </T>
          </Sec>
        </>
      )}
      {sections.has("inventory") && (
        <>
          <Sec title="قيمة المخزون الحالية" note="الرصيد الحالي × آخر تكلفة مسجلة. المنتجات التجريبية والمؤرشفة مستبعدة.">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {box("قيمة المخزون بالتكلفة", formatIQD(d.valuation.value))}
              {box("إجمالي القطع", formatNumber(d.valuation.units))}
              {box("منتجات لها تكلفة", formatNumber(d.valuation.costed))}
              {box("منتجات بدون تكلفة", formatNumber(d.valuation.uncosted), `${d.valuation.uncostedUnits} قطعة غير مقيّمة`)}
            </div>
          </Sec>
          <Sec title="حركات المخزون في الفترة">
            <T head={["النوع", "عدد الحركات", "صافي الكمية"]} empty={!d.movements.length}>
              {d.movements.map((m) => <tr key={m.type}><td>{MOVEMENT_LABELS[m.type]}</td><td className="tabular">{m.count}</td><td className="tabular" dir="ltr">{m.quantity}</td></tr>)}
            </T>
          </Sec>
          <Sec title="منتجات منخفضة المخزون">
            <T head={["SKU", "المنتج", "الرصيد", "حد التنبيه"]} empty={!d.lowStock.length}>
              {d.lowStock.map((p) => <tr key={p.id}><td className="font-mono text-xs" dir="ltr">{p.sku}</td><td>{links ? <Link href={`/admin/products/${p.id}`} className="text-brand-600">{p.nameAr}</Link> : p.nameAr}</td><td className="tabular">{p.stockQty}</td><td className="tabular">{p.threshold}</td></tr>)}
            </T>
          </Sec>
        </>
      )}
      {sections.has("cancelled") && (
        <Sec title="الطلبات الملغاة">
          <T head={["رقم الطلب", "الزبون", "القيمة", "السبب", "تاريخ الإلغاء"]} empty={!d.cancelled.length}>
            {d.cancelled.map((o) => <tr key={o.id}><td className="font-mono" dir="ltr">{links ? <Link href={`/admin/orders/${o.id}`} className="text-brand-600">{o.number}</Link> : o.number}</td><td>{o.customerName}</td><td className="tabular">{formatIQD(o.total)}</td><td>{o.cancelReason}</td><td className="text-xs tabular">{o.cancelledAt ? formatDateTime(o.cancelledAt) : ""}</td></tr>)}
          </T>
        </Sec>
      )}
      {sections.has("suppliers") && (
        <Sec title="المشتريات من الموردين (المستلمة)" note="تكاليف شراء — ليست إيرادات.">
          <T head={["المورد", "أوامر الشراء", "الإجمالي", "المدفوع", "المتبقي"]} empty={!d.suppliers.length}>
            {d.suppliers.map((s) => <tr key={s.name}><td>{s.name}</td><td className="tabular">{s.orders}</td><td className="tabular">{formatIQD(s.total)}</td><td className="tabular">{formatIQD(s.paid)}</td><td className="tabular">{formatIQD(s.total - s.paid)}</td></tr>)}
          </T>
        </Sec>
      )}
    </>
  );
}

export const ALL_SECTIONS: [string, string][] = [
  ["summary", "الملخص"], ["periods", "حسب الفترة"], ["products", "حسب المنتج"], ["categories", "حسب القسم"],
  ["devices", "حسب الجهاز"], ["inventory", "المخزون"], ["cancelled", "الملغاة"], ["suppliers", "المشتريات"],
];
