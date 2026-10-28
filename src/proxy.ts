import { NextResponse, type NextRequest } from "next/server";

// طبقة حماية أولى فقط: التحقق الحقيقي من الجلسة والصلاحيات يتم في كل صفحة وإجراء على الخادم
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login") && !pathname.startsWith("/admin/setup")) {
    if (!req.cookies.get("he_session")) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
