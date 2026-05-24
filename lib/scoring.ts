/** 스코어링 + 빈틈 진단 로직 */

import { QUICK_QUESTIONS, type Question } from "./questions";
import { STAGES, type StageMeta } from "./stage-meta";

export type Answers = Record<string, number>; // questionId → score (0~100)

/** yn 문항의 "역방향" 질문 — "예"가 부정적인 질문들 */
const REVERSE_YN = new Set(["q1a", "q1b", "q5a", "q6b"]);

/** yn 답변을 점수로 변환 */
export function ynToScore(questionId: string, answer: "yes" | "no"): number {
  const isReverse = REVERSE_YN.has(questionId);
  if (isReverse) {
    return answer === "yes" ? 0 : 100;
  }
  return answer === "yes" ? 100 : 0;
}

/** 리커트 답변을 점수로 변환 (1~5 → 0~100) */
export function likertToScore(value: number): number {
  return [0, 25, 50, 75, 100][value - 1] ?? 50;
}

/** Stage별 평균 점수 계산 */
export function calcStageScore(stageId: number, answers: Answers): number {
  const questions = QUICK_QUESTIONS.filter((q) => q.stageId === stageId);
  if (questions.length === 0) return 0;

  const total = questions.reduce((sum, q) => {
    return sum + (answers[q.id] ?? 50);
  }, 0);

  return Math.round(total / questions.length);
}

/** 모든 Stage 점수 계산 */
export function calcAllStageScores(answers: Answers): { stageId: number; score: number }[] {
  return STAGES.map((s) => ({
    stageId: s.id,
    score: calcStageScore(s.id, answers),
  }));
}

/** 태그 결정 */
export type ScoreTag = "good" | "warn" | "risk";

export function getTag(score: number): ScoreTag {
  if (score >= 70) return "good";
  if (score >= 40) return "warn";
  return "risk";
}

export function getTagLabel(tag: ScoreTag): string {
  return { good: "양호", warn: "주의", risk: "위험" }[tag];
}

/** 1순위 위험 Stage 찾기 */
export function getWorstStage(
  stageScores: { stageId: number; score: number }[]
): { stageId: number; score: number } {
  return stageScores.reduce((worst, current) =>
    current.score < worst.score ? current : worst
  );
}

/** ── 빈틈 진단 로직 ── */

export interface GapDiagnosis {
  /** 고객이 체감하는 1순위 고민 Stage */
  perceivedWorst: number;
  /** 실제 데이터상 가장 약한 Stage */
  actualWorst: number;
  /** 빈틈이 존재하는가 */
  hasGap: boolean;
  /** 빈틈 메시지 */
  message: string;
}

/**
 * 빈틈 진단: 자기인식과 데이터의 차이를 감지
 *
 * 로직:
 * - Stage 1 관련 문항(q1a, q1b)에서 "예"가 2개 → 고객은 "광고 효율"이 1순위 고민
 * - 실제 점수는 다른 Stage가 더 낮을 수 있음
 * - 이 차이를 찾아서 메시지로 전달
 */
export function detectGap(answers: Answers): GapDiagnosis | null {
  const stageScores = calcAllStageScores(answers);
  const actualWorstObj = getWorstStage(stageScores);

  // Stage 1 점수 (광고 효율 인식)
  const stage1Score = stageScores.find((s) => s.stageId === 1)?.score ?? 50;

  // "광고비 고민"이 체감되는지 (Stage 1 점수가 낮으면 고객이 광고를 문제로 인식)
  const perceivedWorst = stage1Score <= 30 ? 1 : actualWorstObj.stageId;

  // 빈틈: 고객은 Stage 1이 문제라고 느끼지만, 실제로는 다른 Stage가 더 약함
  if (perceivedWorst === 1 && actualWorstObj.stageId !== 1) {
    const actualStage = STAGES.find((s) => s.id === actualWorstObj.stageId)!;
    return {
      perceivedWorst: 1,
      actualWorst: actualWorstObj.stageId,
      hasGap: true,
      message: `광고 효율이 가장 큰 고민이라고 답하셨지만, 진단 결과는 '${actualStage.name}' 단계가 더 약하다고 말합니다. 광고비를 더 쓰기 전에, 여기를 먼저 봐야 할 수 있어요.`,
    };
  }

  // Stage 6 체념 패턴: q6b에 "예" (체념) + Stage 6 점수가 실제로 낮음
  const q6bScore = answers["q6b"];
  if (q6bScore === 0 && actualWorstObj.stageId !== 6) {
    return {
      perceivedWorst: 6,
      actualWorst: actualWorstObj.stageId,
      hasGap: true,
      message: `재구매가 없다고 체념하고 계셨지만, 진단 결과는 그 전 단계에서 이미 고객을 놓치고 있을 수 있다고 말합니다.`,
    };
  }

  return null;
}

/** 전체 평균 점수 */
export function calcOverallScore(answers: Answers): number {
  const stageScores = calcAllStageScores(answers);
  const total = stageScores.reduce((sum, s) => sum + s.score, 0);
  return Math.round(total / stageScores.length);
}
