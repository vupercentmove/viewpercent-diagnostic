import { describe, it, expect } from "vitest";
import { buildSteps } from "@/lib/analyzing-steps";

describe("buildSteps", () => {
  it("항상 3단계를 반환한다 (모든 조합)", () => {
    expect(buildSteps(false, false)).toHaveLength(3);
    expect(buildSteps(true, false)).toHaveLength(3);
    expect(buildSteps(false, true)).toHaveLength(3);
    expect(buildSteps(true, true)).toHaveLength(3);
  });

  it("1단계는 항상 동일한 문구다", () => {
    const expected = "진단 결과를 분석하고 있어요";
    expect(buildSteps(false, false)[0]).toBe(expected);
    expect(buildSteps(true, false)[0]).toBe(expected);
    expect(buildSteps(false, true)[0]).toBe(expected);
    expect(buildSteps(true, true)[0]).toBe(expected);
  });

  it("2단계는 hasGap에 따라 분기한다", () => {
    expect(buildSteps(true, false)[1]).toBe(
      "자기인식과 데이터의 빈틈을 살펴보는 중"
    );
    expect(buildSteps(true, true)[1]).toBe(
      "자기인식과 데이터의 빈틈을 살펴보는 중"
    );
    expect(buildSteps(false, false)[1]).toBe(
      "빈틈 없이 일관된 응답인지 확인하는 중"
    );
    expect(buildSteps(false, true)[1]).toBe(
      "빈틈 없이 일관된 응답인지 확인하는 중"
    );
  });

  it("3단계는 hasCase에 따라 분기한다", () => {
    expect(buildSteps(false, true)[2]).toBe("비슷한 브랜드 사례를 찾는 중");
    expect(buildSteps(true, true)[2]).toBe("비슷한 브랜드 사례를 찾는 중");
    expect(buildSteps(false, false)[2]).toBe(
      "맞춤 개선 우선순위를 정리하는 중"
    );
    expect(buildSteps(true, false)[2]).toBe(
      "맞춤 개선 우선순위를 정리하는 중"
    );
  });
});
