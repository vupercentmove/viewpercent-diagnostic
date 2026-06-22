/**
 * 결과 요약 파이프라인 단일 출처.
 *
 * OG 라우트(app/api/og)와 결과 메타(app/result/[encoded])가 동일한
 * decode→점수→라벨 파이프라인을 중복 구현하던 것을 한 함수로 모은다.
 * 순수 함수라 Edge·Node 런타임 모두에서 안전하다.
 */

import {
  type Answers,
  calcAllStageScores,
  calcOverallScore,
  getWorstStage,
  detectGap,
} from "./scoring";
import { matchLabel, type ResultLabel } from "./result-labels";
import type { GapDiagnosis } from "./scoring";

export interface ResultSummary {
  stageScores: { stageId: number; score: number }[];
  overall: number;
  worst: { stageId: number; score: number };
  gap: GapDiagnosis | null;
  label: ResultLabel;
}

export function buildResultSummary(answers: Answers): ResultSummary {
  const stageScores = calcAllStageScores(answers);
  const overall = calcOverallScore(answers);
  const worst = getWorstStage(stageScores);
  const gap = detectGap(answers);
  const label = matchLabel(gap, worst);
  return { stageScores, overall, worst, gap, label };
}
