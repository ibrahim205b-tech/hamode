import { requireStaff } from "@/lib/auth";
import { loadReport } from "@/lib/report-data";
import { getSettings } from "@/lib/settings";
import { formatDateTime } from "@/lib/format";
import { LogoMark } from "@/components/ui/Logo";
import { ALL_SECTIONS, ReportTables } from "@/components/admin/ReportTables";
import { PrintBar } from "../PrintBar";

export const metadata = { title: "طباعة تقرير" };

export default async function PrintReport({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; bucket?: string; tab?: string }> }) {
  await requireStaff("reports");
  const sp = await searchParams;
  const [{ range, data }, s] = await Promise.all([loadReport(sp), getSettings()]);
  const sections = new Set(ALL_SECTIONS.some(([k]) => k === sp.tab) ? [sp.tab!] : ALL_SECTIONS.map(([k]) => k));
  return (
    <div className="min-h-screen bg-white">
      <style>{`@page { size: A4; margin: 12mm; }`}</style>
      <PrintBar />
      <div className="print-area mx-auto max-w-[210mm] p-6">
        <header className="mb-6 flex items-center justify-between border-b border-ink-100 pb-3">
          <div className="flex items-center gap-2"><LogoMark size={40} /><div><p className="font-bold">{s.nameAr}</p><p className="text-[10px] tracking-widest text-brand-600" dir="ltr">{s.nameEn}</p></div></div>
          <div className="text-end text-xs"><p className="font-bold">تقرير المبيعات والمخزون</p><p>الفترة: {range.from} — {range.to}</p><p>طُبع: {formatDateTime(new Date())}</p></div>
        </header>
        <ReportTables d={data} sections={sections} links={false} />
      </div>
    </div>
  );
}
