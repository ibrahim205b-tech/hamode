"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export type CartItem = {
  productId: string;
  quantity: number;
  seenPrice: number;
  nameAr: string;
  slug: string;
  sku: string;
  imageId: string | null;
};

type Toast = { id: number; text: string; kind: "success" | "error" | "info" };

type CartCtx = {
  items: CartItem[];
  ready: boolean;
  count: number;
  add: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  syncFromQuote: (lines: { productId: string; quantity: number; unitPrice: number }[]) => void;
  toast: (text: string, kind?: Toast["kind"]) => void;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = "he_cart_v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const tid = useRef(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setItems(parsed.filter((i) => i && typeof i.productId === "string" && i.quantity > 0).slice(0, 100));
      }
    } catch {}
    setReady(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) {
        try { setItems(JSON.parse(e.newValue || "[]")); } catch {}
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {}
  }, [items, ready]);

  const toast = useCallback((text: string, kind: Toast["kind"] = "success") => {
    const id = ++tid.current;
    setToasts((t) => [...t.slice(-2), { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const add = useCallback<CartCtx["add"]>((item, qty = 1) => {
    setItems((prev) => {
      const ex = prev.find((p) => p.productId === item.productId);
      if (ex) return prev.map((p) => (p.productId === item.productId ? { ...p, ...item, quantity: Math.min(p.quantity + qty, 10000) } : p));
      return [...prev, { ...item, quantity: qty }];
    });
  }, []);

  const setQty = useCallback((productId: string, qty: number) => {
    setItems((prev) => prev.map((p) => (p.productId === productId ? { ...p, quantity: Math.max(1, Math.min(Math.floor(qty) || 1, 10000)) } : p)));
  }, []);

  const remove = useCallback((productId: string) => setItems((prev) => prev.filter((p) => p.productId !== productId)), []);
  const clear = useCallback(() => setItems([]), []);

  /** مزامنة السلة مع ما أكده الخادم (كميات متاحة وأسعار حالية) */
  const syncFromQuote = useCallback<CartCtx["syncFromQuote"]>((lines) => {
    setItems((prev) => {
      const next = prev
        .map((p) => {
          const l = lines.find((x) => x.productId === p.productId);
          return l ? { ...p, quantity: l.quantity, seenPrice: l.unitPrice } : null;
        })
        .filter(Boolean) as CartItem[];
      return JSON.stringify(next) === JSON.stringify(prev) ? prev : next;
    });
  }, []);

  const value = useMemo(
    () => ({ items, ready, count: items.reduce((a, i) => a + i.quantity, 0), add, setQty, remove, clear, syncFromQuote, toast }),
    [items, ready, add, setQty, remove, clear, syncFromQuote, toast],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-4 z-[70] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto animate-fade-up rounded-xl border px-4 py-3 text-sm font-medium shadow-card backdrop-blur ${
              t.kind === "success" ? "border-success/40 bg-ink-850/95 text-white" : t.kind === "error" ? "border-danger/50 bg-ink-850/95 text-red-200" : "border-brand-500/40 bg-ink-850/95 text-white"
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart outside provider");
  return c;
}
