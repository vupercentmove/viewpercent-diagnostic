export const UNKNOWN_ANSWER = -1;
export const UNKNOWN_FALLBACK_THRESHOLD = 2;

/**
 * 정밀 진단 모름 버튼 문구. 모름은 점수에서 빠지고(아니요는 0점) 2연속이면 단계를 건너뛴다.
 *
 * ⚠️ "안 해봤어요"류를 넣지 않는다. 2026-09-24까지 "잘 모르겠어요 · 아직 안 해봤어요"였는데,
 *    문항 대부분이 "~하고 있나요 / ~해본 적 있나요"라 "아직 안 해봤어요"는 곧 "아니요"였다.
 *    같은 뜻인데 아니요는 0점, 모름은 제외라 안 해본 대표일수록 점수가 올라가는 쪽으로 기울었다
 *    (제이블린 대표님 d2c 모름이 그 사례). 모름은 "확인해 봐야 안다"는 불확실만 담는다 —
 *    결과 화면도 모름을 "아직 확인 전"으로 읽는다(UnknownPickCard).
 */
export const UNKNOWN_OPTION_LABEL = "잘 모르겠어요 · 확인해 봐야 알아요";

export function isUnknown(value: number): boolean {
  return value === UNKNOWN_ANSWER;
}

export function nextUnknownStreak(prevStreak: number, value: number): number {
  return isUnknown(value) ? prevStreak + 1 : 0;
}

export function shouldFallback(streak: number): boolean {
  return streak >= UNKNOWN_FALLBACK_THRESHOLD;
}

export type FullAnswerNextStep = "advance" | "review" | "fallback";

export function getFullAnswerNextStep(
  variant: "A" | "B",
  fallback: boolean
): FullAnswerNextStep {
  if (fallback) return "fallback";
  return variant === "A" ? "review" : "advance";
}
