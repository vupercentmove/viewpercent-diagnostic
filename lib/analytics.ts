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

/** 매칭된 사례 노출 */
export function trackCaseView(
  caseId: string,
  stageId: number,
  matchedByGap: boolean
) {
  track("case_view", {
    caseId,
    stageId,
    matchedByGap: matchedByGap ? "yes" : "no",
  });
}

/** 사례 카드 내 카카오 CTA 클릭 */
export function trackCaseCtaClick(caseId: string) {
  track("case_cta_click", { caseId });
}

/** 진행 중 50% 격려 배너 노출 (1회) */
export function trackEncouragement(context: "quiz" | "deep") {
  track("progress_encouragement", { context });
}

/** 정체성 결과 라벨 노출 */
export function trackLabelView(
  labelId: string,
  stageId: number,
  matchedByGap: boolean
) {
  track("label_view", {
    labelId,
    stageId,
    matchedByGap: matchedByGap ? "yes" : "no",
  });
}

/** 개인화 되비춤(echo) 인용 노출 */
export function trackEchoView(
  section: "gap" | "priority",
  stageId: number,
  questionId: string
) {
  track("echo_view", { section, stageId, questionId });
}

/** 분석중 인터스티셜 노출 (1회) */
export function trackAnalyzingShown(
  worstStageId: number,
  hasGap: boolean,
  hasCase: boolean
) {
  track("analyzing_shown", {
    worstStage: worstStageId,
    hasGap: hasGap ? "yes" : "no",
    hasCase: hasCase ? "yes" : "no",
  });
}

/** 분석중 인터스티셜 스킵 (모션 최소화 / 백그라운드 탭) */
export function trackAnalyzingSkipped(reason: "reduced_motion" | "tab_hidden") {
  track("analyzing_skipped", { reason });
}

/** 하단 sticky 카톡 CTA 노출 (1회) */
export function trackStickyCtaView(stageId: number) {
  track("sticky_cta_view", { stageId });
}

/** 하단 sticky 카톡 CTA 클릭 */
export function trackStickyCtaClick(stageId: number, byGap: boolean) {
  track("sticky_cta_click", { stageId, byGap: byGap ? "yes" : "no" });
}

/** 누적 진단수 사회적증거 배지 노출 (1회) */
export function trackSocialProofView(
  variant: "intro" | "result",
  isQualitative: boolean,
  count: number | null
) {
  track("social_proof_view", {
    variant,
    isQualitative: isQualitative ? "yes" : "no",
    count: count ?? 0,
  });
}
