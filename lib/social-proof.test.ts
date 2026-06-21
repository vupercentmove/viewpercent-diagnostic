import { describe, it, expect } from "vitest";
import { getSocialProof, SOCIAL_PROOF_MIN_N } from "@/lib/social-proof";

describe("getSocialProof — 실측 게이트 (표시광고법 방지)", () => {
  it("SOCIAL_PROOF_MIN_N 임계치는 80", () => {
    expect(SOCIAL_PROOF_MIN_N).toBe(80);
  });

  it("null이면 정성 폴백 (수치 미노출)", () => {
    const r = getSocialProof(null);
    expect(r.show).toBe(true);
    expect(r.isQualitative).toBe(true);
    expect(r.displayCount).toBeNull();
    expect(r.label).toBe("");
  });

  it("임계치 미만(50)이면 정성 폴백", () => {
    const r = getSocialProof(50);
    expect(r.isQualitative).toBe(true);
    expect(r.displayCount).toBeNull();
    expect(r.label).toBe("");
  });

  it("경계 바로 아래(79)도 정성 폴백 — 조작값 미노출", () => {
    const r = getSocialProof(79);
    expect(r.isQualitative).toBe(true);
    expect(r.displayCount).toBeNull();
    expect(r.label).toBe("");
  });

  it("경계 정확히(80)이면 수치 노출 '80명+'", () => {
    const r = getSocialProof(80);
    expect(r.isQualitative).toBe(false);
    expect(r.displayCount).toBe(80);
    expect(r.label).toBe("80명+");
  });

  it("124는 보수적 내림으로 '120명+' (실제값 초과 금지)", () => {
    const r = getSocialProof(124);
    expect(r.displayCount).toBe(120);
    expect(r.label).toBe("120명+");
  });

  it("1234는 천단위 콤마 + 내림 '1,230명+'", () => {
    const r = getSocialProof(1234);
    expect(r.displayCount).toBe(1230);
    expect(r.label).toBe("1,230명+");
  });

  it("내림 결과는 항상 입력값을 초과하지 않는다", () => {
    for (const n of [80, 89, 99, 100, 137, 999, 1000, 1234]) {
      const r = getSocialProof(n);
      expect(r.displayCount).not.toBeNull();
      expect(r.displayCount as number).toBeLessThanOrEqual(n);
    }
  });
});
