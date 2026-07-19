import { getDeepQuestionsByStage } from "./deep-questions";
import { STAGES } from "./stage-meta";
import type { Answers } from "./scoring";
import { isUnknown } from "./quiz-fallback";

export type FullDeepStageScore = { stageId: number; score: number; measured: boolean; unknownCount: number; answeredCount: number };

export function calcFullDeepStageScores(answers: Answers): FullDeepStageScore[] {
  return STAGES.map((stage) => {
    let sum = 0, measuredCount = 0, unknownCount = 0, answeredCount = 0;
    for (const q of getDeepQuestionsByStage(stage.id)) {
      const v = answers[q.id];
      if (v === undefined) continue;
      answeredCount++;
      if (isUnknown(v)) unknownCount++;
      else { sum += v; measuredCount++; }
    }
    return { stageId: stage.id, score: measuredCount > 0 ? Math.round(sum / measuredCount) : 0, measured: measuredCount > 0, unknownCount, answeredCount };
  });
}

export function getFullWeakestStage(scores: FullDeepStageScore[]): FullDeepStageScore | null {
  const m = scores.filter((s) => s.measured);
  return m.length ? m.reduce((w, c) => (c.score < w.score ? c : w)) : null;
}

export type SubAreaScore = { subArea: string; score: number; unknown: boolean };

export function subAreaBreakdown(stageId: number, answers: Answers): SubAreaScore[] {
  return getDeepQuestionsByStage(stageId).map((q) => {
    const v = answers[q.id];
    const unknown = v === undefined || isUnknown(v);
    return { subArea: q.subArea, score: unknown ? 0 : v, unknown };
  });
}

export function collectUnknownAreas(answers: Answers): { stageId: number; subAreas: string[] }[] {
  const out: { stageId: number; subAreas: string[] }[] = [];
  for (const stage of STAGES) {
    const subAreas = getDeepQuestionsByStage(stage.id)
      .filter((q) => answers[q.id] !== undefined && isUnknown(answers[q.id]))
      .map((q) => q.subArea);
    if (subAreas.length) out.push({ stageId: stage.id, subAreas });
  }
  return out;
}
