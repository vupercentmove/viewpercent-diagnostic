import { describe, it, expect } from "vitest";
import {
  buildEchoQuote,
  buildEcho,
  ECHO_PHRASES,
  LOSS_AVERSION_LINE,
  type Answers,
} from "@/lib/scoring";

describe("buildEchoQuote", () => {
  it("정방향 yn 부정(q4a=0) → 해당 되비춤 문장 반환", () => {
    const answers: Answers = { q4a: 0, q4b: 100 };
    expect(buildEchoQuote(answers, 4)).toBe(ECHO_PHRASES["q4a"]);
  });

  it("역방향 yn 부정(q1a=0, 스코어상 0=부정) → 비-null 반환", () => {
    const answers: Answers = { q1a: 0, q1b: 100 };
    expect(buildEchoQuote(answers, 1)).toBe(ECHO_PHRASES["q1a"]);
  });

  it("likert 저점(q3b=0) → 해당 되비춤 문장 반환", () => {
    // q3a(정방향 yn)는 100(긍정), q3b(likert)만 0(부정)
    const answers: Answers = { q3a: 100, q3b: 0 };
    expect(buildEchoQuote(answers, 3)).toBe(ECHO_PHRASES["q3b"]);
  });

  it("likert 25점(1~2점 구간)도 부정으로 본다", () => {
    const answers: Answers = { q3a: 100, q3b: 25 };
    expect(buildEchoQuote(answers, 3)).toBe(ECHO_PHRASES["q3b"]);
  });

  it("부정 신호 없음(모두 긍정) → null", () => {
    const answers: Answers = { q4a: 100, q4b: 100 };
    expect(buildEchoQuote(answers, 4)).toBeNull();
  });

  it("응답이 비어 있으면 null", () => {
    expect(buildEchoQuote({}, 4)).toBeNull();
  });

  it("결정적: 같은 Stage에 부정이 둘이면 questions.ts 순서상 첫 문항을 고정 반환", () => {
    // Stage 4: q4a, q4b 둘 다 부정 → 항상 q4a
    const answers: Answers = { q4a: 0, q4b: 0 };
    expect(buildEchoQuote(answers, 4)).toBe(ECHO_PHRASES["q4a"]);
    expect(buildEchoQuote(answers, 4)).toBe(ECHO_PHRASES["q4a"]);
  });
});

describe("buildEcho", () => {
  it("부정 신호가 있으면 phrase와 questionId를 함께 반환", () => {
    const answers: Answers = { q4a: 0, q4b: 100 };
    expect(buildEcho(answers, 4)).toEqual({
      phrase: ECHO_PHRASES["q4a"],
      questionId: "q4a",
    });
  });

  it("부정 신호가 없으면 null", () => {
    const answers: Answers = { q4a: 100, q4b: 100 };
    expect(buildEcho(answers, 4)).toBeNull();
  });
});

describe("ECHO_PHRASES / LOSS_AVERSION_LINE 무결성", () => {
  it("10개 문항 모두 되비춤 문장이 있다", () => {
    const ids = ["q1a", "q1b", "q2a", "q3a", "q3b", "q4a", "q4b", "q5a", "q6a", "q6b"];
    for (const id of ids) {
      expect(ECHO_PHRASES[id]).toBeTruthy();
      expect(ECHO_PHRASES[id].length).toBeGreaterThan(0);
    }
  });

  it("손실회피 문장이 비어 있지 않다", () => {
    expect(LOSS_AVERSION_LINE.length).toBeGreaterThan(0);
  });
});
