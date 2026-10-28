"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, ShoppingCart, Package, Boxes, FolderTree, Smartphone, Users, Truck, ClipboardList, BarChart3,
  Percent, Settings, ShieldCheck, ScrollText, Menu, X, Store, Layers,
} from "lucide-react";

const ICONS = { LayoutDashboard, ShoppingCart, Package, Boxes, FolderTree, Smartphone, Users, Truck, ClipboardList, BarChart3, Percent, Settings, ShieldCheck, ScrollText, Layers };
export type NavItem = { href: string; label: string; icon: keyof typeof ICONS };

export function AdminNav({ items, user }: { items: NavItem[]; user: { name: string; role: string } }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  const nav = (
    <nav className="flex flex-col gap-0.5 p-3" aria-label="قائمة الإدارة">
      {items.map((it) => {
        const Icon = ICONS[it.icon];
        const active = it.href === "/admin" ? path === "/admin" : path.startsWith(it.href);
        return (
          <Link key={it.href} href={it.href} aria-current={active ? "page" : undefined} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${active ? "bg-brand-500 text-white" : "text-ink-200 hover:bg-ink-800 hover:text-white"}`}>
            <Icon className="h-4 w-4" /> {it.label}
          </Link>
        );
      })}
      <div className="my-2 h-px bg-ink-700" />
      <Link href="/" target="_blank" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink-300 hover:bg-ink-800 hover:text-white"><Store className="h-4 w-4" /> عرض المتجر</Link>
    </nav>
  );
  return (
    <>
      <aside className="admin-nav fixed inset-y-0 start-0 z-30 hidden w-60 overflow-y-auto bg-ink-900 lg:block">
        <div className="border-b border-ink-700 px-5 py-4"><p className="font-bold text-white">حمودي الخبير</p><p className="text-xs text-ink-400">{user.name} · {user.role}</p></div>
        {nav}
      </aside>
      <div className="no-print sticky top-0 z-30 flex items-center justify-between bg-ink-900 px-4 py-3 text-white lg:hidden">
        <button onClick={() => setOpen(true)} className="grid h-10 w-10 place-items-center rounded-lg bg-ink-800" aria-label="القائمة"><Menu className="h-5 w-5" /></button>
        <span className="font-bold">لوحة التحكم</span>
        <span className="w-10" />
      </div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} aria-label="إغلاق" />
          <aside className="absolute inset-y-0 start-0 w-72 overflow-y-auto bg-ink-900">
            <div className="flex items-center justify-between border-b border-ink-700 px-4 py-3 text-white"><span className="font-bold">القائمة</span><button onClick={() => setOpen(false)} aria-label="إغلاق"><X className="h-5 w-5" /></button></div>
            {nav}
          </aside>
        </div>
      )}
    </>
  );
}
