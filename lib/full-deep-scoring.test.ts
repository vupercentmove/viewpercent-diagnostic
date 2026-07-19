import { describe, it, expect } from "vitest";
import { getDeepQuestionsByStage } from "./deep-questions";
import { UNKNOWN_ANSWER } from "./quiz-fallback";
import type { Answers } from "./scoring";
import { calcFullDeepStageScores, getFullWeakestStage, subAreaBreakdown, collectUnknownAreas } from "./full-deep-scoring";

function answerStage(stageId: number, value: number): Answers {
  const a: Answers = {}; for (const q of getDeepQuestionsByStage(stageId)) a[q.id] = value; return a;
}

describe("full-deep-scoring", () => {
  it("단계 점수 = 평균, 6개", () => {
    const s = calcFullDeepStageScores({ ...answerStage(1, 80), ...answerStage(4, 40) });
    expect(s).toHaveLength(6);
    expect(s.find(x => x.stageId === 1)?.score).toBe(80);
    expect(s.find(x => x.stageId === 4)?.score).toBe(40);
  });
  it("모름은 평균 제외 + unknownCount", () => {
    const qs = getDeepQuestionsByStage(4);
    const s4 = calcFullDeepStageScores({ [qs[0].id]: 60, [qs[1].id]: UNKNOWN_ANSWER }).find(x => x.stageId === 4)!;
    expect(s4.score).toBe(60); expect(s4.unknownCount).toBe(1); expect(s4.measured).toBe(true);
  });
  it("전부 모름 → measured=false, score=0", () => {
    const s2 = calcFullDeepStageScores(answerStage(2, UNKNOWN_ANSWER)).find(x => x.stageId === 2)!;
    expect(s2.measured).toBe(false); expect(s2.score).toBe(0);
  });
  it("getFullWeakestStage: 측정된 것 중 최저", () => {
    const w = getFullWeakestStage(calcFullDeepStageScores({ ...answerStage(1, 80), ...answerStage(4, 30) }));
    expect(w?.stageId).toBe(4);
  });
  it("측정 없으면 null", () => expect(getFullWeakestStage(calcFullDeepStageScores({}))).toBeNull());
  it("subAreaBreakdown", () => {
    const qs = getDeepQuestionsByStage(4);
    const b = subAreaBreakdown(4, { [qs[0].id]: 30, [qs[1].id]: UNKNOWN_ANSWER });
    expect(b[0]).toEqual({ subArea: qs[0].subArea, score: 30, unknown: false });
    expect(b[1]).toEqual({ subArea: qs[1].subArea, score: 0, unknown: true });
  });
  it("collectUnknownAreas", () => {
    const qs = getDeepQuestionsByStage(4);
    expect(collectUnknownAreas({ [qs[0].id]: UNKNOWN_ANSWER })).toEqual([{ stageId: 4, subAreas: [qs[0].subArea] }]);
  });
});
