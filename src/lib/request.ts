import { headers } from "next/headers";

export async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  return (fwd?.split(",")[0] || h.get("x-real-ip") || "unknown").trim();
}

export async function userAgent(): Promise<string> {
  return ((await headers()).get("user-agent") || "").slice(0, 300);
}

/** حماية CSRF إضافية لنقاط API: يجب أن يطابق Origin عنوان الموقع */
export async function sameOrigin(): Promise<boolean> {
  const h = await headers();
  const origin = h.get("origin");
  if (!origin) return true; // طلبات GET العادية أو من نفس الصفحة بدون Origin
  const host = h.get("x-forwarded-host") || h.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
