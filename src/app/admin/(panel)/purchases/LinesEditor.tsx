"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

type Line = { sku: string; quantity: string; unitCost: string };

export function LinesEditor() {
  const [lines, setLines] = useState<Line[]>([{ sku: "", quantity: "1", unitCost: "" }]);
  const upd = (i: number, k: keyof Line, v: string) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, [k]: v } : l)));
  const json = JSON.stringify(lines.filter((l) => l.sku.trim()).map((l) => ({ sku: l.sku.trim().toUpperCase(), quantity: parseInt(l.quantity) || 0, unitCost: parseInt(l.unitCost.replace(/,/g, "")) || 0 })));
  const total = lines.reduce((a, l) => a + (parseInt(l.quantity) || 0) * (parseInt(l.unitCost.replace(/,/g, "")) || 0), 0);
  return (
    <div>
      <input type="hidden" name="lines" value={json} />
      <table className="table-admin">
        <thead><tr><th>SKU المنتج</th><th>الكمية</th><th>تكلفة الوحدة (د.ع)</th><th>المجموع</th><th></th></tr></thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i}>
              <td><input className="input font-mono" dir="ltr" value={l.sku} onChange={(e) => upd(i, "sku", e.target.value)} aria-label="SKU" /></td>
              <td><input className="input w-24" dir="ltr" inputMode="numeric" value={l.quantity} onChange={(e) => upd(i, "quantity", e.target.value)} aria-label="الكمية" /></td>
              <td><input className="input w-36" dir="ltr" inputMode="numeric" value={l.unitCost} onChange={(e) => upd(i, "unitCost", e.target.value)} aria-label="التكلفة" /></td>
              <td className="tabular">{((parseInt(l.quantity) || 0) * (parseInt(l.unitCost.replace(/,/g, "")) || 0)).toLocaleString("en-US")}</td>
              <td><button type="button" className="btn-ghost btn-sm" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} aria-label="حذف السطر"><Trash2 className="h-4 w-4" /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 flex items-center justify-between">
        <button type="button" className="btn-secondary btn-sm" onClick={() => setLines((ls) => [...ls, { sku: "", quantity: "1", unitCost: "" }])}><Plus className="h-4 w-4" /> سطر</button>
        <span className="font-bold tabular">الإجمالي: {total.toLocaleString("en-US")} د.ع</span>
      </div>
    </div>
  );
}
