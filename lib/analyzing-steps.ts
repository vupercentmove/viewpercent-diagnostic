/**
 * 분석중 인터스티셜 단계 문구 (순수 로직)
 *
 * 컴포넌트(JSX)와 분리해 테스트 가능하도록 별도 모듈로 둔다.
 * 실제 산출값(hasGap/hasCase) 기반의 정직한 3단계 문구만 노출한다.
 * 가짜 수치·진행%·가짜 카운터는 절대 쓰지 않는다.
 */

/** 각 단계 표시 시간(ms). 합 1.8s. 조정 가능하도록 상수로 분리. */
export const STEP_MS = [600, 600, 600];

/** reduced-motion일 때 단일 페이드 시간(ms) */
export const REDUCED_MOTION_MS = 300;

/**
 * 분석 단계 문구를 만든다 (항상 3단계).
 * 실제 산출값에 근거한 정직한 문구만 사용.
 */
export function buildSteps(hasGap: boolean, hasCase: boolean): string[] {
  return [
    "진단 결과를 분석하고 있어요",
    hasGap
      ? "자기인식과 데이터의 빈틈을 살펴보는 중"
      : "빈틈 없이 일관된 응답인지 확인하는 중",
    hasCase ? "비슷한 브랜드 사례를 찾는 중" : "맞춤 개선 우선순위를 정리하는 중",
  ];
}
