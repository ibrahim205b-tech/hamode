"use client";

import { Printer } from "lucide-react";

export function PrintBar({ autoPrint = false, extra }: { autoPrint?: boolean; extra?: React.ReactNode }) {
  return (
    <div className="no-print sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-ink-100 bg-white p-3">
      <button onClick={() => window.print()} className="btn-primary btn-sm" autoFocus={autoPrint}><Printer className="h-4 w-4" /> طباعة / حفظ PDF</button>
      {extra}
      <span className="text-xs text-ink-400">للإيصالات الحرارية: اختر الطابعة وحجم الورق المناسب، وألغِ الهوامش والرأس/التذييل في نافذة الطباعة.</span>
    </div>
  );
}
