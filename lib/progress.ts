/** 성취형 진행바 — 순수 함수 */

/** 진행률(%) — total<=0이면 0 */
export function progressPercent(answered: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((answered / total) * 100);
}

/**
 * 직전엔 절반 미만(<50%)이었다가 이번에 절반 이상(>=50%)이 됐는가.
 * 되돌아감/이미 절반 넘은 경우는 false → 격려 1회 노출용.
 */
export function hasCrossedHalf(
  prevAnswered: number,
  currAnswered: number,
  total: number
): boolean {
  if (total <= 0) return false;
  const prevBelow = prevAnswered / total < 0.5;
  const currAtOrAbove = currAnswered / total >= 0.5;
  return prevBelow && currAtOrAbove;
}

/** 진행 구간별 성취 라벨 (담백) */
export function achievementLabel(answered: number, total: number): string {
  if (answered <= 0) return "시작해볼게요";
  if (total > 0 && answered / total >= 0.5) return "거의 다 왔어요";
  return "차곡차곡 쌓이는 중";
}
