import { formatIQD } from "./format";

export const DEFAULT_WHATSAPP_LOCAL = "07700733822";

/**
 * يحوّل رقماً عراقياً إلى الصيغة الدولية المستخدمة في wa.me
 * 07700733822 → 9647700733822 ، +964 770 073 3822 → 9647700733822
 * يعيد null إذا كان الرقم غير صالح.
 */
export function toInternationalIraqi(input: string | null | undefined): string | null {
  if (!input) return null;
  let d = input.replace(/[٠-٩]/g, (c) => String("٠١٢٣٤٥٦٧٨٩".indexOf(c))).replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("964")) d = d.slice(3);
  if (d.startsWith("0")) d = d.slice(1);
  // أرقام الموبايل العراقية: 7XXXXXXXXX (10 أرقام بدون الصفر)
  if (!/^7\d{9}$/.test(d)) return null;
  return `964${d}`;
}

export function toLocalIraqi(input: string | null | undefined): string | null {
  const intl = toInternationalIraqi(input);
  return intl ? `0${intl.slice(3)}` : null;
}

export function waLink(intlNumber: string, text?: string): string {
  const base = `https://wa.me/${intlNumber}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

export type WaLine = { name: string; sku?: string | null; quantity: number; unitPrice: number };

export function productInquiryMessage(p: {
  name: string;
  sku?: string | null;
  model?: string | null;
  url: string;
}): string {
  const lines = [
    "السلام عليكم، أود الاستفسار عن هذا المنتج:",
    `• المنتج: ${p.name}`,
    p.sku ? `• رمز المنتج (SKU): ${p.sku}` : null,
    p.model ? `• الجهاز: ${p.model}` : null,
    `• الرابط: ${p.url}`,
    "",
    "يرجى تأكيد التوفر والسعر. شكراً.",
  ];
  return lines.filter((l) => l !== null).join("\n");
}

export function cartShareMessage(c: {
  lines: WaLine[];
  subtotal: number;
  deliveryFee?: number | null;
  total: number;
  deliveryKnown: boolean;
}): string {
  const out = ["السلام عليكم، أود طلب المنتجات التالية:", ""];
  c.lines.forEach((l, i) => {
    out.push(`${i + 1}. ${l.name}${l.sku ? ` (${l.sku})` : ""}`);
    out.push(`   الكمية: ${l.quantity} × ${formatIQD(l.unitPrice)} = ${formatIQD(l.unitPrice * l.quantity)}`);
  });
  out.push("");
  out.push(`المجموع الفرعي: ${formatIQD(c.subtotal)}`);
  if (c.deliveryKnown && c.deliveryFee != null) out.push(`التوصيل: ${formatIQD(c.deliveryFee)}`);
  else out.push("التوصيل: يُحدد حسب المحافظة");
  out.push(`${c.deliveryKnown ? "الإجمالي" : "الإجمالي التقديري"}: ${formatIQD(c.total)}`);
  out.push("");
  out.push("* الأسعار تقديرية وتحتاج تأكيد التوفر من المتجر.");
  return out.join("\n");
}

export function orderShareMessage(o: {
  number: string;
  lines: WaLine[];
  subtotal: number;
  discountTotal: number;
  deliveryFee: number;
  total: number;
  customerName: string;
  governorate: string;
  area: string;
}): string {
  const out = [`السلام عليكم، قمت بتسجيل طلب في الموقع.`, `رقم الطلب: ${o.number}`, ""];
  o.lines.forEach((l, i) => {
    out.push(`${i + 1}. ${l.name}${l.sku ? ` (${l.sku})` : ""}`);
    out.push(`   ${l.quantity} × ${formatIQD(l.unitPrice)} = ${formatIQD(l.unitPrice * l.quantity)}`);
  });
  out.push("");
  out.push(`المجموع الفرعي: ${formatIQD(o.subtotal)}`);
  if (o.discountTotal > 0) out.push(`الخصم: -${formatIQD(o.discountTotal)}`);
  out.push(`التوصيل: ${formatIQD(o.deliveryFee)}`);
  out.push(`الإجمالي: ${formatIQD(o.total)}`);
  out.push("");
  out.push(`الاسم: ${o.customerName}`);
  out.push(`التوصيل إلى: ${o.governorate} - ${o.area}`);
  out.push("");
  out.push("يرجى تأكيد الطلب. شكراً.");
  return out.join("\n");
}
