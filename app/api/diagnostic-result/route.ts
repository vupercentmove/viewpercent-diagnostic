/**
 * POST /api/diagnostic-result
 * Accepts authoritative raw answers and derives every persisted result field server-side.
 */
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { insertDiagnosticResult, type DiagnosticResultRow } from "@/lib/supabase";
import { hasOnlyKeys, isPlainRecord } from "@/lib/api-validation";
import { readBoundedJson } from "@/lib/http-body";
import { allowRequest, type RateLimitDiagnostic } from "@/lib/rate-limit";
import { QUICK_QUESTIONS, type Question } from "@/lib/questions";
import { DEEP_QUESTIONS, getDeepQuestionsByStage, type DeepQuestion } from "@/lib/deep-questions";
import { buildResultSummary } from "@/lib/result-summary";
import { calcFullDeepStageScores, collectUnknownAreas, getFullWeakestStage } from "@/lib/full-deep-scoring";
import { computeIcpFlag, VISION_QUESTION, type IcpSignals } from "@/lib/full-deep-content";
import { isUnknownFallbackSequenceRealizable } from "@/lib/quiz-fallback";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 32_768;
const RESULT_RATE_LIMIT = { namespace: "diagnostic-result", limit: 5, windowMs: 60_000 } as const;
const QUICK_BASE_KEYS = ["quickAnswers", "utm", "diagnostic_mode"] as const;
const QUICK_DEEP_KEYS = [...QUICK_BASE_KEYS, "deepStageId", "deepAnswers"] as const;
const FULL_KEYS = ["diagnostic_mode", "fullAnswers", "vision_answer", "icp_signals", "utm"] as const;
const SCORE_VALUES = new Set([0, 25, 50, 75, 100]);
const SCORE_OR_UNKNOWN_VALUES = new Set([-1, 0, 25, 50, 75, 100]);

type ParsedBody = Omit<DiagnosticResultRow, "code">;

function parseUtm(value: unknown): Record<string, string> | null | undefined {
  if (value === undefined || value === null) return null;
  if (!isPlainRecord(value) || Object.keys(value).length > 10) return undefined;
  const parsed: Record<string, string> = {};
  for (const [key, candidate] of Object.entries(value)) {
    if (!(key === "ref" || key.startsWith("utm_")) || key.length > 64) return undefined;
    if (typeof candidate !== "string" || candidate.length > 200) return undefined;
    parsed[key] = candidate;
  }
  return parsed;
}

function parseExactAnswers(
  value: unknown,
  questions: readonly (Question | DeepQuestion)[],
  allowUnknown: boolean
): Record<string, number> | null {
  if (!isPlainRecord(value)) return null;
  const expectedIds = new Set(questions.map((question) => question.id));
  const entries = Object.entries(value);
  if (entries.length !== expectedIds.size || entries.some(([id]) => !expectedIds.has(id))) return null;

  const values = allowUnknown ? SCORE_OR_UNKNOWN_VALUES : SCORE_VALUES;
  const parsed: Record<string, number> = {};
  for (const question of questions) {
    const candidate = value[question.id];
    if (typeof candidate !== "number" || !values.has(candidate)) return null;
    if (question.answerType === "yn" && candidate !== 0 && candidate !== 100 && !(allowUnknown && candidate === -1)) return null;
    parsed[question.id] = candidate;
  }
  return parsed;
}

function parseIcpSignals(value: unknown): IcpSignals | null {
  if (!isPlainRecord(value) || !hasOnlyKeys(value, ["adSpendBand", "contentOngoing"])) return null;
  if (value.adSpendBand !== "under_300" && value.adSpendBand !== "300_1000" && value.adSpendBand !== "over_1000") return null;
  if (typeof value.contentOngoing !== "boolean") return null;
  return { adSpendBand: value.adSpendBand, contentOngoing: value.contentOngoing };
}

function parseQuickBody(value: Record<string, unknown>, utm: Record<string, string> | null): ParsedBody | null {
  const hasDeepStage = Object.prototype.hasOwnProperty.call(value, "deepStageId");
  const hasDeepAnswers = Object.prototype.hasOwnProperty.call(value, "deepAnswers");
  if (hasDeepStage !== hasDeepAnswers) return null;
  if (!hasOnlyKeys(value, hasDeepStage ? QUICK_DEEP_KEYS : QUICK_BASE_KEYS)) return null;
  if (value.diagnostic_mode !== undefined && value.diagnostic_mode !== "quick") return null;

  const quickAnswers = parseExactAnswers(value.quickAnswers, QUICK_QUESTIONS, false);
  if (!quickAnswers) return null;
  const summary = buildResultSummary(quickAnswers);

  let deepStageId: number | null = null;
  let deepAnswers: Record<string, number> | null = null;
  if (hasDeepStage) {
    if (value.deepStageId !== summary.worst.stageId) return null;
    deepStageId = summary.worst.stageId;
    deepAnswers = parseExactAnswers(value.deepAnswers, getDeepQuestionsByStage(deepStageId), false);
    if (!deepAnswers) return null;
  }

  return {
    stage_scores: summary.stageScores,
    overall_score: summary.overall,
    weakest_stage: summary.worst.stageId,
    result_type: summary.gap ? `gap_${summary.gap.perceivedWorst}_${summary.gap.actualWorst}` : "none",
    has_gap: summary.gap?.hasGap ?? false,
    quick_answers: quickAnswers,
    deep_stage_id: deepStageId,
    deep_answers: deepAnswers,
    utm,
    completed: true,
    diagnostic_mode: "quick",
    vision_answer: null,
    unknown_areas: null,
    icp_flag: null,
  };
}

function parseFullBody(value: Record<string, unknown>, utm: Record<string, string> | null): ParsedBody | null {
  if (!hasOnlyKeys(value, FULL_KEYS) || value.diagnostic_mode !== "full") return null;
  const fullAnswers = parseExactAnswers(value.fullAnswers, DEEP_QUESTIONS, true);
  if (!fullAnswers) return null;
  const stageIds = new Set(DEEP_QUESTIONS.map((question) => question.stageId));
  for (const stageId of stageIds) {
    const stageValues = getDeepQuestionsByStage(stageId).map((question) => fullAnswers[question.id]);
    if (!isUnknownFallbackSequenceRealizable(stageValues)) return null;
  }
  const icpSignals = parseIcpSignals(value.icp_signals);
  if (!icpSignals) return null;
  if (typeof value.vision_answer !== "string" || !VISION_QUESTION.options.includes(value.vision_answer as typeof VISION_QUESTION.options[number])) return null;

  const scores = calcFullDeepStageScores(fullAnswers);
  const weakest = getFullWeakestStage(scores);
  return {
    stage_scores: scores.map(({ stageId, score }) => ({ stageId, score })),
    overall_score: Math.round(scores.reduce((sum, stage) => sum + stage.score, 0) / scores.length),
    weakest_stage: weakest?.stageId ?? 0,
    result_type: "full",
    has_gap: false,
    quick_answers: null,
    deep_stage_id: null,
    deep_answers: fullAnswers,
    utm,
    completed: true,
    diagnostic_mode: "full",
    vision_answer: value.vision_answer,
    unknown_areas: collectUnknownAreas(fullAnswers),
    icp_flag: computeIcpFlag(icpSignals),
  };
}

function parseBody(value: unknown): ParsedBody | null {
  if (!isPlainRecord(value)) return null;
  const utm = parseUtm(value.utm);
  if (utm === undefined) return null;
  return value.diagnostic_mode === "full" ? parseFullBody(value, utm) : parseQuickBody(value, utm);
}

export async function POST(request: Request) {
  const parsedJson = await readBoundedJson(request, MAX_BODY_BYTES);
  if (!parsedJson.ok) return NextResponse.json({ error: parsedJson.error }, { status: parsedJson.status });
  const row = parseBody(parsedJson.value);
  if (!row) return NextResponse.json({ error: "invalid request" }, { status: 400 });
  let rateLimitDiagnostic: RateLimitDiagnostic | undefined;
  if (!(await allowRequest(request, RESULT_RATE_LIMIT, Date.now(), (diagnostic) => {
    rateLimitDiagnostic = diagnostic;
  }))) {
    const diagnosticHeader = rateLimitDiagnostic
      ? "status" in rateLimitDiagnostic
        ? `${rateLimitDiagnostic.reason}:${rateLimitDiagnostic.status}`
        : rateLimitDiagnostic.reason
      : undefined;
    return NextResponse.json(
      { error: "rate limited" },
      {
        status: 429,
        headers: diagnosticHeader ? { "x-vp-rate-limit-diagnostic": diagnosticHeader } : undefined,
      }
    );
  }

  const code = randomUUID();
  try {
    await insertDiagnosticResult({ code, ...row });
    return NextResponse.json({ ok: true, code });
  } catch (err) {
    console.error("[diagnostic-result] insert failed:", err);
    return NextResponse.json({ error: "store failed" }, { status: 502 });
  }
}
