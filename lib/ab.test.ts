import { describe, it, expect } from "vitest";
import { hashToVariant } from "./ab";

describe("hashToVariant", () => {
  it("결정적 — 같은 seed는 항상 같은 variant를 반환한다", () => {
    const seeds = ["abc", "hello-world", "", "1234567890", "정밀진단-방문자-1", "uuid-like-seed-xyz"];
    for (const seed of seeds) {
      const first = hashToVariant(seed);
      for (let i = 0; i < 5; i++) {
        expect(hashToVariant(seed)).toBe(first);
      }
    }
  });

  it("A 또는 B만 반환한다", () => {
    const seeds = ["a", "b", "abc", "xyz123", "uuid-like-seed-1234", "", "🙂🙂🙂"];
    for (const seed of seeds) {
      expect(["A", "B"]).toContain(hashToVariant(seed));
    }
  });

  it("50개의 다양한 seed에서 A와 B가 모두 등장한다", () => {
    const variants = new Set<string>();
    for (let i = 0; i < 50; i++) {
      variants.add(hashToVariant(`visitor-seed-${i}`));
    }
    expect(variants.has("A")).toBe(true);
    expect(variants.has("B")).toBe(true);
  });
});
