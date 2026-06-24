import { describe, it, expect } from "vitest";
import {
  buildEchoQuote,
  buildEcho,
  ECHO_PHRASES,
  LOSS_AVERSION_LINE,
  REVERSE_YN,
  ynToScore,
  likertToScore,
  calcStageScore,
  calcAllStageScores,
  calcOverallScore,
  getWorstStage,
  detectGap,
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

/* ── 스코어링 불변 회귀 안전망 (제약: REVERSE_YN 보존) ── */

describe("REVERSE_YN 불변", () => {
  it("역방향 문항 세트는 정확히 q1a/q1b/q5a/q6b", () => {
    expect([...REVERSE_YN].sort()).toEqual(["q1a", "q1b", "q5a", "q6b"]);
  });
});

describe("ynToScore", () => {
  it("정방향(q3a): 예=100, 아니요=0", () => {
    expect(ynToScore("q3a", "yes")).toBe(100);
    expect(ynToScore("q3a", "no")).toBe(0);
  });
  it("역방향(q1a,q1b,q5a,q6b): 예=0, 아니요=100", () => {
    for (const id of ["q1a", "q1b", "q5a", "q6b"]) {
      expect(ynToScore(id, "yes")).toBe(0);
      expect(ynToScore(id, "no")).toBe(100);
    }
  });
});

describe("likertToScore", () => {
  it("1~5 → 0,25,50,75,100", () => {
    expect([1, 2, 3, 4, 5].map(likertToScore)).toEqual([0, 25, 50, 75, 100]);
  });
  it("범위 밖 입력은 50으로 안전 폴백", () => {
    expect(likertToScore(0)).toBe(50);
    expect(likertToScore(6)).toBe(50);
  });
});

describe("calcStageScore / calcAllStageScores", () => {
  it("미응답 문항은 50으로 간주(평균)", () => {
    // Stage 1은 q1a,q1b 2문항. 둘 다 미응답 → 50
    expect(calcStageScore(1, {})).toBe(50);
  });
  it("Stage 1 두 문항 평균", () => {
    // q1a=100, q1b=0 → 평균 50
    expect(calcStageScore(1, { q1a: 100, q1b: 0 })).toBe(50);
  });
  it("6개 Stage 모두 반환", () => {
    const all = calcAllStageScores({});
    expect(all.map((s) => s.stageId)).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe("calcOverallScore", () => {
  it("빈 응답 → 전 Stage 50 → 전체 50", () => {
    expect(calcOverallScore({})).toBe(50);
  });
});

describe("getWorstStage", () => {
  it("최저 점수 Stage 반환", () => {
    const scores = [
      { stageId: 1, score: 80 },
      { stageId: 2, score: 30 },
      { stageId: 3, score: 55 },
    ];
    expect(getWorstStage(scores)).toEqual({ stageId: 2, score: 30 });
  });
  it("동점이면 앞 요소를 유지(결정적)", () => {
    const scores = [
      { stageId: 1, score: 40 },
      { stageId: 2, score: 40 },
    ];
    expect(getWorstStage(scores).stageId).toBe(1);
  });
});

describe("detectGap", () => {
  it("빈틈 없음(고른 점수) → null", () => {
    const answers: Answers = {
      q1a: 0, q1b: 0, // Stage1 = 50 (역방향이므로 no면 100, yes면 0; 여기선 0,0→ 평균... )
      q2a: 50,
      q3a: 100, q3b: 50,
      q4a: 100, q4b: 100,
      q5a: 100,
      q6a: 100, q6b: 100,
    };
    // Stage1: q1a,q1b 둘 다 0 → 평균 0 ≤ 30 → perceivedWorst=1
    // actualWorst도 Stage1(0점)이므로 빈틈 아님
    expect(detectGap(answers)).toBeNull();
  });

  it("광고 착각 빈틈: Stage1 낮다고 느끼지만 실제 최약은 다른 Stage", () => {
    // Stage1 점수는 낮게(<=30) 만들되, 다른 Stage를 더 낮게
    const answers: Answers = {
      q1a: 0, q1b: 25, // Stage1 평균 12.5 (<=30)
      q2a: 0, // Stage2 = 0 (더 낮음) → actualWorst
      q3a: 100, q3b: 100,
      q4a: 100, q4b: 100,
      q5a: 100,
      q6a: 100, q6b: 100,
    };
    const gap = detectGap(answers);
    expect(gap?.hasGap).toBe(true);
    expect(gap?.perceivedWorst).toBe(1);
    expect(gap?.actualWorst).toBe(2);
  });

  it("q6b 체념 빈틈: 재구매 체념하지만 실제 최약은 6단계가 아님", () => {
    const answers: Answers = {
      q1a: 100, q1b: 100, // Stage1 높음(역방향 no→100)
      q2a: 0, // Stage2 = 0 → actualWorst
      q3a: 100, q3b: 100,
      q4a: 100, q4b: 100,
      q5a: 100,
      q6a: 100, q6b: 0, // q6b 체념(yes→0), 단 Stage6 평균은 50
    };
    const gap = detectGap(answers);
    expect(gap?.hasGap).toBe(true);
    expect(gap?.perceivedWorst).toBe(6);
    expect(gap?.actualWorst).toBe(2);
  });

  it("Stage2 착각: 브랜드가 약해서 못 판다고 느끼지만 실제 최약은 Stage4", () => {
    // Stage1 높음(착각1 미발동), Stage6 체념 없음(착각2 미발동)
    // Stage2 score=25(<=30), Stage4 score=0 → actualWorst=4(≠2)
    const answers: Answers = {
      q1a: 100, q1b: 100, // Stage1: 100 (역방향 no→100)
      q2a: 25,             // Stage2: 25 ≤ 30
      q3a: 100, q3b: 100, // Stage3: 100
      q4a: 0,   q4b: 0,   // Stage4: 0 → actualWorst
      q5a: 100,            // Stage5: 100
      q6a: 100, q6b: 100, // Stage6: 100
    };
    const gap = detectGap(answers);
    expect(gap?.hasGap).toBe(true);
    expect(gap?.perceivedWorst).toBe(2);
    expect(gap?.actualWorst).toBe(4);
  });

  it("Stage4 착각: 장바구니 이탈이 문제라고 느끼지만 실제 최약은 Stage3", () => {
    // Stage4 score=25(<=30), Stage3 score=0 → actualWorst=3(≠4)
    const answers: Answers = {
      q1a: 100, q1b: 100, // Stage1: 100
      q2a: 100,            // Stage2: 100
      q3a: 0,   q3b: 0,   // Stage3: 0 → actualWorst
      q4a: 25,  q4b: 25,  // Stage4: 25 ≤ 30
      q5a: 100,            // Stage5: 100
      q6a: 100, q6b: 100, // Stage6: 100
    };
    const gap = detectGap(answers);
    expect(gap?.hasGap).toBe(true);
    expect(gap?.perceivedWorst).toBe(4);
    expect(gap?.actualWorst).toBe(3);
  });

  it("Stage1 착각이 Stage2 착각보다 우선 적용됨", () => {
    // Stage1 score=12(<=30) + Stage2 score=25(<=30) 동시 조건
    // Stage3이 최약 → Stage1 착각(우선순위 1)이 먼저 반환돼야 함
    const answers: Answers = {
      q1a: 0,  q1b: 25,  // Stage1: avg(0,25)=12 ≤ 30
      q2a: 25,           // Stage2: 25 ≤ 30
      q3a: 0,  q3b: 0,  // Stage3: 0 → actualWorst
      q4a: 100, q4b: 100,
      q5a: 100,
      q6a: 100, q6b: 100,
    };
    const gap = detectGap(answers);
    expect(gap?.perceivedWorst).toBe(1); // Stage1 착각 우선
    expect(gap?.actualWorst).toBe(3);
  });

  it("Stage6 체념이 Stage2 착각보다 우선 적용됨", () => {
    // q6b=0(체념) + Stage2 score=25(<=30) 동시 조건
    // Stage6 체념(우선순위 2)이 먼저 반환돼야 함
    const answers: Answers = {
      q1a: 100, q1b: 100, // Stage1: 100 (착각1 미발동)
      q2a: 25,            // Stage2: 25 ≤ 30
      q3a: 0,  q3b: 0,  // Stage3: 0 → actualWorst
      q4a: 100, q4b: 100,
      q5a: 100,
      q6a: 100, q6b: 0,  // q6b 체념
    };
    const gap = detectGap(answers);
    expect(gap?.perceivedWorst).toBe(6); // Stage6 체념 우선
    expect(gap?.actualWorst).toBe(3);
  });

  it("어떤 착각 패턴도 해당 없음 → null", () => {
    // Stage1/2/4 모두 >30, q6b 체념 없음, 점수 고름
    const answers: Answers = {
      q1a: 100, q1b: 100, // Stage1: 100
      q2a: 50,            // Stage2: 50
      q3a: 50,  q3b: 50, // Stage3: 50
      q4a: 50,  q4b: 50, // Stage4: 50
      q5a: 100,           // Stage5: 100
      q6a: 100, q6b: 100, // Stage6: 100
    };
    expect(detectGap(answers)).toBeNull();
  });
});
