import { describe, it, expect } from "vitest";
import {
  encodeAnswers,
  decodeAnswers,
  buildShareUrl,
  resultPath,
} from "./url-state";
import { QUICK_QUESTIONS } from "./questions";

const QUESTION_IDS = QUICK_QUESTIONS.map((q) => q.id);

function makeAnswers(scores: number[]): Record<string, number> {
  return Object.fromEntries(QUESTION_IDS.map((id, i) => [id, scores[i]]));
}

describe("encodeAnswers", () => {
  it("모든 0 → '0000000000'", () => {
    expect(encodeAnswers(makeAnswers([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe(
      "0000000000"
    );
  });

  it("모든 100 → '4444444444'", () => {
    expect(
      encodeAnswers(makeAnswers([100, 100, 100, 100, 100, 100, 100, 100, 100, 100]))
    ).toBe("4444444444");
  });

  it("혼합 점수 인코딩", () => {
    // 문항 순서: q1a q1b q2a q3a q3b q4a q4b q5a q6a q6b
    // 0→0, 25→1, 50→2, 75→3, 100→4
    const scores = [0, 25, 50, 75, 100, 0, 100, 25, 50, 75];
    expect(encodeAnswers(makeAnswers(scores))).toBe("0123404123");
  });

  it("누락 답변은 50(2)으로 처리", () => {
    const partial: Record<string, number> = { q1a: 0 };
    const encoded = encodeAnswers(partial);
    expect(encoded[0]).toBe("0"); // q1a
    expect(encoded[1]).toBe("2"); // q1b 누락 → 50
  });
});

describe("decodeAnswers", () => {
  it("인코딩 → 디코딩 라운드트립", () => {
    const scores = [100, 0, 75, 25, 50, 100, 0, 75, 25, 50];
    const answers = makeAnswers(scores);
    const decoded = decodeAnswers(encodeAnswers(answers));
    expect(decoded).toEqual(answers);
  });

  it("길이 불일치 → null", () => {
    expect(decodeAnswers("123")).toBeNull();
    expect(decodeAnswers("")).toBeNull();
    expect(decodeAnswers("01234012345")).toBeNull();
  });

  it("유효하지 않은 문자 → null", () => {
    expect(decodeAnswers("012345678x")).toBeNull();
    expect(decodeAnswers("012345678A")).toBeNull();
  });

  it("'0000000000' → 모든 0", () => {
    const result = decodeAnswers("0000000000");
    expect(result).not.toBeNull();
    Object.values(result!).forEach((v) => expect(v).toBe(0));
  });
});

describe("resultPath / buildShareUrl", () => {
  it("resultPath는 /result/<encoded> 형식", () => {
    const answers = makeAnswers([0, 25, 50, 75, 100, 0, 100, 25, 50, 75]);
    expect(resultPath(answers)).toBe(`/result/${encodeAnswers(answers)}`);
  });

  it("서버(window 없음)에서 buildShareUrl은 상대 경로 반환", () => {
    const answers = makeAnswers([100, 0, 75, 25, 50, 100, 0, 75, 25, 50]);
    // vitest node 환경: window 미정의 → resultPath와 동일
    expect(buildShareUrl(answers)).toBe(resultPath(answers));
  });

  it("resultPath ↔ decodeAnswers 라운드트립", () => {
    const answers = makeAnswers([0, 100, 25, 75, 50, 0, 100, 25, 75, 50]);
    const encoded = resultPath(answers).replace("/result/", "");
    expect(decodeAnswers(encoded)).toEqual(answers);
  });
});
