import Link from "next/link";
import { Download, Printer } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { loadReport } from "@/lib/report-data";
import { PageHeader } from "@/components/admin/ui";
import { ALL_SECTIONS, ReportTables } from "@/components/admin/ReportTables";

export const metadata = { title: "التقارير" };

type SP = Promise<{ from?: string; to?: string; preset?: string; bucket?: string; tab?: string }>;

export default async function ReportsPage({ searchParams }: { searchParams: SP }) {
  await requireStaff("reports");
  const sp = await searchParams;
  const { range, bucket, data } = await loadReport(sp);
  const tab = ALL_SECTIONS.some(([k]) => k === sp.tab) ? sp.tab! : "all";
  const sections = new Set(tab === "all" ? ALL_SECTIONS.map(([k]) => k) : [tab]);
  const base = `from=${range.from}&to=${range.to}&bucket=${bucket}`;
  return (
    <>
      <PageHeader
        title="التقارير"
        subtitle={`الفترة: ${range.from} إلى ${range.to}`}
        actions={
          <>
            <Link href={`/admin/print/report?${base}&tab=${tab}`} target="_blank" className="btn-secondary btn-sm"><Printer className="h-4 w-4" /> طباعة</Link>
            <a href={`/admin/export/sales-products?${base}`} className="btn-secondary btn-sm"><Download className="h-4 w-4" /> CSV المنتجات</a>
            <a href={`/admin/export/sales-periods?${base}`} className="btn-secondary btn-sm"><Download className="h-4 w-4" /> CSV الفترات</a>
            <a href={`/admin/export/movements?${base}`} className="btn-secondary btn-sm"><Download className="h-4 w-4" /> CSV حركات المخزون</a>
          </>
        }
      />
      <form className="card mb-4 flex flex-wrap items-end gap-3 p-4">
        <div><label className="label" htmlFor="from">من</label><input id="from" type="date" name="from" defaultValue={range.from} className="input" /></div>
        <div><label className="label" htmlFor="to">إلى</label><input id="to" type="date" name="to" defaultValue={range.to} className="input" /></div>
        <div><label className="label" htmlFor="bucket">التجميع</label><select id="bucket" name="bucket" defaultValue={bucket} className="input"><option value="day">يومي</option><option value="week">أسبوعي</option><option value="month">شهري</option></select></div>
        <input type="hidden" name="tab" value={tab} />
        <button className="btn-primary">عرض</button>
        <div className="flex flex-wrap gap-1 text-sm">
          {[["today", "اليوم"], ["week", "آخر 7 أيام"], ["month", "هذا الشهر"], ["30", "آخر 30 يوماً"]].map(([k, l]) => (
            <Link key={k} href={`/admin/reports?preset=${k}&bucket=${bucket}&tab=${tab}`} className="btn-ghost btn-sm">{l}</Link>
          ))}
        </div>
      </form>
      <nav className="no-print mb-4 flex flex-wrap gap-1" aria-label="أقسام التقرير">
        <Link href={`/admin/reports?${base}&tab=all`} className={`btn-sm btn ${tab === "all" ? "bg-ink-900 text-white" : "bg-white"}`}>الكل</Link>
        {ALL_SECTIONS.map(([k, l]) => <Link key={k} href={`/admin/reports?${base}&tab=${k}`} className={`btn-sm btn ${tab === k ? "bg-ink-900 text-white" : "bg-white"}`}>{l}</Link>)}
      </nav>
      <ReportTables d={data} sections={sections} />
    </>
  );
}
