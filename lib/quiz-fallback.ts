export const UNKNOWN_ANSWER = -1;
export const UNKNOWN_FALLBACK_THRESHOLD = 2;

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
