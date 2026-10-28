import { NextResponse } from "next/server";
import { cartInputSchema, computeQuote } from "@/lib/pricing";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp, sameOrigin } from "@/lib/request";

export async function POST(req: Request) {
  if (!(await sameOrigin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!(await rateLimit(`quote:${await clientIp()}`, 90, 60))) return NextResponse.json({ error: "طلبات كثيرة، حاول بعد قليل" }, { status: 429 });
  const body = await req.json().catch(() => null);
  const parsed = cartInputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  const q = await computeQuote(parsed.data);
  // لا نرسل التكلفة للمتصفح أبداً
  return NextResponse.json({ ...q, lines: q.lines.map(({ unitCost: _c, ...l }) => l) }, { headers: { "Cache-Control": "no-store" } });
}
