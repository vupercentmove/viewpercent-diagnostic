import { describe, it, expect } from "vitest";
import {
  UNKNOWN_ANSWER,
  isUnknown,
  nextUnknownStreak,
  shouldFallback,
  UNKNOWN_OPTION_LABEL,
} from "./quiz-fallback";
import { DEEP_QUESTIONS } from "./deep-questions";

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

describe("모름 버튼 문구 — 아니요와 뜻이 겹치지 않을 것", () => {
  // 모름은 점수에서 빠지고 아니요는 0점이다. 버튼이 "안 해봤어요"를 말하면 "~하고 있나요"
  // 문항에서 아니요와 같은 뜻이 되어, 안 해본 대표일수록 점수가 오른다(2026-09-24 수정).
  it("'안 해' '안 했' '없어요'처럼 부정 답으로 읽히는 말이 없다", () => {
    expect(UNKNOWN_OPTION_LABEL).not.toMatch(/안\s*해|안\s*했|없어요|아니/);
  });

  it("'해본 적 있나요' 문항이 있어도 모름은 불확실만 뜻한다", () => {
    const tried = DEEP_QUESTIONS.filter((q) => /본 적 ?이? ?있나요/.test(q.text));
    expect(tried.length).toBeGreaterThan(0); // d1d·d2c·d3c·d6d — 이 문항들이 이 테스트의 이유
    expect(UNKNOWN_OPTION_LABEL).toContain("모르겠어요");
  });
});
