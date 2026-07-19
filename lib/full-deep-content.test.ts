import { describe, it, expect } from "vitest";
import { FULL_DEEP_EXPLAINER, getExplainer, VISION_QUESTION, ICP_QUESTIONS, computeIcpFlag } from "./full-deep-content";

describe("full-deep-content", () => {
  it("6단계 설명 존재 + 금지어 없음", () => {
    for (let id = 1; id <= 6; id++) {
      const e = getExplainer(id);
      expect(e.why.length).toBeGreaterThan(0);
      expect(e.goodLooksLike.length).toBeGreaterThan(0);
      expect(e.why + e.goodLooksLike).not.toMatch(/무조건|꼭/);
    }
  });
  it("비전/ICP 문항 정의", () => {
    expect(VISION_QUESTION.options.length).toBeGreaterThanOrEqual(3);
    expect(ICP_QUESTIONS).toHaveLength(2);
  });
  it("computeIcpFlag: 월300만+ AND 콘텐츠 지속", () => {
    expect(computeIcpFlag({ adSpendBand: "300_1000", contentOngoing: true })).toBe(true);
    expect(computeIcpFlag({ adSpendBand: "over_1000", contentOngoing: true })).toBe(true);
    expect(computeIcpFlag({ adSpendBand: "under_300", contentOngoing: true })).toBe(false);
    expect(computeIcpFlag({ adSpendBand: "300_1000", contentOngoing: false })).toBe(false);
    expect(computeIcpFlag({})).toBe(false);
  });
});
