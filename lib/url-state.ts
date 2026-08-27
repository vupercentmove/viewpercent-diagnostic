/**
 * 진단 결과 URL 상태화
 *
 * 10문항 답변(각 0/25/50/75/100)을 10자리 base-5 문자열로 인코딩.
 * 문항 순서: q1a q1b q2a q3a q3b q4a q4b q5a q6a q6b (questions.ts 정의 순)
 *
 * 공유 URL 예: ?a=0234100021&phase=result
 *
 * 정밀(full) 모드는 심화 문항 답변(0/25/50/75/100 + 모름 + 미응답)을 문항 수만큼의
 * 자리로, 비전 응답을 1자리로 인코딩한다.
 * 복원 URL 예: ?fa=0123456...(27자)&v=2&phase=full-result
 */

import type { Answers } from "./scoring";
import { QUICK_QUESTIONS } from "./questions";
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

/**
 * 인코딩 버전 표기 — 버전은 인코딩 문자열 자체가 들고 다닌다.
 *
 *   v1  : 접두어 없음        "0123401234"
 *   v2+ : "<버전>-" 접두어    "2-012340123456"
 *
 * 왜 쿼리 파라미터가 아니라 문자열 안에 넣는가:
 * 빠른 진단의 정식 공유 링크는 경로다(`/result/<enc>` — 카톡 OG 미리보기 때문에
 * SSR 라우트를 쓴다). 경로에는 파라미터를 붙일 자리가 없다. 문자열이 스스로 버전을
 * 들고 다니면 경로든 쿼리든 파서 하나로 처리되고, `decodeAnswers`를 호출하는 네 곳
 * (SSR 라우트·OG 이미지 라우트·SharedResult·readStateFromUrl)을 하나도 고치지
 * 않아도 된다. 답변 숫자는 0~4뿐이라 "-"와 충돌하지 않는다.
 *
 * v1을 접두어 없이 두는 이유: 이미 밖에 나가 있는 링크가 전부 접두어 없는 형태다.
 */
const LEGACY_VERSION = 1;

function parseVersionedCode(code: string): { version: number; payload: string } {
  const m = /^(\d+)-(.*)$/.exec(code);
  return m ? { version: Number(m[1]), payload: m[2] } : { version: LEGACY_VERSION, payload: code };
}

function formatVersionedCode(version: number, payload: string): string {
  return version === LEGACY_VERSION ? payload : `${version}-${payload}`;
}

/**
 * 빠른 진단 문항 순서 — 버전별로 동결한다.
 *
 * ⚠️ 이미 배포된 버전의 배열은 절대 수정하지 않는다. 자세한 이유는 아래
 *    FULL_ORDER_V1의 주석 참고 — 같은 함정이 그대로 적용된다.
 *    `lib/url-version.test.ts`가 현재 버전 배열과 QUICK_QUESTIONS의 일치를 검사한다.
 */
export const QUICK_ORDER_V1: readonly string[] = Object.freeze([
  "q1a", "q1b", "q2a", "q3a", "q3b", "q4a", "q4b", "q5a", "q6a", "q6b",
]);

/** 버전 번호 → 그 버전의 문항 순서 */
export const QUICK_ORDER_BY_VERSION: Readonly<Record<number, readonly string[]>> =
  Object.freeze({ 1: QUICK_ORDER_V1 });

/** 지금 새로 만드는 빠른 진단 링크에 찍히는 버전 */
export const QUICK_ENCODING_VERSION = 1;

/** Answers → 인코딩 문자열 (현재 버전) */
export function encodeAnswers(answers: Answers): string {
  const order = QUICK_ORDER_BY_VERSION[QUICK_ENCODING_VERSION];
  const digits = order
    .map((id) => {
      const score = answers[id];
      return score !== undefined ? (SCORE_TO_DIGIT[score] ?? "2") : "2";
    })
    .join("");
  return formatVersionedCode(QUICK_ENCODING_VERSION, digits);
}

/**
 * 인코딩 문자열 → Answers. 유효하지 않으면 null 반환.
 *
 * 버전은 문자열이 들고 있다 — 접두어가 없으면 v1(버전 도입 전 링크).
 */
export function decodeAnswers(encoded: string): Answers | null {
  const { version, payload } = parseVersionedCode(encoded);
  const order = QUICK_ORDER_BY_VERSION[version];
  if (!order) return null;
  if (payload.length !== order.length) return null;
  const answers: Answers = {};
  for (let i = 0; i < order.length; i++) {
    const digit = payload[i];
    if (!(digit in DIGIT_TO_SCORE)) return null;
    answers[order[i]] = DIGIT_TO_SCORE[digit];
  }
  return answers;
}

/**
 * 정밀 모드 인코딩 버전 — 자리 i가 어느 문항인지는 버전마다 고정이다.
 *
 * 왜 DEEP_QUESTIONS에서 파생하지 않고 문자열로 박아두는가:
 * 이전에는 `DEEP_QUESTIONS.map(q => q.id)`를 그대로 썼다. 그래서 문항을 하나만
 * 더해도 길이가 27→28이 되고, 이미 나간 27자리 링크가 전부 디코드 실패(null)했다.
 * null이면 app/page.tsx의 복원 분기가 조용히 실패해 에러 화면도 없이 시작 화면이
 * 뜬다 — 실고객에게 보낸 결과 링크가 그렇게 죽는다(2026-08-25 확인).
 *
 * ⚠️ 이미 배포된 버전의 배열은 절대 수정하지 않는다. 문항을 추가·삭제·재배치하면
 *    새 버전 배열을 추가하고 FULL_ENCODING_VERSION을 올린다. 기존 배열을 고치면
 *    이미 나간 링크가 다른 문항으로 복원된다 — 틀린 결과가 조용히 표시되는 쪽이
 *    시작 화면으로 떨어지는 것보다 나쁘다.
 *    `lib/url-version.test.ts`가 현재 버전 배열과 DEEP_QUESTIONS의 일치를
 *    검사하므로, 버전을 안 올리고 문항만 바꾸면 CI에서 먼저 걸린다.
 */
export const FULL_ORDER_V1: readonly string[] = Object.freeze([
  "d1a", "d1b", "d1c", "d1d",
  "d2a", "d2b", "d2c", "d2d",
  "d3a", "d3b", "d3c", "d3d", "d3e",
  "d4a", "d4b", "d4c", "d4d", "d4e",
  "d5a", "d5b", "d5c", "d5d",
  "d6a", "d6b", "d6c", "d6d", "d6e",
]);

/** 버전 번호 → 그 버전의 문항 순서 */
export const FULL_ORDER_BY_VERSION: Readonly<Record<number, readonly string[]>> =
  Object.freeze({ 1: FULL_ORDER_V1 });

/** 지금 새로 만드는 링크에 찍히는 버전 */
export const FULL_ENCODING_VERSION = 1;

/** 0/25/50/75/100은 기존 SCORE_TO_DIGIT/DIGIT_TO_SCORE 재사용, "모름"·"미응답"만 추가 */
const FULL_UNKNOWN_DIGIT = "5";
const FULL_MISSING_DIGIT = "6"; // 스테이지 중도 이탈(모름 폴백)로 아예 응답하지 않은 문항

/** Answers(정밀) → 인코딩 문자열 (현재 버전). 미응답 문항은 "6", 모름 응답은 "5" */
export function encodeFullAnswers(answers: Answers): string {
  const digits = FULL_ORDER_BY_VERSION[FULL_ENCODING_VERSION]
    .map((id) => {
      const v = answers[id];
      if (v === undefined) return FULL_MISSING_DIGIT;
      if (isUnknown(v)) return FULL_UNKNOWN_DIGIT;
      return SCORE_TO_DIGIT[v] ?? FULL_MISSING_DIGIT;
    })
    .join("");
  return formatVersionedCode(FULL_ENCODING_VERSION, digits);
}

/**
 * 인코딩 문자열 → Answers(정밀). 유효하지 않으면 null 반환.
 *
 * 버전은 문자열이 들고 있다 — 접두어가 없으면 v1(버전 도입 전 링크).
 *
 * 그 버전에 있었지만 지금은 없는 문항의 키도 그대로 담아 돌려준다. 스코어링은
 * `getDeepQuestionsByStage()`를 돌며 answers를 조회하므로(full-deep-scoring.ts)
 * 사라진 문항 키는 읽히지 않고, 새로 생긴 문항은 undefined라 평균에서 빠진다 —
 * 이미 있는 "미응답" 처리와 같은 경로다.
 */
export function decodeFullAnswers(encoded: string): Answers | null {
  const { version, payload } = parseVersionedCode(encoded);
  const order = FULL_ORDER_BY_VERSION[version];
  if (!order) return null;
  if (payload.length !== order.length) return null;
  const answers: Answers = {};
  for (let i = 0; i < order.length; i++) {
    const digit = payload[i];
    if (digit === FULL_MISSING_DIGIT) continue; // 키 자체를 생략 (미응답)
    if (digit === FULL_UNKNOWN_DIGIT) {
      answers[order[i]] = UNKNOWN_ANSWER;
      continue;
    }
    if (!(digit in DIGIT_TO_SCORE)) return null;
    answers[order[i]] = DIGIT_TO_SCORE[digit];
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
