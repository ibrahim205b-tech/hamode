import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Logo } from "@/components/ui/Logo";
import { SetupForm } from "../Forms";

export const metadata = { title: "الإعداد الأولي" };
export const dynamic = "force-dynamic";

export default async function SetupPage() {
  // الصفحة غير موجودة بعد إنشاء أول مدير
  if ((await prisma.user.count({ where: { role: { in: ["OWNER", "ADMIN"] } } })) > 0) notFound();
  return (
    <div className="grid min-h-screen place-items-center bg-ink-950 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl">
        <div className="mb-6 flex justify-center"><Logo dark={false} /></div>
        <h1 className="mb-2 text-lg font-bold">إنشاء حساب المالك (لمرة واحدة)</h1>
        <p className="mb-5 text-sm leading-6 text-ink-500">تتطلب هذه الصفحة رمز SETUP_TOKEN المضبوط في متغيرات البيئة على الخادم. بعد إنشاء الحساب تُعطَّل الصفحة تلقائياً — احذف SETUP_TOKEN بعدها.</p>
        <SetupForm />
      </div>
    </div>
  );
}
