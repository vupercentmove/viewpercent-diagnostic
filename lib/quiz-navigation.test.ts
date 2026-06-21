import { describe, it, expect } from "vitest";
import {
  nextIndex,
  prevIndex,
  isLastQuestion,
  shouldAutoAdvance,
  autoAdvanceDelay,
} from "@/lib/quiz-navigation";

describe("nextIndex", () => {
  it("커서를 1 증가시킨다", () => {
    expect(nextIndex(0, 10)).toBe(1);
    expect(nextIndex(3, 10)).toBe(4);
  });

  it("total-1을 초과하지 않도록 클램프한다", () => {
    expect(nextIndex(9, 10)).toBe(9);
    expect(nextIndex(20, 10)).toBe(9);
  });
});

describe("prevIndex", () => {
  it("커서를 1 감소시킨다", () => {
    expect(prevIndex(5)).toBe(4);
    expect(prevIndex(1)).toBe(0);
  });

  it("0 미만으로 내려가지 않도록 클램프한다", () => {
    expect(prevIndex(0)).toBe(0);
    expect(prevIndex(-3)).toBe(0);
  });
});

describe("isLastQuestion", () => {
  it("커서가 마지막 인덱스일 때만 true", () => {
    expect(isLastQuestion(9, 10)).toBe(true);
    expect(isLastQuestion(8, 10)).toBe(false);
    expect(isLastQuestion(0, 10)).toBe(false);
  });
});

describe("shouldAutoAdvance", () => {
  it("현재 커서 문항을 처음 답하면 true", () => {
    expect(
      shouldAutoAdvance({ answeredIndex: 3, cursor: 3, total: 10 })
    ).toBe(true);
  });

  it("과거 문항(answeredIndex < cursor)을 수정하면 false → 루프 방지", () => {
    expect(
      shouldAutoAdvance({ answeredIndex: 2, cursor: 3, total: 10 })
    ).toBe(false);
  });

  it("마지막 문항이면 false → 수동 CTA", () => {
    expect(
      shouldAutoAdvance({ answeredIndex: 9, cursor: 9, total: 10 })
    ).toBe(false);
  });
});

describe("autoAdvanceDelay", () => {
  it("yn은 0ms", () => {
    expect(autoAdvanceDelay("yn")).toBe(0);
  });

  it("likert는 350ms", () => {
    expect(autoAdvanceDelay("likert")).toBe(350);
  });
});
