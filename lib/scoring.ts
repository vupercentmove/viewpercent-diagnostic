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

/** ── 개인화 되비춤 (Personalized Echo) ── */

/**
 * 문항별 '되비춤' 문장 (대표가 직접 답한 내용을 1인칭으로 되돌려주는 한 줄).
 *
 * ── 작성 가이드 (비개발자용) ──
 * - 각 문항에서 '부정 신호'(약점 쪽)로 답했을 때만 화면에 보입니다.
 * - 문장에 방향을 박아두었으므로 정/역방향을 신경 쓸 필요가 없습니다.
 *   (예: q1a는 "예"가 부정 신호 → "…따라오지 않는다고 답하셨어요"로 고정)
 * - "~다고 답하셨어요 / ~다고 느끼고 계셨어요"처럼 대표의 응답을 차분히
 *   되짚는 톤. 비난·단정("못한다/실패")이 아니라 사실 확인 톤으로 씁니다.
 * - 문구만 고치면 되고, 키(q1a 등)는 절대 바꾸지 마세요.
 */
export const ECHO_PHRASES: Record<string, string> = {
  q1a: "광고비를 올려도 매출이 그만큼 따라오지 않는다고 답하셨어요.",
  q1b: "광고 성과가 하루하루 들쭉날쭉하다고 답하셨어요.",
  q2a: "고객이 처음 봤을 때 '여기 뭔가 다르다'는 느낌을 주기 어렵다고 답하셨어요.",
  q3a: "'예쁘니까'를 넘어서는 구매 이유는 아직 약하다고 답하셨어요.",
  q3b: "상세페이지가 '이거 나한테 맞을까' 하는 걱정을 충분히 풀어주지 못한다고 느끼고 계셨어요.",
  q4a: "장바구니에서 얼마나 이탈하는지 아직 보고 계시지 않다고 답하셨어요.",
  q4b: "'내 사이즈 후기가 없네' 하고 나가는 고객을 떠올려보신 적은 아직 없다고 답하셨어요.",
  q5a: "잘 나가던 상품이 품절돼 매출을 놓친 적이 있다고 답하셨어요.",
  q6a: "한 번 산 고객이 다시 오는지 아직 확인해보지 못했다고 답하셨어요.",
  q6b: "'우리 카테고리는 원래 재구매가 없어'라고 넘겨오셨다고 답하셨어요.",
};

/**
 * 손실회피 한 줄 — 되비춤 아래에 차분히 덧붙이는 단정형 문장.
 * 위협조·과장 금지. 지금 손 대지 않으면 같은 손실이 반복된다는 사실만 담담히.
 */
export const LOSS_AVERSION_LINE =
  "지금 흘려보내면 다음 시즌에도 같은 자리에서 새는 매출이에요.";

/** 점수가 '부정 신호'인지 (yn: 0 / likert: 25 이하) */
function isNegativeSignal(score: number): boolean {
  return score <= 25;
}

/**
 * 해당 Stage 문항을 questions.ts 순서대로 순회하여, 첫 '부정 신호' 문항의
 * 되비춤 문장 + 문항 id를 반환. 없으면 null. (결정적)
 */
export function buildEcho(
  answers: Answers,
  stageId: number
): { phrase: string; questionId: string } | null {
  const questions = QUICK_QUESTIONS.filter((q) => q.stageId === stageId);
  for (const q of questions) {
    const score = answers[q.id];
    if (score === undefined) continue;
    if (isNegativeSignal(score)) {
      const phrase = ECHO_PHRASES[q.id];
      if (phrase) return { phrase, questionId: q.id };
    }
  }
  return null;
}

/**
 * buildEcho의 문자열 버전 — 첫 부정 신호 문항의 되비춤 문장 반환, 없으면 null.
 */
export function buildEchoQuote(answers: Answers, stageId: number): string | null {
  return buildEcho(answers, stageId)?.phrase ?? null;
}
