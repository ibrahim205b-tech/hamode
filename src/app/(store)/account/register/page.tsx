import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { RegisterForm } from "../AuthForms";

export const metadata: Metadata = { title: "إنشاء حساب", robots: { index: false } };

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/account");
  return (
    <div className="container max-w-md py-12">
      <div className="card p-6 sm:p-8">
        <h1 className="mb-1 text-2xl font-bold text-white">إنشاء حساب</h1>
        <p className="mb-6 text-sm text-ink-300">لمتابعة طلباتك وحفظ عناوينك وإعادة الطلب بسرعة.</p>
        <RegisterForm />
      </div>
    </div>
  );
}
