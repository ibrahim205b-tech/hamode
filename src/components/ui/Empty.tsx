import type { ReactNode } from "react";
import { SearchX } from "lucide-react";

export function EmptyState({ title, text, icon, action }: { title: string; text?: string; icon?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-600 px-6 py-14 text-center">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-ink-800 text-ink-300">{icon ?? <SearchX className="h-7 w-7" />}</div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {text && <p className="mt-1.5 max-w-md text-sm leading-7 text-ink-300">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
