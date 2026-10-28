"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Search, Smartphone, FolderOpen, Loader2 } from "lucide-react";
import { DEMO_STATIC, imageUrl } from "@/lib/demo";
import { loadDemoData, matchesQuery } from "./demoData";
import { normalizeArabic } from "@/lib/arabic";

type Suggest = {
  products: { slug: string; nameAr: string; sku: string; price: number; imageId: string | null }[];
  models: { slug: string; name: string; manufacturer: string }[];
  categories: { slug: string; nameAr: string }[];
};

type Item = { href: string; label: string; sub?: string; kind: "product" | "model" | "category"; imageId?: string | null };

export function SearchBox({ initial = "", autoFocus = false, size = "md" }: { initial?: string; autoFocus?: boolean; size?: "md" | "lg" }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Suggest | null>(null);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setData(null);
      return;
    }
    const t = setTimeout(async () => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setLoading(true);
      try {
        if (DEMO_STATIC) {
          const d = await loadDemoData();
          const n = normalizeArabic(term);
          setData({
            products: d.products.filter((p) => matchesQuery(p.searchText, term)).slice(0, 6).map((p) => ({ slug: p.slug, nameAr: p.nameAr, sku: p.sku, price: p.price, imageId: p.images[0]?.uploadId ?? null })),
            models: d.models.filter((m) => normalizeArabic(m.name).includes(n)).slice(0, 4),
            categories: d.categories.filter((c) => normalizeArabic(`${c.nameAr} ${c.nameEn ?? ""}`).includes(n)).slice(0, 3),
          });
          setLoading(false);
          return;
        }
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(term)}`, { signal: ac.signal });
        if (res.ok) setData(await res.json());
      } catch {}
      setLoading(false);
    }, 220);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const items: Item[] = data
    ? [
        ...data.models.map((m) => ({ href: `/products?model=${m.slug}`, label: m.name, sub: `قطع ${m.manufacturer}`, kind: "model" as const })),
        ...data.categories.map((c) => ({ href: `/category/${c.slug}`, label: c.nameAr, sub: "قسم", kind: "category" as const })),
        ...data.products.map((p) => ({ href: `/product/${p.slug}`, label: p.nameAr, sub: `${p.sku} · ${p.price.toLocaleString("en-US")} د.ع`, kind: "product" as const, imageId: p.imageId })),
      ]
    : [];

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setOpen(false);
    if (active >= 0 && items[active]) return router.push(items[active].href);
    const term = q.trim();
    router.push(term ? `/products?q=${encodeURIComponent(term)}` : "/products");
  };

  const showList = open && q.trim().length >= 2;

  return (
    <div ref={boxRef} className="relative w-full">
      <form role="search" onSubmit={submit} className="relative">
        <label htmlFor={`${listId}-in`} className="sr-only">ابحث عن قطعة</label>
        <input
          id={`${listId}-in`}
          type="search"
          value={q}
          autoFocus={autoFocus}
          autoComplete="off"
          enterKeyHint="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          placeholder="ابحث بالموديل، القطعة، SKU أو الباركود… مثال: شاشة iPhone 13"
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(items.length - 1, a + 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(-1, a - 1)); }
            else if (e.key === "Escape") setOpen(false);
          }}
          className={`w-full rounded-2xl border border-ink-600 bg-ink-900/90 pe-12 ps-4 text-ink-50 placeholder:text-ink-400 transition focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/20 ${size === "lg" ? "h-14 text-base" : "h-11 text-sm"}`}
        />
        <button type="submit" className="absolute inset-y-1 end-1 grid w-10 place-items-center rounded-xl bg-brand-500 text-white hover:bg-brand-400" aria-label="بحث">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </button>
      </form>
      {showList && (
        <div id={listId} role="listbox" className="absolute inset-x-0 top-full z-50 mt-2 max-h-[70vh] overflow-auto rounded-2xl border border-ink-600 bg-ink-850 p-1.5 shadow-2xl">
          {items.length === 0 && !loading && <p className="px-3 py-4 text-sm text-ink-300">لا توجد اقتراحات. اضغط Enter للبحث الكامل.</p>}
          {items.map((it, i) => (
            <button
              type="button"
              id={`${listId}-${i}`}
              role="option"
              aria-selected={active === i}
              key={it.kind + it.href}
              onMouseEnter={() => setActive(i)}
              onClick={() => {
                setOpen(false);
                router.push(it.href);
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-start ${active === i ? "bg-ink-700" : "hover:bg-ink-800"}`}
            >
              <span className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-ink-800 text-ink-300">
                {it.kind === "product" && it.imageId ? (
                  <Image src={imageUrl(it.imageId)} alt="" fill sizes="40px" className="bg-ink-50 object-contain p-0.5" />
                ) : it.kind === "model" ? (
                  <Smartphone className="h-5 w-5 text-cyan-400" />
                ) : it.kind === "category" ? (
                  <FolderOpen className="h-5 w-5 text-brand-400" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-white">{it.label}</span>
                {it.sub && <span className="block truncate text-xs text-ink-400 tabular">{it.sub}</span>}
              </span>
            </button>
          ))}
          {q.trim() && (
            <button type="button" onClick={() => submit()} className="mt-1 w-full rounded-xl border-t border-ink-700 px-3 py-2.5 text-start text-sm text-cyan-400 hover:bg-ink-800">
              عرض كل النتائج لـ «{q.trim()}»
            </button>
          )}
        </div>
      )}
    </div>
  );
}
