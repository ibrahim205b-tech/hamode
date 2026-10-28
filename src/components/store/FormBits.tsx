"use client";

import { Loader2 } from "lucide-react";

export function SubmitButton({ children, className = "btn-primary", pendingText, pending = false }: { children: React.ReactNode; className?: string; pendingText?: string; pending?: boolean }) {
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {pending && pendingText ? pendingText : children}
    </button>
  );
}

export function FormMessage({ state }: { state: { error?: string; ok?: string } }) {
  if (state.error) return <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-red-300">{state.error}</p>;
  if (state.ok) return <p role="status" className="rounded-lg border border-success/40 bg-success/10 p-3 text-sm text-green-400">{state.ok}</p>;
  return null;
}
