/**
 * 진단 결과 URL 상태화
 *
 * 10문항 답변(각 0/25/50/75/100)을 10자리 base-5 문자열로 인코딩.
 * 문항 순서: q1a q1b q2a q3a q3b q4a q4b q5a q6a q6b (questions.ts 정의 순)
 *
 * 공유 URL 예: ?a=0234100021&phase=result
 *
 * 정밀(full) 모드는 27문항 답변(0/25/50/75/100 + 모름 + 미응답)을 27자리
 * 문자열로, 비전 응답을 1자리로 인코딩한다.
 * 복원 URL 예: ?fa=0123456...(27자)&v=2&phase=full-result
 */

import type { Answers } from "./scoring";
import { QUICK_QUESTIONS } from "./questions";
import { DEEP_QUESTIONS } from "./deep-questions";
import { UNKNOWN_ANSWER, isUnknown } from "./quiz-fallback";
import { VISION_QUESTION } from "./full-deep-content";

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

/** 정밀 모드 심화 문항 ID 정렬 순서 (deep-questions.ts 순서와 동일, 27문항) */
const FULL_QUESTION_ORDER = DEEP_QUESTIONS.map((q) => q.id);

/** 0/25/50/75/100은 기존 SCORE_TO_DIGIT/DIGIT_TO_SCORE 재사용, "모름"·"미응답"만 추가 */
const FULL_UNKNOWN_DIGIT = "5";
const FULL_MISSING_DIGIT = "6"; // 스테이지 중도 이탈(모름 폴백)로 아예 응답하지 않은 문항

/** Answers(정밀) → 27자리 문자열. 미응답 문항은 "6", 모름 응답은 "5" */
export function encodeFullAnswers(answers: Answers): string {
  return FULL_QUESTION_ORDER.map((id) => {
    const v = answers[id];
    if (v === undefined) return FULL_MISSING_DIGIT;
    if (isUnknown(v)) return FULL_UNKNOWN_DIGIT;
    return SCORE_TO_DIGIT[v] ?? FULL_MISSING_DIGIT;
  }).join("");
}

/** 27자리 문자열 → Answers(정밀). 유효하지 않으면 null 반환 */
export function decodeFullAnswers(encoded: string): Answers | null {
  if (encoded.length !== FULL_QUESTION_ORDER.length) return null;
  const answers: Answers = {};
  for (let i = 0; i < FULL_QUESTION_ORDER.length; i++) {
    const digit = encoded[i];
    if (digit === FULL_MISSING_DIGIT) continue; // 키 자체를 생략 (미응답)
    if (digit === FULL_UNKNOWN_DIGIT) {
      answers[FULL_QUESTION_ORDER[i]] = UNKNOWN_ANSWER;
      continue;
    }
    if (!(digit in DIGIT_TO_SCORE)) return null;
    answers[FULL_QUESTION_ORDER[i]] = DIGIT_TO_SCORE[digit];
  }
  return answers;
}

const VISION_OPTIONS = VISION_QUESTION.options;
const VISION_NONE_DIGIT = "x";

/** 비전 응답(4지선다 문자열 | null) → 1자리 문자 */
function encodeVision(vision: string | null): string {
  if (vision === null) return VISION_NONE_DIGIT;
  const idx = VISION_OPTIONS.indexOf(vision as (typeof VISION_OPTIONS)[number]);
  return idx >= 0 ? String(idx) : VISION_NONE_DIGIT;
}

/** 1자리 문자 → 비전 응답 문자열 | null */
function decodeVision(digit: string | null): string | null {
  if (!digit || digit === VISION_NONE_DIGIT) return null;
  const idx = Number(digit);
  return VISION_OPTIONS[idx] ?? null;
}

/** URL 쿼리파라미터에서 answers + phase (+ 정밀 모드 fullAnswers/vision) 읽기 */
export function readStateFromUrl(): {
  answers: Answers | null;
  phase: string | null;
  fullAnswers: Answers | null;
  vision: string | null;
} {
  if (typeof window === "undefined") {
    return { answers: null, phase: null, fullAnswers: null, vision: null };
  }
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get("a");
  const phase = params.get("phase");
  const fullEncoded = params.get("fa");
  const visionDigit = params.get("v");
  return {
    answers: encoded ? decodeAnswers(encoded) : null,
    phase,
    fullAnswers: fullEncoded ? decodeFullAnswers(fullEncoded) : null,
    vision: decodeVision(visionDigit),
  };
}

/** 결과 공유 경로 (서버/클라 공용) — SSR OG 메타가 붙는 정식 공유 URL */
export function resultPath(answers: Answers): string {
  return `/result/${encodeAnswers(answers)}`;
}

/**
 * 결과 공유 URL 생성 (절대 URL).
 * 공유·복사·카톡 ref용. SSR 라우트(/result/[encoded])라 카톡 미리보기(OG)가 붙는다.
 */
export function buildShareUrl(answers: Answers): string {
  if (typeof window === "undefined") return resultPath(answers);
  return `${window.location.origin}${resultPath(answers)}`;
}

/**
 * SPA 내부 결과 상태를 URL에 반영 (pushState).
 *
 * 루트(/)에 머무르며 ?a=<enc>&phase=result 쿼리만 붙인다 — readStateFromUrl이
 * 읽는 형식과 일치해야 뒤로가기/앞으로가기/새로고침 복원이 동작한다.
 * (공유용 정식 링크는 buildShareUrl()이 만드는 /result/<enc> SSR 경로다.)
 */
export function pushResultState(answers: Answers): void {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  params.set("a", encodeAnswers(answers));
  params.set("phase", "result");
  params.delete("fa"); // 정밀 모드 잔여 파라미터 정리 (모드 전환 시 혼재 방지)
  params.delete("v");
  const url = `${window.location.pathname}?${params.toString()}`;
  window.history.pushState({ phase: "result" }, "", url);
}

/**
 * 정밀(full) 모드 결과 상태를 URL에 반영 (pushState).
 *
 * 루트(/)에 머무르며 ?fa=<enc27>&v=<vision>&phase=full-result 쿼리를 붙인다.
 * readStateFromUrl이 읽는 형식과 일치해야 뒤로가기/새로고침 복원이 동작한다.
 */
export function pushFullResultState(answers: Answers, vision: string | null): void {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  params.set("fa", encodeFullAnswers(answers));
  params.set("v", encodeVision(vision));
  params.set("phase", "full-result");
  params.delete("a"); // 빠른 모드 잔여 파라미터 정리 (모드 전환 시 혼재 방지)
  const url = `${window.location.pathname}?${params.toString()}`;
  window.history.pushState({ phase: "full-result" }, "", url);
}

/** URL을 초기 상태로 리셋 */
export function pushInitialState(): void {
  if (typeof window === "undefined") return;
  window.history.pushState({ phase: "intro" }, "", window.location.pathname);
}
