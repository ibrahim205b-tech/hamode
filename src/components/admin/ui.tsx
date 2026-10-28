import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
      </div>
      {actions && <div className="no-print flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, children, className = "", actions }: { title?: ReactNode; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={`card p-5 ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="font-bold text-ink-900">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint, tone = "default", href }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "default" | "brand" | "warn" | "danger" | "ok"; href?: string }) {
  const tones = { default: "text-ink-900", brand: "text-brand-600", warn: "text-amber-600", danger: "text-red-600", ok: "text-green-600" };
  const body = (
    <div className="card h-full p-4 transition hover:shadow-md">
      <p className="text-xs font-medium text-ink-500">{label}</p>
      <p className={`mt-1.5 text-2xl font-bold tabular ${tones[tone]}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export function Badge({ children, tone = "gray" }: { children: ReactNode; tone?: "gray" | "blue" | "green" | "amber" | "red" | "cyan" }) {
  const t = {
    gray: "bg-ink-100 text-ink-700",
    blue: "bg-brand-100 text-brand-700",
    green: "bg-green-100 text-green-800",
    amber: "bg-amber-100 text-amber-800",
    red: "bg-red-100 text-red-700",
    cyan: "bg-cyan-300/30 text-cyan-500",
  }[tone];
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${t}`}>{children}</span>;
}

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="card overflow-hidden p-0">
      <div className="overflow-x-auto"><table className="table-admin">{children}</table></div>
    </div>
  );
}

export function EmptyRow({ cols, text = "لا توجد بيانات" }: { cols: number; text?: string }) {
  return <tr><td colSpan={cols} className="py-10 text-center text-ink-400">{text}</td></tr>;
}

export function Pager({ page, pages, href }: { page: number; pages: number; href: (p: number) => string }) {
  if (pages <= 1) return null;
  return (
    <nav className="no-print mt-4 flex items-center justify-center gap-2" aria-label="الصفحات">
      {page > 1 && <Link className="btn-secondary btn-sm" href={href(page - 1)}>السابق</Link>}
      <span className="text-sm text-ink-500 tabular">صفحة {page} من {pages}</span>
      {page < pages && <Link className="btn-secondary btn-sm" href={href(page + 1)}>التالي</Link>}
    </nav>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "warn" | "error" | "ok"; children: ReactNode }) {
  const t = { info: "border-brand-100 bg-brand-100/50 text-brand-700", warn: "border-amber-200 bg-amber-50 text-amber-800", error: "border-red-200 bg-red-50 text-red-700", ok: "border-green-200 bg-green-50 text-green-800" }[tone];
  return <div className={`rounded-xl border px-4 py-3 text-sm leading-7 ${t}`}>{children}</div>;
}

export function Field({ label, name, defaultValue, type = "text", required, placeholder, dir, hint, className = "", step, min, max }: {
  label: string; name: string; defaultValue?: string | number | null; type?: string; required?: boolean; placeholder?: string; dir?: "ltr" | "rtl"; hint?: string; className?: string; step?: string; min?: number; max?: number;
}) {
  return (
    <div className={className}>
      <label className="label" htmlFor={`f-${name}`}>{label}{required && " *"}</label>
      <input id={`f-${name}`} name={name} type={type} defaultValue={defaultValue ?? ""} required={required} placeholder={placeholder} dir={dir} step={step} min={min} max={max} className="input" />
      {hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
    </div>
  );
}

export function TextArea({ label, name, defaultValue, rows = 3, hint, className = "", placeholder }: { label: string; name: string; defaultValue?: string | null; rows?: number; hint?: string; className?: string; placeholder?: string }) {
  return (
    <div className={className}>
      <label className="label" htmlFor={`f-${name}`}>{label}</label>
      <textarea id={`f-${name}`} name={name} defaultValue={defaultValue ?? ""} rows={rows} placeholder={placeholder} className="input" />
      {hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
    </div>
  );
}

export function Select({ label, name, defaultValue, options, required, className = "", empty }: { label: string; name: string; defaultValue?: string | null; options: { value: string; label: string; group?: string }[]; required?: boolean; className?: string; empty?: string }) {
  const groups = [...new Set(options.map((o) => o.group).filter(Boolean))] as string[];
  return (
    <div className={className}>
      <label className="label" htmlFor={`f-${name}`}>{label}{required && " *"}</label>
      <select id={`f-${name}`} name={name} defaultValue={defaultValue ?? ""} required={required} className="input">
        {empty !== undefined && <option value="">{empty}</option>}
        {groups.length
          ? groups.map((g) => <optgroup key={g} label={g}>{options.filter((o) => o.group === g).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</optgroup>)
          : options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

export function Check({ label, name, defaultChecked }: { label: string; name: string; defaultChecked?: boolean }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-700">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4 accent-brand-500" /> {label}
    </label>
  );
}
