import { describe, it, expect } from "vitest";
import {
  encodeAnswers,
  decodeAnswers,
  encodeFullAnswers,
  decodeFullAnswers,
  resultPath,
  QUICK_ORDER_V1,
  QUICK_ORDER_BY_VERSION,
  QUICK_ENCODING_VERSION,
  FULL_ORDER_V1,
  FULL_ORDER_BY_VERSION,
  FULL_ENCODING_VERSION,
} from "./url-state";
import { QUICK_QUESTIONS } from "./questions";
import { DEEP_QUESTIONS } from "./deep-questions";
import { UNKNOWN_ANSWER } from "./quiz-fallback";

/**
 * 이 파일이 지키는 계약 — 문항 세트가 자라도 이미 나간 공유 링크가 살아 있을 것.
 *
 * 2026-08-25 실측: 두 디코더가 모두 현재 문항 배열 길이로 판정해서, 문항을 하나만
 * 더해도 기존 링크가 전부 null이 됐다. null이면 복원 분기가 조용히 실패해 에러 화면도
 * 없이 시작 화면이 뜬다 — 실고객에게 보낸 결과 링크가 그렇게 죽는다.
 */

describe("문항 순서 버전 고정", () => {
  // ⚠️ 아래 두 테스트가 깨졌다면 문항을 추가·삭제·재배치한 것이다.
  //    기존 순서표를 고치지 말고 새 버전을 추가한 뒤 ENCODING_VERSION을 올려라.
  //    기존 배열을 수정하면 이미 나간 링크가 다른 문항으로 복원된다.
  it("빠른 진단: 현재 버전 순서표가 QUICK_QUESTIONS와 일치한다", () => {
    expect(QUICK_ORDER_BY_VERSION[QUICK_ENCODING_VERSION]).toEqual(
      QUICK_QUESTIONS.map((q) => q.id)
    );
  });

  it("정밀 진단: 현재 버전 순서표가 DEEP_QUESTIONS와 일치한다", () => {
    expect(FULL_ORDER_BY_VERSION[FULL_ENCODING_VERSION]).toEqual(
      DEEP_QUESTIONS.map((q) => q.id)
    );
  });

  it("v1 순서표는 동결돼 있다", () => {
    expect(QUICK_ORDER_V1).toHaveLength(10);
    expect(FULL_ORDER_V1).toHaveLength(27);
    expect(Object.isFrozen(QUICK_ORDER_V1)).toBe(true);
    expect(Object.isFrozen(FULL_ORDER_V1)).toBe(true);
  });
});

describe("버전 접두어 표기", () => {
  it("v1은 접두어 없이 나간다 — 이미 밖에 있는 링크와 같은 형태", () => {
    expect(encodeAnswers({ q1a: 0 })).not.toContain("-");
    expect(encodeFullAnswers({ d1a: 0 })).not.toContain("-");
  });

  it("공유 경로도 접두어 없이 유지된다 — 카톡에 이미 퍼진 링크와 같은 모양", () => {
    // q1a만 0, 나머지는 미답변이라 기본값 "2"(50점)
    expect(resultPath({ q1a: 0 })).toBe("/result/0222222222");
  });

  it("모르는 버전 접두어 → null (두 모드 모두)", () => {
    expect(decodeAnswers("2-0000000000")).toBeNull();
    expect(decodeAnswers("99-0000000000")).toBeNull();
    expect(decodeFullAnswers("2-" + "0".repeat(27))).toBeNull();
  });

  it("접두어만 있고 본문이 비면 null", () => {
    expect(decodeAnswers("2-")).toBeNull();
  });
});

describe("빠른 진단 — 옛 링크 호환", () => {
  const LEGACY = "0123404123"; // 버전 도입 전 형태 (접두어 없음)

  it("접두어 없는 10자리를 v1으로 읽는다", () => {
    const decoded = decodeAnswers(LEGACY);
    expect(decoded).not.toBeNull();
    expect(decoded!["q1a"]).toBe(0);
    expect(decoded!["q6b"]).toBe(75);
  });

  it("v1 링크는 v1 순서표 길이로 판정한다 — QUICK_QUESTIONS 길이가 아니라", () => {
    // 문항이 11개로 늘어난 미래에도 10자리 v1 문자열은 살아 있어야 한다.
    expect(Object.keys(decodeAnswers(LEGACY)!).length).toBe(QUICK_ORDER_V1.length);
  });

  it("길이가 안 맞거나 문자가 유효하지 않으면 null", () => {
    expect(decodeAnswers("123")).toBeNull();
    expect(decodeAnswers("")).toBeNull();
    expect(decodeAnswers("01234012345")).toBeNull();
    expect(decodeAnswers("012345678x")).toBeNull();
  });

  it("라운드트립", () => {
    const answers = Object.fromEntries(
      QUICK_QUESTIONS.map((q, i) => [q.id, [0, 25, 50, 75, 100][i % 5]])
    );
    expect(decodeAnswers(encodeAnswers(answers))).toEqual(answers);
  });
});

describe("정밀 진단 — 옛 링크 호환", () => {
  // 제이블린 대표님께 실제로 받은 링크의 답변 문자열 (2026-08-25)
  const REAL = "044304553002444042040004144";

  it("접두어 없는 27자리를 v1으로 읽는다", () => {
    const decoded = decodeFullAnswers(REAL);
    expect(decoded).not.toBeNull();
    expect(decoded!["d1a"]).toBe(0);
    expect(decoded!["d2c"]).toBe(UNKNOWN_ANSWER); // 대표님이 '모름'으로 답한 문항
    expect(decoded!["d6e"]).toBe(100);
  });

  it("v1 링크는 v1 순서표 길이로 판정한다 — DEEP_QUESTIONS 길이가 아니라", () => {
    expect(Object.keys(decodeFullAnswers(REAL)!).length).toBe(FULL_ORDER_V1.length);
  });

  it("길이가 안 맞거나 문자가 유효하지 않으면 null", () => {
    expect(decodeFullAnswers("0123")).toBeNull();
    expect(decodeFullAnswers(REAL + "4")).toBeNull();
    expect(decodeFullAnswers("x".repeat(27))).toBeNull();
  });

  it("모름·미응답 라운드트립", () => {
    const answers: Record<string, number> = { d1a: 100, d1b: UNKNOWN_ANSWER };
    const decoded = decodeFullAnswers(encodeFullAnswers(answers));
    expect(decoded!["d1a"]).toBe(100);
    expect(decoded!["d1b"]).toBe(UNKNOWN_ANSWER);
    expect("d1c" in decoded!).toBe(false); // 미응답은 키 자체가 없다
  });
});
