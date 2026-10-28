"use client";

import { startTransition, useActionState, type FormEvent } from "react";

/**
 * مثل useActionState لكن يرسل النموذج عبر onSubmit بدلاً من خاصية action،
 * لأن React 19 يمسح حقول النموذج تلقائياً بعد كل إجراء — وهذا يضيع ما كتبه المستخدم عند ظهور خطأ.
 */
export function useActionForm<S extends object>(action: (prev: S, fd: FormData) => Promise<S>, initial: S, confirmText?: string) {
  const [state, dispatch, pending] = useActionState<S, FormData>(
    action as unknown as (prev: Awaited<S>, fd: FormData) => Promise<S>,
    initial as Awaited<S>,
  );
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    if (confirmText && !window.confirm(confirmText)) return;
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    const fd = new FormData(e.currentTarget, submitter);
    startTransition(() => dispatch(fd));
  };
  return { state, pending, onSubmit };
}
