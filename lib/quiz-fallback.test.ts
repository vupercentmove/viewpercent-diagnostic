import { describe, it, expect } from "vitest";
import {
  UNKNOWN_ANSWER,
  getFullAnswerNextStep,
  isUnknown,
  nextUnknownStreak,
  shouldFallback,
} from "./quiz-fallback";

describe("quiz-fallback", () => {
  it("UNKNOWN_ANSWER는 -1", () => expect(UNKNOWN_ANSWER).toBe(-1));
  it("isUnknown", () => {
    expect(isUnknown(-1)).toBe(true);
    expect(isUnknown(0)).toBe(false);
    expect(isUnknown(100)).toBe(false);
  });
  it("nextUnknownStreak: 모름 +1, 실답변 0", () => {
    expect(nextUnknownStreak(0, -1)).toBe(1);
    expect(nextUnknownStreak(1, -1)).toBe(2);
    expect(nextUnknownStreak(1, 100)).toBe(0);
  });
  it("shouldFallback: 2회부터", () => {
    expect(shouldFallback(1)).toBe(false);
    expect(shouldFallback(2)).toBe(true);
  });
  it("full 진단 B 대조군은 일반 응답 후 바로 다음 문항으로 이동한다", () => {
    expect(getFullAnswerNextStep("B", false)).toBe("advance");
  });
  it("full 진단 A만 응답 검토 화면을 열고 폴백은 variant보다 우선한다", () => {
    expect(getFullAnswerNextStep("A", false)).toBe("review");
    expect(getFullAnswerNextStep("A", true)).toBe("fallback");
    expect(getFullAnswerNextStep("B", true)).toBe("fallback");
  });
});
