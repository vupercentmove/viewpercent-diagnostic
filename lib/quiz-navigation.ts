/** 한 화면 한 문항 네비게이션 — 순수 함수 (자동 전진 가드 포함) */

import type { AnswerType } from "./questions";

/** 다음 커서 (total-1로 클램프) */
export function nextIndex(cursor: number, total: number): number {
  return Math.min(cursor + 1, total - 1);
}

/** 이전 커서 (0으로 클램프) */
export function prevIndex(cursor: number): number {
  return Math.max(cursor - 1, 0);
}

/** 현재 커서가 마지막 문항인가 */
export function isLastQuestion(cursor: number, total: number): boolean {
  return cursor === total - 1;
}

/**
 * 자동 전진 여부.
 * - 현재 커서 문항을 답했을 때(answeredIndex === cursor)만 후보
 * - 마지막 문항이 아닐 때만 전진(마지막은 수동 CTA)
 * - 과거 문항으로 돌아가 수정한 경우는 answeredIndex < cursor 가 아니라
 *   호출부에서 '처음 답하는 문항'인지를 AND 가드로 함께 판단한다.
 */
export function shouldAutoAdvance(args: {
  answeredIndex: number;
  cursor: number;
  total: number;
}): boolean {
  const { answeredIndex, cursor, total } = args;
  return answeredIndex === cursor && cursor < total - 1;
}

/** 답변 타입별 자동 전진 지연(ms) — yn은 즉시, likert는 선택 확인 여유 */
export function autoAdvanceDelay(answerType: AnswerType): number {
  return answerType === "likert" ? 350 : 0;
}
