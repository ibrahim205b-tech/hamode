import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, isStaffRole } from "@/lib/auth";
import { Logo } from "@/components/ui/Logo";
import { AdminLoginForm } from "../Forms";

export const metadata = { title: "دخول الإدارة" };

export default async function AdminLoginPage() {
  const u = await getCurrentUser();
  if (u && isStaffRole(u.role)) redirect("/admin");
  return (
    <div className="grid min-h-screen place-items-center bg-ink-950 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-7 shadow-2xl">
        <div className="mb-6 flex justify-center"><Logo dark={false} /></div>
        <h1 className="mb-5 text-center text-lg font-bold">دخول لوحة التحكم</h1>
        <AdminLoginForm />
        <p className="mt-5 text-center text-xs text-ink-400"><Link href="/" className="hover:text-ink-700">العودة إلى المتجر</Link></p>
      </div>
    </div>
  );
}
