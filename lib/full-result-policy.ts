import type { FullDeepStageScore } from "./full-deep-scoring";
import { getDeepQuestionsByStage } from "./deep-questions";

export type FullResultState = "unmeasured" | "incomplete" | "maintain" | "priority";

/**
 * 정밀 진단 결과의 표현·AI 호출 정책을 한 곳에서 결정한다.
 * 측정된 약한 단계가 있을 때만 문제 진단형 AI 코멘트를 요청한다.
 */
export function classifyFullResult(scores: FullDeepStageScore[]): FullResultState {
  const measured = scores.filter((stage) => stage.measured);
  if (measured.length === 0) return "unmeasured";

  const incomplete = scores.some(
    (stage) =>
      !stage.measured ||
      stage.unknownCount > 0 ||
      stage.answeredCount < getDeepQuestionsByStage(stage.stageId).length
  );
  if (incomplete) return "incomplete";
  if (measured.some((stage) => stage.score < 70)) return "priority";
  return "maintain";
}

export function shouldRequestFullAiComment(scores: FullDeepStageScore[]): boolean {
  return classifyFullResult(scores) === "priority";
}
