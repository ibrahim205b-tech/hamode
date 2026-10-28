import { describe, expect, it } from "vitest";
import { expandQuery, normalizeArabic, parseSynonymLines } from "@/lib/arabic";

describe("Arabic normalization", () => {
  it("unifies hamza, taa marbuta, alef maqsura and removes diacritics", () => {
    expect(normalizeArabic("شاشةٌ إصلاح أيفون مُستعمَل")).toBe("شاشه اصلاح ايفون مستعمل");
    expect(normalizeArabic("مستشفى")).toBe("مستشفي");
  });
  it("converts Arabic-Indic digits and lowercases Latin", () => {
    expect(normalizeArabic("iPhone ١٣ Pro")).toBe("iphone 13 pro");
  });
  it("expands synonyms between Arabic and English", () => {
    const groups = expandQuery("شاشة ايفون");
    expect(groups[0]).toContain("screen");
    expect(groups[1]).toContain("iphone");
  });
  it("strips the definite article", () => {
    expect(expandQuery("البطارية")[0]).toContain("بطاريه");
  });
  it("parses owner synonym lines", () => {
    expect(parseSynonymLines("بازر = سماعة خارجية، loudspeaker")).toEqual([["بازر", "سماعه خارجيه", "loudspeaker"]]);
  });
});
