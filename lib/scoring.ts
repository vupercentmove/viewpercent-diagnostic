/** 스코어링 + 빈틈 진단 로직 */

import { QUICK_QUESTIONS, type Question } from "./questions";
import { STAGES, type StageMeta } from "./stage-meta";

export type Answers = Record<string, number>; // questionId → score (0~100)

/**
 * yn 문항의 "역방향" 질문 — "예"가 부정적인 질문들.
 * ⚠️ 스코어링 불변 핵심: 이 세트는 절대 변경 금지 (UI도 ynToScore로만 참조).
 */
export const REVERSE_YN = new Set(["q1a", "q1b", "q5a", "q6b"]);

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
 * 감지 패턴 (우선순위 순):
 * 1. Stage 1 착각 — 광고비 탓이라고 느끼지만 실제 병목은 다른 단계
 * 2. Stage 6 체념 — 재구매는 원래 없다고 체념했지만 실제 병목은 앞 단계
 * 3. Stage 2 착각 — 브랜딩이 약해서 못 판다고 느끼지만 실제 병목은 다른 단계
 * 4. Stage 4 착각 — 결제/장바구니가 문제라고 느끼지만 실제 병목은 다른 단계
 */
export function detectGap(answers: Answers): GapDiagnosis | null {
  const stageScores = calcAllStageScores(answers);
  const actualWorstObj = getWorstStage(stageScores);

  // ── 패턴 1: Stage 1 착각 (광고 효율 탓) ──
  const stage1Score = stageScores.find((s) => s.stageId === 1)?.score ?? 50;
  if (stage1Score <= 30 && actualWorstObj.stageId !== 1) {
    const actualStage = STAGES.find((s) => s.id === actualWorstObj.stageId)!;
    return {
      perceivedWorst: 1,
      actualWorst: actualWorstObj.stageId,
      hasGap: true,
      message: `광고 쪽 문항에서 막히는 지점을 많이 짚어주셨는데, 나머지 답변은 '${actualStage.name}' 단계가 더 얇다고 말합니다. 광고를 더 돌릴지 정하기 전에, 여기를 먼저 확인해볼 수 있어요.`,
    };
  }

  // ── 패턴 2: Stage 6 체념 (재구매 포기) ──
  // q6b는 REVERSE_YN — "예"(score=0)가 "재구매는 원래 없어"라는 체념 신호
  const q6bScore = answers["q6b"];
  if (q6bScore === 0 && actualWorstObj.stageId !== 6) {
    const actualStage = STAGES.find((s) => s.id === actualWorstObj.stageId)!;
    return {
      perceivedWorst: 6,
      actualWorst: actualWorstObj.stageId,
      hasGap: true,
      message: `재구매는 카테고리가 정한다고 보고 계셨는데, 나머지 답변은 그보다 '${actualStage.name}' 단계에서 먼저 고객이 돌아서고 있을 수 있다고 말합니다.`,
    };
  }

  // ── 패턴 3: Stage 2 착각 (브랜드 인지 약함 탓) ──
  // stage2Score가 매우 낮으면 "브랜딩이 문제"라고 인식하고 있는 상태
  const stage2Score = stageScores.find((s) => s.stageId === 2)?.score ?? 50;
  if (stage2Score <= 30 && actualWorstObj.stageId !== 2) {
    const actualStage = STAGES.find((s) => s.id === actualWorstObj.stageId)!;
    return {
      perceivedWorst: 2,
      actualWorst: actualWorstObj.stageId,
      hasGap: true,
      message: `브랜드가 어떻게 읽히는지에서 막힌다고 답하셨는데, 나머지 답변은 '${actualStage.name}' 단계가 더 얇다고 말합니다. 브랜드 작업보다 이 구간을 먼저 볼 수 있어요.`,
    };
  }

  // ── 패턴 4: Stage 4 착각 (결제·장바구니 탓) ──
  // stage4Score가 매우 낮으면 "장바구니 이탈이 문제"라고 인식하고 있는 상태
  const stage4Score = stageScores.find((s) => s.stageId === 4)?.score ?? 50;
  if (stage4Score <= 30 && actualWorstObj.stageId !== 4) {
    const actualStage = STAGES.find((s) => s.id === actualWorstObj.stageId)!;
    return {
      perceivedWorst: 4,
      actualWorst: actualWorstObj.stageId,
      hasGap: true,
      message: `결제 직전 구간을 짚어주셨는데, 나머지 답변은 '${actualStage.name}' 단계가 더 얇다고 말합니다. 장바구니에 담기는 숫자 자체가 어디서 정해지는지부터 볼 수 있어요.`,
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
 * - ⚠️ 답변을 그대로 되풀이하지 않습니다. 대표가 고른 사실을 받되, 그 사실이
 *   무엇을 뜻하는지 한 겹 다시 정의해 주는 문장이어야 합니다.
 *   (X) "대표님은 광고비 결정을 직접 하고 있습니다."  ← 답변 반복
 *   (O) "광고 운영은 맡기고 있지만, 늘릴지 줄일지 정하는 책임은 대표님께 남아 있어요."
 * - ⚠️ 답변보다 앞서 나가지 않습니다. 대표가 말하지 않은 감정("답답하셨죠")을
 *   단정하지 말고, 확정 어투 대신 "~일 수 있어요 / ~인 상태예요"로 여지를 둡니다.
 * - 비난·단정("못한다/실패")이 아니라 구조를 짚는 톤으로 씁니다.
 * - 문구만 고치면 되고, 키(q1a 등)는 절대 바꾸지 마세요.
 */
export const ECHO_PHRASES: Record<string, string> = {
  q1a: "광고비를 늘린 달에 매출이 따라오지 않았다면, 지금 모자란 건 예산이 아니라 그 예산을 어디에 쓸지 정할 근거일 수 있어요.",
  q1b: "성과가 오르내린 이유를 설명하기 어려웠다면, 광고는 돌아가고 있지만 판단할 재료는 아직 대표님 손에 없는 상태예요.",
  q2a: "의도한 답이 돌아오지 않았다면, 브랜드가 약한 게 아니라 무엇을 먼저 보여줄지가 아직 안 정해진 거예요.",
  q3a: "'예쁘다' 말고 다른 이유가 아직 안 보인다면, 상품이 아니라 그 상품을 고를 이유를 말해줄 문장이 비어 있어요.",
  q3b: "자주 오는 질문이 상세페이지에 없다면, 고객은 궁금해서 묻는 게 아니라 확인이 안 돼서 돌아서고 있어요.",
  q4a: "장바구니 이탈 비율을 바로 열어볼 수 없다면, 결제 직전에서 새는 매출은 지금 숫자로 잡히지 않고 있어요.",
  q4b: "사이즈·체형을 언급한 후기가 적다면, 고객은 안 맞을까 봐가 아니라 확인할 데가 없어서 돌아서고 있어요.",
  q5a: "품절로 판매를 멈춘 적이 있다면, 재고가 모자랐다기보다 언제 떨어질지 미리 알 방법이 없었던 거예요.",
  q6a: "재방문 비율을 숫자로 말하기 어렵다면, 재구매가 없는 게 아니라 있었는지조차 아직 보이지 않는 상태예요.",
  q6b: "재구매를 카테고리가 정하는 것으로 보고 계셨다면, 그 판단이 맞는지 확인할 데이터부터 아직 손에 없을 수 있어요.",
};

/**
 * 구조 인식 한 줄 — 되비춤 아래에 차분히 덧붙이는 문장.
 *
 * ⚠️ 위협·압박용 문장이 아닙니다. "지금 안 하면 손해"라는 손실회피 압박은
 *    진단을 영업으로 만들고, 대표가 답한 것보다 앞서 나갑니다.
 *    지금 확인된 구조가 그대로면 같은 판단이 반복된다는 사실만 담담히 둡니다.
 */
export const LOSS_AVERSION_LINE =
  "이 구조가 그대로면, 다음 시즌에도 같은 자리에서 같은 판단을 하게 됩니다.";

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
