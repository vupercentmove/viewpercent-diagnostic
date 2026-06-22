/**
 * 진단 결과 URL 상태화
 *
 * 10문항 답변(각 0/25/50/75/100)을 10자리 base-5 문자열로 인코딩.
 * 문항 순서: q1a q1b q2a q3a q3b q4a q4b q5a q6a q6b (questions.ts 정의 순)
 *
 * 공유 URL 예: ?a=0234100021&phase=result
 */

import type { Answers } from "./scoring";
import { QUICK_QUESTIONS } from "./questions";

const SCORE_TO_DIGIT: Record<number, string> = {
  0: "0",
  25: "1",
  50: "2",
  75: "3",
  100: "4",
};
const DIGIT_TO_SCORE: Record<string, number> = {
  "0": 0,
  "1": 25,
  "2": 50,
  "3": 75,
  "4": 100,
};

/** 문항 ID 정렬 순서 (questions.ts 순서와 동일) */
const QUESTION_ORDER = QUICK_QUESTIONS.map((q) => q.id);

/** Answers → 10자리 문자열 */
export function encodeAnswers(answers: Answers): string {
  return QUESTION_ORDER.map((id) => {
    const score = answers[id];
    return score !== undefined ? (SCORE_TO_DIGIT[score] ?? "2") : "2";
  }).join("");
}

/** 10자리 문자열 → Answers. 유효하지 않으면 null 반환 */
export function decodeAnswers(encoded: string): Answers | null {
  if (encoded.length !== QUESTION_ORDER.length) return null;
  const answers: Answers = {};
  for (let i = 0; i < QUESTION_ORDER.length; i++) {
    const digit = encoded[i];
    if (!(digit in DIGIT_TO_SCORE)) return null;
    answers[QUESTION_ORDER[i]] = DIGIT_TO_SCORE[digit];
  }
  return answers;
}

/** URL 쿼리파라미터에서 answers + phase 읽기 */
export function readStateFromUrl(): {
  answers: Answers | null;
  phase: string | null;
} {
  if (typeof window === "undefined") return { answers: null, phase: null };
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get("a");
  const phase = params.get("phase");
  return {
    answers: encoded ? decodeAnswers(encoded) : null,
    phase,
  };
}

/** 결과 공유 URL 생성 */
export function buildShareUrl(answers: Answers): string {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams();
  params.set("a", encodeAnswers(answers));
  params.set("phase", "result");
  return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
}

/** 현재 URL을 결과 상태로 업데이트 (pushState) */
export function pushResultState(answers: Answers): void {
  if (typeof window === "undefined") return;
  const url = buildShareUrl(answers);
  window.history.pushState({ phase: "result" }, "", url);
}

/** URL을 초기 상태로 리셋 */
export function pushInitialState(): void {
  if (typeof window === "undefined") return;
  window.history.pushState({ phase: "intro" }, "", window.location.pathname);
}
