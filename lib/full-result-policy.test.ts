import { describe, expect, it } from "vitest";
import { classifyFullResult, shouldRequestFullAiComment } from "./full-result-policy";
import type { FullDeepStageScore } from "./full-deep-scoring";

const score = (stageId: number, value: number, measured = true): FullDeepStageScore => ({
  stageId,
  score: value,
  measured,
  unknownCount: measured ? 0 : 4,
  answeredCount: 4,
});

describe("정밀 결과 상태 정책", () => {
  it("6단계가 모두 측정되고 양호하면 유지 상태이며 AI 호출을 생략한다", () => {
    const scores = Array.from({ length: 6 }, (_, index) => score(index + 1, 100));
    expect(classifyFullResult(scores)).toBe("maintain");
    expect(shouldRequestFullAiComment(scores)).toBe(false);
  });

  it("측정된 약한 단계가 있을 때만 우선 개선 및 AI 호출 대상으로 본다", () => {
    const scores = Array.from({ length: 6 }, (_, index) => score(index + 1, index === 2 ? 50 : 100));
    expect(classifyFullResult(scores)).toBe("priority");
    expect(shouldRequestFullAiComment(scores)).toBe(true);
  });

  it("확인 전 단계가 남고 측정값은 양호하면 incomplete 상태로 AI 호출을 생략한다", () => {
    const scores = [score(1, 100), score(2, 0, false), ...Array.from({ length: 4 }, (_, index) => score(index + 3, 100))];
    expect(classifyFullResult(scores)).toBe("incomplete");
    expect(shouldRequestFullAiComment(scores)).toBe(false);
  });

  it("전부 확인 전이면 unmeasured 상태다", () => {
    const scores = Array.from({ length: 6 }, (_, index) => score(index + 1, 0, false));
    expect(classifyFullResult(scores)).toBe("unmeasured");
    expect(shouldRequestFullAiComment(scores)).toBe(false);
  });
});
