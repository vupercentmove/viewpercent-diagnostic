/** 진단 결과 → 최적 사례 1개 매칭 (순수 함수) */

import { CASES, type CaseStudy } from "./cases";
import type { GapDiagnosis } from "./scoring";

/** priority 내림차순, 동률이면 입력 배열 순서 유지(결정적) */
function pickTop(candidates: CaseStudy[]): CaseStudy | null {
  if (candidates.length === 0) return null;
  return candidates.reduce((best, c) =>
    (c.priority ?? 0) > (best.priority ?? 0) ? c : best
  );
}

/**
 * 매칭 우선순위:
 * 1. 빈틈 정확 일치 (gapPattern === "{perceived}->{actual}")
 * 2. 빈틈의 실제 원인 Stage 일치
 * 3. 빈틈 없으면 최약 Stage 일치
 * 4. 무매칭 → null
 */
export function matchCase(
  gap: GapDiagnosis | null,
  worstStage: { stageId: number },
  cases: CaseStudy[] = CASES
): CaseStudy | null {
  if (gap?.hasGap) {
    const pattern = `${gap.perceivedWorst}->${gap.actualWorst}`;
    const exact = pickTop(cases.filter((c) => c.gapPattern === pattern));
    if (exact) return exact;

    const byActual = pickTop(cases.filter((c) => c.stageId === gap.actualWorst));
    if (byActual) return byActual;
  }

  return pickTop(cases.filter((c) => c.stageId === worstStage.stageId));
}

/** 매칭이 빈틈 패턴으로 이뤄졌는지 (UI 배지 분기용) */
export function isGapMatch(
  gap: GapDiagnosis | null,
  matched: CaseStudy | null
): boolean {
  if (!gap?.hasGap || !matched?.gapPattern) return false;
  return matched.gapPattern === `${gap.perceivedWorst}->${gap.actualWorst}`;
}
