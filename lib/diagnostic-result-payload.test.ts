import { describe, expect, it } from "vitest";
import { DEEP_QUESTIONS, getDeepQuestionsByStage } from "./deep-questions";
import { QUICK_QUESTIONS } from "./questions";
import { buildFullResultPayload, buildQuickResultPayload } from "./diagnostic-result-payload";

const QUICK = Object.fromEntries(QUICK_QUESTIONS.map((question) => [question.id, question.answerType === "yn" ? 100 : 50]));

describe("diagnostic result client payloads", () => {
  it("sends raw quick answers and optional exact deep answers without derived fields", () => {
    const deepAnswers = Object.fromEntries(getDeepQuestionsByStage(2).map((question) => [question.id, 100]));
    expect(buildQuickResultPayload(QUICK, { deepStageId: 2, deepAnswers })).toEqual({
      quickAnswers: QUICK,
      deepStageId: 2,
      deepAnswers,
    });
  });

  it("marks UI-skipped full questions as unknown so completed payloads have the exact authoritative key set", () => {
    const partial = { [DEEP_QUESTIONS[0].id]: 100, [DEEP_QUESTIONS[1].id]: -1 };
    const payload = buildFullResultPayload(partial, "내 시간 되찾기", {
      adSpendBand: "under_300",
      contentOngoing: false,
    });
    expect(Object.keys(payload.fullAnswers)).toEqual(DEEP_QUESTIONS.map((question) => question.id));
    expect(payload.fullAnswers[DEEP_QUESTIONS[0].id]).toBe(100);
    expect(payload.fullAnswers[DEEP_QUESTIONS.at(-1)!.id]).toBe(-1);
    expect(payload).not.toHaveProperty("stageScores");
    expect(payload).not.toHaveProperty("icp_flag");
  });
});
