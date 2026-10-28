import Link from "next/link";
import { prisma } from "@/lib/db";
import { can, requireStaff } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { formatDateTime, formatIQD, formatNumber, isoDay, baghdadDayStart } from "@/lib/format";
import { MOVEMENT_LABELS, ORDER_STATUS_LABELS } from "@/lib/constants";
import { Badge, Card, Notice, PageHeader, Stat } from "@/components/admin/ui";
import type { OrderStatus } from "@prisma/client";
import { STATUS_TONE } from "@/components/admin/status";

export const metadata = { title: "نظرة عامة" };


export default async function Overview({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; denied?: string }> }) {
  const user = await requireStaff("dashboard");
  const sp = await searchParams;
  const s = await getSettings();
  const today = isoDay(new Date());
  const from = /^\d{4}-\d{2}-\d{2}$/.test(sp.from ?? "") ? sp.from! : isoDay(new Date(Date.now() - 29 * 86400000));
  const to = /^\d{4}-\d{2}-\d{2}$/.test(sp.to ?? "") ? sp.to! : today;
  const range = { gte: baghdadDayStart(from), lt: new Date(baghdadDayStart(to).getTime() + 86400000) };
  const showMoney = can(user, "reports");

  const [byStatus, delivered, activeSales, lowStock, movements, auditRows, demoCount, recentOrders] = await Promise.all([
    prisma.order.groupBy({ by: ["status"], _count: true }),
    prisma.order.aggregate({ where: { status: "DELIVERED", deliveredAt: range }, _sum: { total: true }, _count: true }),
    prisma.order.aggregate({ where: { status: { not: "CANCELLED" }, createdAt: range }, _sum: { total: true }, _count: true }),
    prisma.$queryRaw<{ id: string; nameAr: string; sku: string; stockQty: number; threshold: number }[]>`
      SELECT id, "nameAr", sku, "stockQty", COALESCE("lowStockThreshold", ${s.inventory.defaultLowStock}) AS threshold
      FROM "Product" WHERE status = 'ACTIVE' AND "stockQty" <= COALESCE("lowStockThreshold", ${s.inventory.defaultLowStock})
      ORDER BY "stockQty" ASC LIMIT 10`,
    prisma.inventoryMovement.findMany({ take: 8, orderBy: { createdAt: "desc" }, include: { product: { select: { nameAr: true, id: true } }, user: { select: { name: true } } } }),
    can(user, "audit") ? prisma.auditLog.findMany({ take: 8, orderBy: { createdAt: "desc" }, include: { user: { select: { name: true } } } }) : Promise.resolve([]),
    prisma.product.count({ where: { isDemo: true } }),
    prisma.order.findMany({ take: 8, orderBy: { createdAt: "desc" }, select: { id: true, number: true, customerName: true, total: true, status: true, createdAt: true } }),
  ]);
  const count = (st: OrderStatus) => byStatus.find((b) => b.status === st)?._count ?? 0;
  const total = byStatus.reduce((a, b) => a + b._count, 0);

  const bestRows = showMoney
    ? await prisma.orderItem.groupBy({
        by: ["productId", "nameAr"],
        where: { order: { status: "DELIVERED", deliveredAt: range } },
        _sum: { quantity: true, lineTotal: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 8,
      })
    : [];

  return (
    <>
      <PageHeader title={`مرحباً، ${user.name}`} subtitle="ملخص فعلي من قاعدة البيانات" />
      {sp.denied && <div className="mb-4"><Notice tone="error">ليست لديك صلاحية للوصول إلى تلك الصفحة.</Notice></div>}
      {demoCount > 0 && (
        <div className="mb-4"><Notice tone="warn">يوجد {demoCount} منتج تجريبي في المتجر. يمكنك إخفاؤها أو حذفها من <Link className="underline" href="/admin/settings">الإعدادات</Link> عند إضافة منتجاتك الحقيقية.</Notice></div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <Stat label="كل الطلبات" value={formatNumber(total)} href="/admin/orders" />
        <Stat label="جديدة" value={count("NEW")} tone="brand" href="/admin/orders?status=NEW" />
        <Stat label="بانتظار التأكيد" value={count("AWAITING_CONFIRMATION")} tone="warn" href="/admin/orders?status=AWAITING_CONFIRMATION" />
        <Stat label="مؤكدة" value={count("CONFIRMED")} href="/admin/orders?status=CONFIRMED" />
        <Stat label="قيد التجهيز" value={count("PREPARING")} tone="warn" href="/admin/orders?status=PREPARING" />
        <Stat label="مشحونة" value={count("SHIPPED")} href="/admin/orders?status=SHIPPED" />
        <Stat label="مُسلّمة" value={count("DELIVERED")} tone="ok" href="/admin/orders?status=DELIVERED" />
        <Stat label="ملغاة" value={count("CANCELLED")} tone="danger" href="/admin/orders?status=CANCELLED" />
      </div>

      {showMoney && (
        <Card
          className="mb-6"
          title="المبيعات للفترة"
          actions={
            <form className="no-print flex flex-wrap items-end gap-2 text-sm">
              <input type="date" name="from" defaultValue={from} className="input !w-auto !py-1.5" aria-label="من" />
              <input type="date" name="to" defaultValue={to} className="input !w-auto !py-1.5" aria-label="إلى" />
              <button className="btn-secondary btn-sm">عرض</button>
            </form>
          }
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="مبيعات مكتملة (طلبات مُسلّمة)" value={formatIQD(delivered._sum.total ?? 0)} hint={`${delivered._count} طلب — حسب تاريخ التسليم`} tone="ok" />
            <Stat label="قيمة الطلبات النشطة المسجلة" value={formatIQD(activeSales._sum.total ?? 0)} hint={`${activeSales._count} طلب غير ملغي — حسب تاريخ الإنشاء`} />
            <Stat label="التقارير التفصيلية" value={<Link href={`/admin/reports?from=${from}&to=${to}`} className="text-base text-brand-600 underline">فتح التقارير ←</Link>} hint="الربح، التكلفة، المبيعات حسب المنتج والقسم" />
          </div>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="أحدث الطلبات" actions={<Link href="/admin/orders" className="text-sm text-brand-600">الكل</Link>}>
          {recentOrders.length ? (
            <ul className="divide-y divide-ink-100 text-sm">
              {recentOrders.map((o) => (
                <li key={o.id}><Link href={`/admin/orders/${o.id}`} className="flex items-center justify-between gap-2 py-2.5 hover:text-brand-600">
                  <span><span className="font-mono font-semibold" dir="ltr">{o.number}</span> <span className="text-ink-500">· {o.customerName}</span></span>
                  <span className="flex items-center gap-2"><Badge tone={STATUS_TONE[o.status]}>{ORDER_STATUS_LABELS[o.status]}</Badge><span className="tabular">{formatIQD(o.total)}</span></span>
                </Link></li>
              ))}
            </ul>
          ) : <p className="text-sm text-ink-400">لا توجد طلبات بعد.</p>}
        </Card>

        <Card title="مخزون منخفض" actions={<Link href="/admin/inventory?low=1" className="text-sm text-brand-600">الكل</Link>}>
          {lowStock.length ? (
            <ul className="divide-y divide-ink-100 text-sm">
              {lowStock.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2.5">
                  <Link href={`/admin/products/${p.id}`} className="hover:text-brand-600">{p.nameAr} <span className="font-mono text-xs text-ink-400" dir="ltr">{p.sku}</span></Link>
                  <Badge tone={p.stockQty === 0 ? "red" : "amber"}>{p.stockQty} / حد {p.threshold}</Badge>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-ink-400">لا توجد منتجات تحت حد التنبيه.</p>}
        </Card>

        {showMoney && (
          <Card title="الأكثر مبيعاً (طلبات مُسلّمة في الفترة)">
            {bestRows.length ? (
              <table className="table-admin"><thead><tr><th>المنتج</th><th>الكمية</th><th>المبيعات</th></tr></thead><tbody>
                {bestRows.map((r, i) => <tr key={i}><td>{r.nameAr}</td><td className="tabular">{r._sum.quantity}</td><td className="tabular">{formatIQD(r._sum.lineTotal ?? 0)}</td></tr>)}
              </tbody></table>
            ) : <p className="text-sm text-ink-400">لا توجد مبيعات مكتملة في هذه الفترة.</p>}
          </Card>
        )}

        <Card title="أحدث حركات المخزون" actions={<Link href="/admin/inventory" className="text-sm text-brand-600">الكل</Link>}>
          {movements.length ? (
            <ul className="divide-y divide-ink-100 text-sm">
              {movements.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2 py-2.5">
                  <span className="min-w-0 truncate">{m.product.nameAr} <span className="text-xs text-ink-400">· {MOVEMENT_LABELS[m.type]}{m.user ? ` · ${m.user.name}` : ""}</span></span>
                  <span className={`shrink-0 font-semibold tabular ${m.quantity > 0 ? "text-green-700" : "text-red-600"}`} dir="ltr">{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-ink-400">لا توجد حركات بعد.</p>}
        </Card>

        {auditRows.length > 0 && (
          <Card title="آخر العمليات الإدارية" actions={<Link href="/admin/audit" className="text-sm text-brand-600">السجل الكامل</Link>}>
            <ul className="divide-y divide-ink-100 text-sm">
              {auditRows.map((a) => (
                <li key={a.id} className="flex justify-between gap-2 py-2"><span>{a.user?.name ?? "—"} · <span className="font-mono text-xs">{a.action}</span></span><span className="text-xs text-ink-400 tabular">{formatDateTime(a.createdAt)}</span></li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </>
  );
}
