"use client";

import { useActionForm } from "@/components/ui/useActionForm";
import { adminLogin, setupOwner, type AuthState } from "./actions";
import { SubmitButton } from "@/components/store/FormBits";

export function AdminLoginForm() {
  const { state: s, pending, onSubmit } = useActionForm<AuthState>(adminLogin, {});
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div><label className="label" htmlFor="email">البريد الإلكتروني</label><input id="email" name="email" type="email" dir="ltr" className="input" autoComplete="username" required /></div>
      <div><label className="label" htmlFor="pw">كلمة المرور</label><input id="pw" name="password" type="password" className="input" autoComplete="current-password" required /></div>
      {s.error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{s.error}</p>}
      <SubmitButton pending={pending} className="btn-primary w-full">دخول</SubmitButton>
    </form>
  );
}

export function SetupForm() {
  const { state: s, pending, onSubmit } = useActionForm<AuthState>(setupOwner, {});
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div><label className="label" htmlFor="token">رمز الإعداد (SETUP_TOKEN)</label><input id="token" name="token" type="password" dir="ltr" className="input" required /></div>
      <div><label className="label" htmlFor="name">اسم المالك</label><input id="name" name="name" className="input" required /></div>
      <div><label className="label" htmlFor="email">البريد الإلكتروني</label><input id="email" name="email" type="email" dir="ltr" className="input" required /></div>
      <div><label className="label" htmlFor="pw">كلمة المرور (10 أحرف على الأقل)</label><input id="pw" name="password" type="password" className="input" autoComplete="new-password" required /></div>
      {s.error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{s.error}</p>}
      <SubmitButton pending={pending} className="btn-primary w-full">إنشاء حساب المالك</SubmitButton>
    </form>
  );
}
