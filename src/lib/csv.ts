import Papa from "papaparse";

/** يولّد CSV بترميز UTF-8 مع BOM ليفتح بشكل صحيح في Excel مع العربية */
export function toCsv(rows: Record<string, unknown>[], columns?: string[]): string {
  const cols = columns ?? (rows[0] ? Object.keys(rows[0]) : []);
  const safe = rows.map((r) => {
    const o: Record<string, unknown> = {};
    for (const c of cols) {
      let v = r[c];
      if (v instanceof Date) v = v.toISOString();
      // منع حقن الصيغ في Excel
      if (typeof v === "string" && /^[=+\-@\t\r]/.test(v)) v = `'${v}`;
      o[c] = v ?? "";
    }
    return o;
  });
  return "﻿" + Papa.unparse({ fields: cols, data: safe.map((o) => cols.map((c) => o[c])) });
}

export function parseCsv(text: string): { rows: Record<string, string>[]; errors: string[] } {
  const res = Papa.parse<Record<string, string>>(text.replace(/^﻿/, ""), { header: true, skipEmptyLines: "greedy", transformHeader: (h) => h.trim() });
  return { rows: res.data, errors: res.errors.slice(0, 20).map((e) => `سطر ${(e.row ?? 0) + 2}: ${e.message}`) };
}

export function csvResponse(csv: string, filename: string) {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
