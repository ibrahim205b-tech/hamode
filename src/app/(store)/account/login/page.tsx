import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "../AuthForms";

export const metadata: Metadata = { title: "تسجيل الدخول", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getCurrentUser()) redirect("/account");
  return (
    <div className="container max-w-md py-12">
      <div className="card p-6 sm:p-8">
        <h1 className="mb-1 text-2xl font-bold text-white">تسجيل الدخول</h1>
        <p className="mb-6 text-sm text-ink-300">الحساب اختياري — يمكنك الطلب كضيف دون تسجيل.</p>
        <LoginForm next={(await searchParams).next} />
      </div>
    </div>
  );
}
