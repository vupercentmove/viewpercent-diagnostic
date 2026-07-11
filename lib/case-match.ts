/** 진단 결과 → 최적 사례 1개 매칭 (순수 함수) */

import { CASES, type CaseStudy } from "./cases";
import type { GapDiagnosis } from "./scoring";

/** 문자열 → 음이 아닌 정수 해시. seedInput 기반 동률 결정에 사용(순수 함수, Math.random 미사용) */
function hashSeed(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * priority 내림차순, 동률이면:
 * - seedInput 없음 → 입력 배열 순서 유지(첫 번째, 결정적)
 * - seedInput 있음 → seedInput 해시로 동률 후보 중 하나를 결정적으로 선택
 *   (SSR/클라이언트 동일 입력이면 항상 같은 결과 → hydration mismatch 없음)
 */
function pickTop(candidates: CaseStudy[], seedInput?: string): CaseStudy | null {
  if (candidates.length === 0) return null;
  const maxPriority = Math.max(...candidates.map((c) => c.priority ?? 0));
  const tied = candidates.filter((c) => (c.priority ?? 0) === maxPriority);
  if (tied.length === 1 || !seedInput) return tied[0];
  return tied[hashSeed(seedInput) % tied.length];
}

/**
 * 매칭 우선순위:
 * 1. 빈틈 정확 일치 (gapPattern === "{perceived}->{actual}")
 * 2. 빈틈의 실제 원인 Stage 일치
 * 3. 빈틈 없으면 최약 Stage 일치
 * 4. 무매칭 → null
 *
 * @param seedInput (선택) 동률 사례가 여러 건일 때 결정적으로 하나를 고르기 위한 시드
 *   (예: 응답 데이터 직렬화 문자열). 응답이 같으면 항상 같은 사례가 나온다.
 */
export function matchCase(
  gap: GapDiagnosis | null,
  worstStage: { stageId: number },
  cases: CaseStudy[] = CASES,
  seedInput?: string
): CaseStudy | null {
  if (gap?.hasGap) {
    const pattern = `${gap.perceivedWorst}->${gap.actualWorst}`;
    const exact = pickTop(
      cases.filter((c) => c.gapPattern === pattern),
      seedInput
    );
    if (exact) return exact;

    const byActual = pickTop(
      cases.filter((c) => c.stageId === gap.actualWorst),
      seedInput
    );
    if (byActual) return byActual;
  }

  return pickTop(
    cases.filter((c) => c.stageId === worstStage.stageId),
    seedInput
  );
}

/** 매칭이 빈틈 패턴으로 이뤄졌는지 (UI 배지 분기용) */
export function isGapMatch(
  gap: GapDiagnosis | null,
  matched: CaseStudy | null
): boolean {
  if (!gap?.hasGap || !matched?.gapPattern) return false;
  return matched.gapPattern === `${gap.perceivedWorst}->${gap.actualWorst}`;
}
