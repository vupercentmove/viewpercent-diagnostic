import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEEP_QUESTIONS, getDeepQuestionsByStage } from "@/lib/deep-questions";
import { QUICK_QUESTIONS } from "@/lib/questions";
import { buildResultSummary } from "@/lib/result-summary";
import { calcFullDeepStageScores, collectUnknownAreas, getFullWeakestStage } from "@/lib/full-deep-scoring";
import { computeIcpFlag } from "@/lib/full-deep-content";

const { insertDiagnosticResult, allowRequest } = vi.hoisted(() => ({
  insertDiagnosticResult: vi.fn(),
  allowRequest: vi.fn(),
}));
vi.mock("@/lib/supabase", () => ({ insertDiagnosticResult }));
vi.mock("@/lib/rate-limit", () => ({ allowRequest }));

import { POST } from "./route";

const QUICK_ANSWERS = Object.fromEntries(QUICK_QUESTIONS.map((question, index) => [
  question.id,
  question.answerType === "yn" ? (index % 2 === 0 ? 100 : 0) : 75,
]));
const QUICK_SUMMARY = buildResultSummary(QUICK_ANSWERS);
const DEEP_STAGE_ID = QUICK_SUMMARY.worst.stageId;
const QUICK_DEEP_ANSWERS = Object.fromEntries(
  getDeepQuestionsByStage(DEEP_STAGE_ID).map((question) => [question.id, question.answerType === "yn" ? 100 : 75])
);
const FULL_ANSWERS = Object.fromEntries(DEEP_QUESTIONS.map((question) => [question.id, question.answerType === "yn" ? 100 : 75]));
const ICP_SIGNALS = { adSpendBand: "300_1000", contentOngoing: true } as const;

const QUICK_BODY = { quickAnswers: QUICK_ANSWERS };
const QUICK_DEEP_BODY = { quickAnswers: QUICK_ANSWERS, deepStageId: DEEP_STAGE_ID, deepAnswers: QUICK_DEEP_ANSWERS };
const FULL_BODY = {
  diagnostic_mode: "full",
  fullAnswers: FULL_ANSWERS,
  vision_answer: "제품·촬영에 더 투자하기",
  icp_signals: ICP_SIGNALS,
};

function post(payload: unknown) {
  return POST(new Request("http://localhost/api/diagnostic-result", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof payload === "string" ? payload : JSON.stringify(payload),
  }));
}

describe("POST /api/diagnostic-result authoritative answers", () => {
  beforeEach(() => {
    insertDiagnosticResult.mockReset();
    insertDiagnosticResult.mockResolvedValue(undefined);
    allowRequest.mockReset();
    allowRequest.mockResolvedValue(true);
  });

  it("recomputes and persists a completed quick result from exact raw answers", async () => {
    const res = await post(QUICK_BODY);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(insertDiagnosticResult).toHaveBeenCalledWith({
      code: data.code,
      stage_scores: QUICK_SUMMARY.stageScores,
      overall_score: QUICK_SUMMARY.overall,
      weakest_stage: QUICK_SUMMARY.worst.stageId,
      result_type: QUICK_SUMMARY.gap ? `gap_${QUICK_SUMMARY.gap.perceivedWorst}_${QUICK_SUMMARY.gap.actualWorst}` : "none",
      has_gap: QUICK_SUMMARY.gap?.hasGap ?? false,
      quick_answers: QUICK_ANSWERS,
      deep_stage_id: null,
      deep_answers: null,
      utm: null,
      completed: true,
      diagnostic_mode: "quick",
      vision_answer: null,
      unknown_areas: null,
      icp_flag: null,
    });
  });

  it("accepts quick-deep completion only for the recomputed weakest stage and exact stage questions", async () => {
    expect((await post(QUICK_DEEP_BODY)).status).toBe(200);
    expect(insertDiagnosticResult).toHaveBeenCalledWith(expect.objectContaining({
      quick_answers: QUICK_ANSWERS,
      deep_stage_id: DEEP_STAGE_ID,
      deep_answers: QUICK_DEEP_ANSWERS,
      completed: true,
    }));
  });

  it("recomputes full scores, weakest stage, unknown areas, and ICP from exact raw inputs", async () => {
    const scores = calcFullDeepStageScores(FULL_ANSWERS);
    const weakest = getFullWeakestStage(scores);
    const res = await post(FULL_BODY);
    expect(res.status).toBe(200);
    expect(insertDiagnosticResult).toHaveBeenCalledWith(expect.objectContaining({
      stage_scores: scores.map(({ stageId, score }) => ({ stageId, score })),
      overall_score: Math.round(scores.reduce((sum, stage) => sum + stage.score, 0) / scores.length),
      weakest_stage: weakest?.stageId ?? 0,
      result_type: "full",
      has_gap: false,
      quick_answers: null,
      deep_stage_id: null,
      deep_answers: FULL_ANSWERS,
      unknown_areas: collectUnknownAreas(FULL_ANSWERS),
      icp_flag: computeIcpFlag(ICP_SIGNALS),
    }));
  });

  it("rejects answered questions after two consecutive unknowns in the same full stage before rate limiting or insertion", async () => {
    const impossibleAnswers = {
      ...FULL_ANSWERS,
      d1a: -1,
      d1b: -1,
      d1c: 100,
      d1d: 75,
    };

    const res = await post({ ...FULL_BODY, fullAnswers: impossibleAnswers });

    expect(res.status).toBe(400);
    expect(allowRequest).not.toHaveBeenCalled();
    expect(insertDiagnosticResult).not.toHaveBeenCalled();
  });

  it("accepts unknown-known-unknown because the known answer resets the full-stage fallback streak", async () => {
    const resetAnswers = {
      ...FULL_ANSWERS,
      d1a: -1,
      d1b: 100,
      d1c: -1,
      d1d: 75,
    };

    const res = await post({ ...FULL_BODY, fullAnswers: resetAnswers });

    expect(res.status).toBe(200);
    expect(insertDiagnosticResult).toHaveBeenCalledWith(expect.objectContaining({ deep_answers: resetAnswers }));
  });

  it("accepts an unknown suffix after two consecutive unknowns skip the rest of a full stage", async () => {
    const skippedSuffixAnswers = {
      ...FULL_ANSWERS,
      d1a: -1,
      d1b: -1,
      d1c: -1,
      d1d: -1,
    };

    const res = await post({ ...FULL_BODY, fullAnswers: skippedSuffixAnswers });

    expect(res.status).toBe(200);
    expect(insertDiagnosticResult).toHaveBeenCalledWith(expect.objectContaining({ deep_answers: skippedSuffixAnswers }));
  });

  it.each([
    ["missing quick answer", { quickAnswers: Object.fromEntries(Object.entries(QUICK_ANSWERS).slice(1)) }],
    ["extra quick answer", { quickAnswers: { ...QUICK_ANSWERS, extra: 100 } }],
    ["invalid quick answer value", { quickAnswers: { ...QUICK_ANSWERS, q2a: 42 } }],
    ["caller-derived quick scores", { ...QUICK_BODY, overallScore: 100 }],
    ["partial quick-deep answers", { ...QUICK_DEEP_BODY, deepAnswers: Object.fromEntries(Object.entries(QUICK_DEEP_ANSWERS).slice(1)) }],
    ["extra quick-deep answer", { ...QUICK_DEEP_BODY, deepAnswers: { ...QUICK_DEEP_ANSWERS, d6e: 100 } }],
    ["deep stage not equal to recomputed weakest", { ...QUICK_DEEP_BODY, deepStageId: DEEP_STAGE_ID === 6 ? 5 : 6 }],
    ["deep answers omitted for a completed deep row", { quickAnswers: QUICK_ANSWERS, deepStageId: DEEP_STAGE_ID }],
    ["missing full answer", { ...FULL_BODY, fullAnswers: Object.fromEntries(Object.entries(FULL_ANSWERS).slice(1)) }],
    ["extra full answer", { ...FULL_BODY, fullAnswers: { ...FULL_ANSWERS, extra: 100 } }],
    ["partial full payload", { ...FULL_BODY, icp_signals: { adSpendBand: "300_1000" } }],
    ["caller-derived full scores", { ...FULL_BODY, stageScores: [] }],
    ["invalid vision", { ...FULL_BODY, vision_answer: "free text" }],
  ])("rejects %s before rate limiting or insertion", async (_name, payload) => {
    const res = await post(payload);
    expect(res.status).toBe(400);
    expect(allowRequest).not.toHaveBeenCalled();
    expect(insertDiagnosticResult).not.toHaveBeenCalled();
  });

  it("rejects an oversized body before rate limiting or insertion", async () => {
    const res = await post(JSON.stringify({ ...QUICK_BODY, padding: "x".repeat(40_000) }));
    expect(res.status).toBe(413);
    expect(allowRequest).not.toHaveBeenCalled();
    expect(insertDiagnosticResult).not.toHaveBeenCalled();
  });

  it("does not insert when the validated request is rate limited", async () => {
    allowRequest.mockResolvedValue(false);
    const res = await post(QUICK_BODY);
    expect(res.status).toBe(429);
    expect(insertDiagnosticResult).not.toHaveBeenCalled();
  });

  it("exposes only a bounded rate-limit diagnostic reason on denial", async () => {
    allowRequest.mockImplementation(async (_request, _policy, _now, report) => {
      report({ reason: "upstream_rejected", status: 401 });
      return false;
    });

    const res = await post(QUICK_BODY);

    expect(res.status).toBe(429);
    expect(res.headers.get("x-vp-rate-limit-diagnostic")).toBe("upstream_rejected:401");
    expect(insertDiagnosticResult).not.toHaveBeenCalled();
  });

  it("exposes a bounded rate-limit diagnostic reason without an upstream status", async () => {
    allowRequest.mockImplementation(async (_request, _policy, _now, report) => {
      report({ reason: "missing_trusted_client_address" });
      return false;
    });

    const res = await post(QUICK_BODY);

    expect(res.status).toBe(429);
    expect(res.headers.get("x-vp-rate-limit-diagnostic")).toBe("missing_trusted_client_address");
    expect(insertDiagnosticResult).not.toHaveBeenCalled();
  });

  it("does not expose a code when the server-only insert fails", async () => {
    insertDiagnosticResult.mockRejectedValue(new Error("down"));
    const res = await post(QUICK_BODY);
    expect(res.status).toBe(502);
    expect((await res.json()).code).toBeUndefined();
  });
});
