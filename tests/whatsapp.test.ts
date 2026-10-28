import { describe, expect, it } from "vitest";
import { cartShareMessage, orderShareMessage, productInquiryMessage, toInternationalIraqi, toLocalIraqi, waLink, DEFAULT_WHATSAPP_LOCAL } from "@/lib/whatsapp";

describe("WhatsApp number handling", () => {
  it("uses the official store number by default", () => {
    expect(DEFAULT_WHATSAPP_LOCAL).toBe("07700733822");
    expect(toInternationalIraqi(DEFAULT_WHATSAPP_LOCAL)).toBe("9647700733822");
  });
  it.each([
    ["07700733822", "9647700733822"],
    ["+964 770 073 3822", "9647700733822"],
    ["009647700733822", "9647700733822"],
    ["9647700733822", "9647700733822"],
    ["٠٧٧٠٠٧٣٣٨٢٢", "9647700733822"],
    ["7700733822", "9647700733822"],
  ])("normalizes %s", (input, out) => expect(toInternationalIraqi(input)).toBe(out));
  it.each(["", "123", "0770073382", "06700733822", "abc"])("rejects %s", (input) => expect(toInternationalIraqi(input)).toBeNull());
  it("converts back to local format", () => expect(toLocalIraqi("9647700733822")).toBe("07700733822"));
  it("builds wa.me links with correctly encoded Arabic text", () => {
    const link = waLink("9647700733822", "السلام عليكم & 100%");
    expect(link.startsWith("https://wa.me/9647700733822?text=")).toBe(true);
    expect(decodeURIComponent(link.split("text=")[1])).toBe("السلام عليكم & 100%");
    expect(link).not.toMatch(/[؀-ۿ ]/);
  });
});

describe("WhatsApp messages", () => {
  it("product inquiry includes name, SKU, model and URL", () => {
    const m = productInquiryMessage({ name: "شاشة iPhone 13", sku: "SCR-13", model: "iPhone 13", url: "https://x.test/product/a" });
    expect(m).toContain("شاشة iPhone 13");
    expect(m).toContain("SCR-13");
    expect(m).toContain("iPhone 13");
    expect(m).toContain("https://x.test/product/a");
    expect(m).toContain("تأكيد التوفر والسعر");
  });
  it("cart share marks totals as estimates when delivery unknown", () => {
    const m = cartShareMessage({ lines: [{ name: "بطارية", sku: "B1", quantity: 2, unitPrice: 15000 }], subtotal: 30000, total: 30000, deliveryKnown: false });
    expect(m).toContain("2 × 15,000 د.ع = 30,000 د.ع");
    expect(m).toContain("الإجمالي التقديري");
  });
  it("order share contains order number and totals but not phone", () => {
    const m = orderShareMessage({ number: "HE261028-ABCDE", lines: [{ name: "كيبل", quantity: 1, unitPrice: 6000 }], subtotal: 6000, discountTotal: 1000, deliveryFee: 5000, total: 10000, customerName: "علي", governorate: "بغداد", area: "الكرادة" });
    expect(m).toContain("HE261028-ABCDE");
    expect(m).toContain("الخصم: -1,000 د.ع");
    expect(m).toContain("الإجمالي: 10,000 د.ع");
    expect(m).not.toMatch(/07\d{9}/);
  });
});
