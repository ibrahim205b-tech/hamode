"use client";

import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { useActionForm } from "../ui/useActionForm";

export type ActionResult = { ok?: string; error?: string };

/** نموذج إداري عام: يعرض نتيجة الإجراء، يمنع الإرسال المزدوج، ولا يمسح ما كتبه المستخدم عند الخطأ */
export function ActionForm({
  action, children, submitLabel = "حفظ", submitClass = "btn-primary", className = "space-y-4", confirm, resetOnSuccess = false, inline = false,
}: {
  action: (prev: ActionResult, fd: FormData) => Promise<ActionResult>;
  children?: React.ReactNode; submitLabel?: React.ReactNode; submitClass?: string; className?: string; confirm?: string; resetOnSuccess?: boolean; inline?: boolean;
}) {
  const { state, pending, onSubmit } = useActionForm<ActionResult>(action, {}, confirm);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <form ref={ref} onSubmit={onSubmit} className={className}>
      {children}
      <div className={inline ? "contents" : "flex flex-wrap items-center gap-3"}>
        <button type="submit" disabled={pending} aria-busy={pending} className={submitClass}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} {submitLabel}
        </button>
        {state.error && <span role="alert" className="text-sm text-red-600">{state.error}</span>}
        {state.ok && <span role="status" className="text-sm text-green-700">{state.ok}</span>}
      </div>
    </form>
  );
}
