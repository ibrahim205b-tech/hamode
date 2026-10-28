"use client";

import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { useCart } from "@/components/store/CartProvider";

type It = { productId: string; slug: string; sku: string; nameAr: string; imageId: string | null; seenPrice: number; quantity: number };

export function ReorderButton({ items }: { items: It[] }) {
  const { add, toast } = useCart();
  const router = useRouter();
  return (
    <button
      type="button"
      className="btn-primary"
      onClick={() => {
        items.forEach(({ quantity, ...it }) => add(it, quantity));
        toast("تمت إضافة المنتجات إلى السلة بالأسعار الحالية");
        router.push("/cart");
      }}
    >
      <RotateCcw className="h-4 w-4" /> إعادة الطلب
    </button>
  );
}
