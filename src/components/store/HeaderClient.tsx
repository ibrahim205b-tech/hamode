"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, ShoppingBag, X, User, Search } from "lucide-react";
import { useCart } from "./CartProvider";
import { CategoryIcon } from "../ui/icons";

export function CartButton() {
  const { count, ready } = useCart();
  return (
    <Link href="/cart" className="relative grid h-11 w-11 place-items-center rounded-xl border border-ink-700 bg-ink-850 text-ink-100 transition hover:border-brand-500/60 hover:text-white" aria-label={`سلة التسوق${ready && count ? ` (${count})` : ""}`}>
      <ShoppingBag className="h-5 w-5" />
      {ready && count > 0 && (
        <span className="absolute -end-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand-gradient px-1 text-[11px] font-bold text-ink-950 tabular">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

type NavCat = { slug: string; nameAr: string; icon: string | null };

export function MobileMenu({ cats, extraLinks }: { cats: NavCat[]; extraLinks: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="grid h-11 w-11 place-items-center rounded-xl border border-ink-700 bg-ink-850 lg:hidden" aria-label="القائمة" aria-expanded={open}>
        <Menu className="h-5 w-5" />
      </button>
      {open && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="القائمة الرئيسية">
          <button className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} aria-label="إغلاق" />
          <nav className="absolute inset-y-0 start-0 flex w-[86%] max-w-sm animate-fade-up flex-col overflow-y-auto border-e border-ink-700 bg-ink-900 p-4">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-bold">الأقسام</span>
              <button onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-xl bg-ink-800" aria-label="إغلاق القائمة">
                <X className="h-5 w-5" />
              </button>
            </div>
            <ul className="space-y-1">
              {cats.map((c) => (
                <li key={c.slug}>
                  <Link href={`/category/${c.slug}`} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-ink-800">
                    <CategoryIcon name={c.icon} className="h-5 w-5 text-cyan-400" /> {c.nameAr}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="my-4 h-px bg-ink-700" />
            <ul className="space-y-1">
              {extraLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="block rounded-xl px-3 py-2.5 text-ink-200 hover:bg-ink-800">{l.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}
    </>
  );
}

export function MobileSearchToggle({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);
  return (
    <>
      <button type="button" onClick={() => setOpen((o) => !o)} className="grid h-11 w-11 place-items-center rounded-xl border border-ink-700 bg-ink-850 md:hidden" aria-label="بحث" aria-expanded={open}>
        <Search className="h-5 w-5" />
      </button>
      {open && <div className="absolute inset-x-0 top-full border-b border-ink-700 bg-ink-900/95 p-3 backdrop-blur md:hidden">{children}</div>}
    </>
  );
}

export function AccountLink() {
  return (
    <Link href="/account" className="hidden h-11 w-11 place-items-center rounded-xl border border-ink-700 bg-ink-850 text-ink-100 hover:text-white sm:grid" aria-label="حسابي">
      <User className="h-5 w-5" />
    </Link>
  );
}
