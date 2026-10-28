"use client";

import { useActionForm } from "@/components/ui/useActionForm";
import Link from "next/link";
import { loginCustomer, registerCustomer, resetPassword, updateProfile, changePassword, addAddress, type FormState } from "./actions";
import { FormMessage, SubmitButton } from "@/components/store/FormBits";

export function LoginForm({ next }: { next?: string }) {
  const { state: state, pending, onSubmit } = useActionForm<FormState>(loginCustomer, {});
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <div><label className="label" htmlFor="l-phone">رقم الهاتف</label><input id="l-phone" name="phone" className="input" dir="ltr" inputMode="tel" autoComplete="tel" required /></div>
      <div><label className="label" htmlFor="l-pw">كلمة المرور</label><input id="l-pw" name="password" type="password" className="input" autoComplete="current-password" required /></div>
      <FormMessage state={state} />
      <SubmitButton pending={pending} className="btn-primary w-full">تسجيل الدخول</SubmitButton>
      <div className="flex justify-between text-sm"><Link href="/account/register" className="link">إنشاء حساب</Link><Link href="/account/forgot" className="text-ink-400 hover:text-white">نسيت كلمة المرور؟</Link></div>
    </form>
  );
}

export function RegisterForm() {
  const { state: state, pending, onSubmit } = useActionForm<FormState>(registerCustomer, {});
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div><label className="label" htmlFor="r-name">الاسم</label><input id="r-name" name="name" className="input" autoComplete="name" required /></div>
      <div><label className="label" htmlFor="r-phone">رقم الهاتف</label><input id="r-phone" name="phone" className="input" dir="ltr" inputMode="tel" autoComplete="tel" placeholder="07XXXXXXXXX" required /></div>
      <div><label className="label" htmlFor="r-pw">كلمة المرور (10 أحرف على الأقل، أحرف وأرقام)</label><input id="r-pw" name="password" type="password" className="input" autoComplete="new-password" minLength={10} required /></div>
      <div><label className="label" htmlFor="r-pw2">تأكيد كلمة المرور</label><input id="r-pw2" name="password2" type="password" className="input" autoComplete="new-password" required /></div>
      <FormMessage state={state} />
      <SubmitButton pending={pending} className="btn-primary w-full">إنشاء الحساب</SubmitButton>
      <p className="text-center text-sm text-ink-300">لديك حساب؟ <Link href="/account/login" className="link">سجّل الدخول</Link></p>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const { state: state, pending, onSubmit } = useActionForm<FormState>(resetPassword, {});
  if (state.ok) return <div className="space-y-4"><FormMessage state={state} /><Link href="/account/login" className="btn-primary w-full">تسجيل الدخول</Link></div>;
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <div><label className="label" htmlFor="rs-pw">كلمة المرور الجديدة</label><input id="rs-pw" name="password" type="password" className="input" autoComplete="new-password" required /></div>
      <div><label className="label" htmlFor="rs-pw2">تأكيد كلمة المرور</label><input id="rs-pw2" name="password2" type="password" className="input" autoComplete="new-password" required /></div>
      <FormMessage state={state} />
      <SubmitButton pending={pending} className="btn-primary w-full">حفظ كلمة المرور</SubmitButton>
    </form>
  );
}

export function ProfileForm({ name }: { name: string }) {
  const { state: state, pending, onSubmit } = useActionForm<FormState>(updateProfile, {});
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div><label className="label" htmlFor="p-name">الاسم</label><input id="p-name" name="name" defaultValue={name} className="input" required /></div>
      <FormMessage state={state} />
      <SubmitButton pending={pending} className="btn-secondary">حفظ</SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const { state: state, pending, onSubmit } = useActionForm<FormState>(changePassword, {});
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div><label className="label" htmlFor="pw-cur">كلمة المرور الحالية</label><input id="pw-cur" name="current" type="password" className="input" autoComplete="current-password" required /></div>
      <div><label className="label" htmlFor="pw-new">كلمة المرور الجديدة</label><input id="pw-new" name="next" type="password" className="input" autoComplete="new-password" required /></div>
      <FormMessage state={state} />
      <SubmitButton pending={pending} className="btn-secondary">تغيير كلمة المرور</SubmitButton>
    </form>
  );
}

export function AddressForm({ governorates }: { governorates: readonly string[] }) {
  const { state: state, pending, onSubmit } = useActionForm<FormState>(addAddress, {});
  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
      <div><label className="label" htmlFor="a-label">اسم العنوان (اختياري)</label><input id="a-label" name="label" className="input" placeholder="البيت، المحل…" /></div>
      <div>
        <label className="label" htmlFor="a-gov">المحافظة</label>
        <select id="a-gov" name="governorate" className="input" required defaultValue=""><option value="" disabled>اختر</option>{governorates.map((g) => <option key={g}>{g}</option>)}</select>
      </div>
      <div><label className="label" htmlFor="a-area">المنطقة</label><input id="a-area" name="area" className="input" required /></div>
      <div><label className="label" htmlFor="a-addr">العنوان</label><input id="a-addr" name="address" className="input" required /></div>
      <div className="sm:col-span-2"><FormMessage state={state} /></div>
      <div><SubmitButton pending={pending} className="btn-secondary">إضافة عنوان</SubmitButton></div>
    </form>
  );
}
