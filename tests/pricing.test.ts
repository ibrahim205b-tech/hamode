import { describe, expect, it } from "vitest";
import { clampQty, deliveryFee, discountAmount, discountProblem, unitPriceFor } from "@/lib/pricing-core";

const p = { id: "1", price: 10000, wholesalePrice: 8000, wholesaleMinQty: 10, stockQty: 50, status: "ACTIVE" };

describe("pricing", () => {
  it("applies wholesale price only at min quantity", () => {
    expect(unitPriceFor(p, 9)).toBe(10000);
    expect(unitPriceFor(p, 10)).toBe(8000);
    expect(unitPriceFor({ ...p, wholesalePrice: null }, 50)).toBe(10000);
    expect(unitPriceFor({ ...p, wholesalePrice: 12000 }, 50)).toBe(10000);
  });
  it("computes discounts safely", () => {
    expect(discountAmount({ type: "PERCENT", value: 10 }, 25000)).toBe(2500);
    expect(discountAmount({ type: "PERCENT", value: 15 }, 999)).toBe(149);
    expect(discountAmount({ type: "FIXED", value: 50000 }, 20000)).toBe(20000);
    expect(discountAmount({ type: "FIXED", value: 5000 }, 0)).toBe(0);
  });
  it("validates discount rules", () => {
    const base = { type: "FIXED" as const, value: 1000, minSubtotal: 10000, maxUses: 2, usedCount: 0, startsAt: null, endsAt: null, isActive: true };
    expect(discountProblem(base, 20000)).toBeNull();
    expect(discountProblem(base, 5000)).toMatch(/الحد الأدنى/);
    expect(discountProblem({ ...base, usedCount: 2 }, 20000)).toMatch(/استنفاد/);
    expect(discountProblem({ ...base, endsAt: new Date(Date.now() - 1000) }, 20000)).toMatch(/انتهت/);
    expect(discountProblem({ ...base, isActive: false }, 20000)).toMatch(/غير صالح/);
    expect(discountProblem(null, 20000)).toMatch(/غير صالح/);
  });
  it("computes delivery fees", () => {
    const m = { kind: "DELIVERY" as const, baseFee: 5000, freeOver: 100000, rates: [{ governorate: "بغداد", fee: 3000 }] };
    expect(deliveryFee(m, "بغداد", 20000)).toBe(3000);
    expect(deliveryFee(m, "البصرة", 20000)).toBe(5000);
    expect(deliveryFee(m, "البصرة", 100000)).toBe(0);
    expect(deliveryFee(m, null, 20000)).toBeNull();
    expect(deliveryFee({ ...m, kind: "PICKUP" }, null, 1)).toBe(0);
  });
  it("clamps quantities", () => {
    expect(clampQty(0, 100)).toBe(1);
    expect(clampQty(2.7, 100)).toBe(2);
    expect(clampQty(500, 100)).toBe(100);
    expect(clampQty("abc", 100)).toBe(1);
  });
});
