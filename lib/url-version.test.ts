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
import { calcFullDeepStageScores, getFullWeakestStage } from "./full-deep-scoring";
import { FULL_ORDER_V2, FULL_ORDER_V3, FULL_ORDER_V4 } from "./url-state";

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
  it("빠른 진단은 v1 그대로 접두어 없이 나간다 — 이미 밖에 있는 링크와 같은 형태", () => {
    expect(encodeAnswers({ q1a: 0 })).not.toContain("-");
  });

  it("정밀 진단은 v4라 '4-' 접두어가 붙는다 (2026-09-24 d1c→d1e, d5b→d5e, d4d→d4f 교체)", () => {
    expect(FULL_ENCODING_VERSION).toBe(4);
    expect(encodeFullAnswers({ d1a: 0 }).startsWith("4-")).toBe(true);
  });

  it("공유 경로도 접두어 없이 유지된다 — 카톡에 이미 퍼진 링크와 같은 모양", () => {
    // q1a만 0, 나머지는 미답변이라 기본값 "2"(50점)
    expect(resultPath({ q1a: 0 })).toBe("/result/0222222222");
  });

  it("모르는 버전 접두어 → null (두 모드 모두)", () => {
    expect(decodeAnswers("2-0000000000")).toBeNull();
    expect(decodeAnswers("99-0000000000")).toBeNull();
    expect(decodeFullAnswers("5-" + "0".repeat(27))).toBeNull();
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

describe("정밀 v2 — d1c(자연·유료 비율) → d1e(플랫폼 수수료 vs 자사몰 광고비)", () => {
  // 제이블린 대표님 실링크 (v1, 27자리) — d1c 자리 답은 "4"(100점)
  const REAL_V1 = "044304553002444042040004144";

  it("현재 문항에서 d1c가 빠지고 d1e가 같은 자리에 들어갔다", () => {
    const ids = DEEP_QUESTIONS.map((q) => q.id);
    expect(ids).not.toContain("d1c");
    expect(ids.slice(0, 4)).toEqual(["d1a", "d1b", "d1e", "d1d"]);
    const q = DEEP_QUESTIONS.find((x) => x.id === "d1e")!;
    expect(q.stageId).toBe(1);
    expect(q.answerType).toBe("yn");
    expect(q.subArea).toBe("채널 구조"); // 약점 칩·근거 표시가 그대로 이어지도록
  });

  it("v1 순서표는 d1c를 그대로 들고 있다 — 동결", () => {
    expect(FULL_ORDER_V1[2]).toBe("d1c");
    expect(FULL_ORDER_V2[2]).toBe("d1e");
  });

  it("옛 v1 링크는 여전히 열리고, d1c 답은 채점에서 빠진다", () => {
    const answers = decodeFullAnswers(REAL_V1)!;
    expect(answers["d1c"]).toBe(100); // 키는 살아 있지만
    expect(answers["d1e"]).toBeUndefined();
    const scores = calcFullDeepStageScores(answers);
    // STAGE 1 = d1a(0)·d1b(100)·d1d(75) 평균 — d1c(100)가 빠져 69 → 58
    expect(scores.find((s) => s.stageId === 1)!.score).toBe(58);
    // 최약 단계 판정은 그대로 STAGE 5
    expect(getFullWeakestStage(scores)!.stageId).toBe(5);
  });

  it("라운드트립 — d1e 답이 보존된다", () => {
    const answers: Record<string, number> = { d1a: 100, d1e: 0, d1d: 75, d2a: UNKNOWN_ANSWER };
    const decoded = decodeFullAnswers(encodeFullAnswers(answers))!;
    expect(decoded["d1e"]).toBe(0);
    expect(decoded["d2a"]).toBe(UNKNOWN_ANSWER);
    expect("d1c" in decoded).toBe(false);
  });
});


describe("정밀 v3 — d5b(재고 예측 체계) → d5e(품절·미송 취소 건수 확인)", () => {
  const REAL_V1 = "044304553002444042040004144"; // d5a 0 · d5b 100 · d5c 0 · d5d 0

  it("현재 문항에서 d5b가 빠지고 d5e가 같은 자리에 들어갔다", () => {
    const ids = DEEP_QUESTIONS.map((q) => q.id);
    expect(ids).not.toContain("d5b");
    expect(ids.slice(18, 22)).toEqual(["d5a", "d5e", "d5c", "d5d"]);
    const q = DEEP_QUESTIONS.find((x) => x.id === "d5e")!;
    expect(q.stageId).toBe(5);
    expect(q.answerType).toBe("yn");
    expect(q.subArea).toBe("품절 손실");
  });

  it("v1·v2 순서표는 d5b를 그대로 들고 있다 — 동결", () => {
    expect(FULL_ORDER_V1[19]).toBe("d5b");
    expect(FULL_ORDER_V2[19]).toBe("d5b");
    expect(FULL_ORDER_V3[19]).toBe("d5e");
    expect(Object.isFrozen(FULL_ORDER_V2)).toBe(true);
  });

  it("옛 v1 링크: d5b 답이 빠져 STAGE 5가 25 → 0, 최약 단계는 그대로 STAGE 5", () => {
    const answers = decodeFullAnswers(REAL_V1)!;
    expect(answers["d5b"]).toBe(100);
    expect(answers["d5e"]).toBeUndefined();
    const scores = calcFullDeepStageScores(answers);
    expect(scores.find((s) => s.stageId === 5)!.score).toBe(0);
    expect(getFullWeakestStage(scores)!.stageId).toBe(5);
  });

  it("옛 v2 링크도 열리고 d5b 답은 채점에서 빠진다", () => {
    // v2 자리 19(d5b)만 100, d5a·d5c·d5d는 100/0/0
    const v2 = "2-" + "4444" + "4444" + "44444" + "44444" + "4400" + "44444";
    const answers = decodeFullAnswers(v2)!;
    expect(answers["d5b"]).toBe(100);
    expect(answers["d1e"]).toBe(100);
    const scores = calcFullDeepStageScores(answers);
    expect(scores.find((s) => s.stageId === 5)!.score).toBe(33); // (100+0+0)/3
  });

  it("v3 라운드트립 — d5e 답이 보존된다", () => {
    const answers: Record<string, number> = { d5a: 100, d5e: 0, d5c: UNKNOWN_ANSWER };
    const decoded = decodeFullAnswers(encodeFullAnswers(answers))!;
    expect(decoded["d5e"]).toBe(0);
    expect(decoded["d5c"]).toBe(UNKNOWN_ANSWER);
    expect("d5b" in decoded).toBe(false);
  });
});

describe("정밀 v4 — d4d(결제 3단계) → d4f(상품별 구매율 비교)", () => {
  const REAL_V1 = "044304553002444042040004144"; // d4a 100 · d4b 100 · d4c 0 · d4d 100 · d4e 50

  it("현재 문항에서 d4d가 빠지고 d4f가 같은 자리에 들어갔다", () => {
    const ids = DEEP_QUESTIONS.map((q) => q.id);
    expect(ids).not.toContain("d4d");
    expect(ids.slice(13, 18)).toEqual(["d4a", "d4b", "d4c", "d4f", "d4e"]);
    const q = DEEP_QUESTIONS.find((x) => x.id === "d4f")!;
    expect(q.stageId).toBe(4);
    expect(q.answerType).toBe("yn");
    expect(q.subArea).toBe("구매율 확인");
  });

  it("v1~v3 순서표는 d4d를 그대로 들고 있다 — 동결", () => {
    expect(FULL_ORDER_V1[16]).toBe("d4d");
    expect(FULL_ORDER_V2[16]).toBe("d4d");
    expect(FULL_ORDER_V3[16]).toBe("d4d");
    expect(FULL_ORDER_V4[16]).toBe("d4f");
    expect(Object.isFrozen(FULL_ORDER_V3)).toBe(true);
  });

  it("옛 v1 링크: d4d 답이 빠져 STAGE 4가 70 → 63, 최약 단계는 그대로 STAGE 5", () => {
    const answers = decodeFullAnswers(REAL_V1)!;
    expect(answers["d4d"]).toBe(100);
    expect(answers["d4f"]).toBeUndefined();
    const scores = calcFullDeepStageScores(answers);
    expect(scores.find((s) => s.stageId === 4)!.score).toBe(63); // (100+100+0+50)/4 = 62.5
    expect(getFullWeakestStage(scores)!.stageId).toBe(5);
  });

  it("옛 v3 링크도 열리고 d4d 답은 채점에서 빠진다", () => {
    // v3 자리 16(d4d)만 100, d4a·d4b·d4c·d4e는 0
    const v3 = "3-" + "4444" + "4444" + "44444" + "00040" + "4444" + "44444";
    const answers = decodeFullAnswers(v3)!;
    expect(answers["d4d"]).toBe(100);
    expect(answers["d5e"]).toBe(100);
    const scores = calcFullDeepStageScores(answers);
    expect(scores.find((s) => s.stageId === 4)!.score).toBe(0);
  });

  it("v4 라운드트립 — d4f 답이 보존된다", () => {
    const answers: Record<string, number> = { d4a: 100, d4f: 0, d4e: UNKNOWN_ANSWER };
    const decoded = decodeFullAnswers(encodeFullAnswers(answers))!;
    expect(decoded["d4f"]).toBe(0);
    expect(decoded["d4e"]).toBe(UNKNOWN_ANSWER);
    expect("d4d" in decoded).toBe(false);
  });
});
