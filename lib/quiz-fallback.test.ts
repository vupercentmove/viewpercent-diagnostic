import { describe, it, expect } from "vitest";
import {
  UNKNOWN_ANSWER,
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
});
