/**
 * 누적 진단수 사회적증거 — 실측 게이트
 *
 * 표시광고법(표시·광고의 공정화에 관한 법률) 위반 방지가 최우선.
 * - N은 오직 benchmark.ts의 SAMPLE_SIZE(단일 진실원천)에서만 유입된다.
 * - 표본이 임계치(SOCIAL_PROOF_MIN_N) 미만이거나 null이면 수치를 숨기고
 *   정성 카피로 폴백한다 (조작값 절대 금지).
 * - 표기는 보수적 내림(floor 10단위)으로, 실제 표본수를 절대 초과하지 않는다.
 */

/** 사회적증거 수치를 노출할 최소 표본수. 미만이면 정성 폴백. */
export const SOCIAL_PROOF_MIN_N = 80;

export interface SocialProof {
  /** 배지 자체를 렌더할지 (정성 폴백도 노출하므로 항상 true) */
  show: boolean;
  /** 보수적으로 내림한 노출용 수치 (정성 폴백이면 null) */
  displayCount: number | null;
  /** 노출용 라벨 (예: "120명+"). 정성 폴백이면 빈 문자열 */
  label: string;
  /** 정성 폴백 여부 (수치 미노출 모드) */
  isQualitative: boolean;
}

export function getSocialProof(sampleSize: number | null): SocialProof {
  if (sampleSize === null || sampleSize < SOCIAL_PROOF_MIN_N) {
    return { show: true, displayCount: null, label: "", isQualitative: true };
  }

  // 보수적 내림 — 10단위로 내려 실제 표본수를 절대 초과하지 않게.
  const displayCount = Math.floor(sampleSize / 10) * 10;
  return {
    show: true,
    displayCount,
    label: `${displayCount.toLocaleString()}명+`,
    isQualitative: false,
  };
}
