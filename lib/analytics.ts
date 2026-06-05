/**
 * 퍼널 트래킹 이벤트
 *
 * Vercel Analytics 커스텀 이벤트로 진단 퍼널을 추적합니다.
 * Vercel 대시보드 > Analytics > Custom Events 에서 확인 가능.
 *
 * 퍼널 흐름:
 * diagnostic_start → quiz_answer (x10) → diagnostic_complete → cta_kakao_click
 */

import { track } from "@vercel/analytics";

/** 진단 시작 버튼 클릭 */
export function trackDiagnosticStart() {
  track("diagnostic_start");
}

/** 개별 문항 응답 */
export function trackQuizAnswer(questionId: string, stageId: number) {
  track("quiz_answer", {
    questionId,
    stageId,
    step: `${stageId}_${questionId}`,
  });
}

/** 진단 완료 (10문항 모두 응답) */
export function trackDiagnosticComplete(data: {
  overallScore: number;
  worstStageId: number;
  worstScore: number;
  hasGap: boolean;
}) {
  track("diagnostic_complete", {
    overallScore: data.overallScore,
    worstStage: data.worstStageId,
    worstScore: data.worstScore,
    hasGap: data.hasGap ? "yes" : "no",
  });
}

/** 카카오톡 CTA 클릭 */
export function trackCTAClick() {
  track("cta_kakao_click");
}

/** 다시 진단하기 클릭 */
export function trackRestart() {
  track("diagnostic_restart");
}

/** 특정 Stage 결과 카드 확인 (스크롤 도달) */
export function trackResultView(section: string) {
  track("result_view", { section });
}
