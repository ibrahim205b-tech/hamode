import { NextResponse } from "next/server";
import { checkoutSchema, createOrder } from "@/lib/orders";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp, sameOrigin } from "@/lib/request";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: Request) {
  if (!(await sameOrigin())) return NextResponse.json({ ok: false, error: "طلب غير مسموح" }, { status: 403 });
  const ip = await clientIp();
  const limit = Math.max(1, parseInt(process.env.ORDER_RATE_LIMIT || "10") || 10);
  if (!(await rateLimit(`order:${ip}`, limit, 600))) {
    return NextResponse.json({ ok: false, error: "عدد كبير من الطلبات خلال وقت قصير. حاول لاحقاً أو تواصل معنا عبر واتساب." }, { status: 429 });
  }
  const body = await req.json().catch(() => null);
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ ok: false, error: first?.message && /[؀-ۿ]/.test(first.message) ? first.message : "تحقق من البيانات المدخلة", field: first?.path.join(".") }, { status: 400 });
  }
  const user = await getCurrentUser();
  try {
    const result = await createOrder(parsed.data, user?.id ?? null);
    return NextResponse.json(result, { status: result.ok ? 200 : 409 });
  } catch (e) {
    console.error("order create failed", e);
    return NextResponse.json({ ok: false, error: "حدث خطأ غير متوقع أثناء حفظ الطلب. لم يتم تسجيل الطلب، حاول مرة أخرى." }, { status: 500 });
  }
}
