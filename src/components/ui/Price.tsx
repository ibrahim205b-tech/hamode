import { formatIQD } from "@/lib/format";

export function Price({ price, compareAt, size = "md" }: { price: number; compareAt?: number | null; size?: "sm" | "md" | "lg" }) {
  const hasDiscount = compareAt != null && compareAt > price;
  const cls = size === "lg" ? "text-2xl sm:text-3xl" : size === "sm" ? "text-sm" : "text-base";
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 tabular">
      <span className={`${cls} font-bold text-white`}>{formatIQD(price)}</span>
      {hasDiscount && (
        <>
          <span className="text-xs text-ink-400 line-through">{formatIQD(compareAt!)}</span>
          <span className="chip border-cyan-400/30 bg-cyan-400/10 text-cyan-300">-{Math.round(((compareAt! - price) / compareAt!) * 100)}%</span>
        </>
      )}
    </div>
  );
}
