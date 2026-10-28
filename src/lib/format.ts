const nf = new Intl.NumberFormat("en-US");

export function formatIQD(amount: number | null | undefined): string {
  return `${nf.format(Math.round(amount ?? 0))} د.ع`;
}

export function formatNumber(n: number): string {
  return nf.format(n);
}

export function formatDateTime(d: Date | string): string {
  return new Intl.DateTimeFormat("ar-IQ-u-nu-latn", {
    timeZone: "Asia/Baghdad",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(d));
}

export function formatDate(d: Date | string): string {
  return new Intl.DateTimeFormat("ar-IQ-u-nu-latn", {
    timeZone: "Asia/Baghdad",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(d));
}

/** تاريخ بصيغة YYYY-MM-DD بتوقيت بغداد */
export function isoDay(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Baghdad" }).format(d);
}

/** بداية يوم بتوقيت بغداد (UTC+3 ثابت، العراق لا يعتمد التوقيت الصيفي) */
export function baghdadDayStart(day: string): Date {
  return new Date(`${day}T00:00:00+03:00`);
}
