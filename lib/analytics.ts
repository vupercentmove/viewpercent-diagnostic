/**
 * 퍼널 트래킹 이벤트
 *
 * Vercel Analytics 커스텀 이벤트로 진단 퍼널을 추적합니다.
 * Vercel 대시보드 > Analytics > Custom Events 에서 확인 가능.
 *
 * 퍼널 흐름:
 * diagnostic_start → quiz_answer (x10) → diagnostic_complete
 *   → [deep_diagnostic_start → deep_diagnostic_complete] → cta_kakao_click
 */

import { track } from "@vercel/analytics";

/** 진단 시작 버튼 클릭 */
export function trackDiagnosticStart() {
  track("diagnostic_start");
}

/** 개별 문항 응답 (step 위치 포함 — 문항별 이탈 퍼널 분석용) */
export function trackQuizAnswer(
  questionId: string,
  stageId: number,
  opts?: { stepIndex?: number; totalSteps?: number; context?: "quick" | "deep" }
) {
  track("quiz_answer", {
    questionId,
    stageId,
    step: `${stageId}_${questionId}`,
    stepIndex: opts?.stepIndex ?? -1,
    totalSteps: opts?.totalSteps ?? -1,
    context: opts?.context ?? "quick",
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

/** 심화 진단 시작 (최약 Stage 진입) */
export function trackDeepDiagnosticStart(stageId: number) {
  track("deep_diagnostic_start", { stageId });
}

/** 심화 진단 완료 */
export function trackDeepDiagnosticComplete(stageId: number) {
  track("deep_diagnostic_complete", { stageId });
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
export function trackEncouragement(context: "quiz" | "deep" | "full") {
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

/** 결과 공유 카드 열기 (버튼 클릭) */
export function trackShareCardOpen() {
  track("share_card_open");
}

/** 결과 공유 카드 이미지 기기 저장 */
export function trackShareCardSave() {
  track("share_card_save");
}

/** 결과 공유 카드 Web Share API 공유 */
export function trackShareCardShare() {
  track("share_card_share");
}

/** 결과 공유 링크(URL) 복사 */
export function trackShareUrlCopy(context: "result" | "cta") {
  track("share_url_copy", { context });
}

/** 공유 링크로 진입한 수신자(친구 결과 → 내 진단 유도) */
export function trackShareReferralStart() {
  track("share_referral_start");
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

/** 진단 모드 선택 (빠른 진단 vs. 정밀 진단) */
export function trackModeSelect(mode: "quick" | "full") {
  track("mode_select", { mode });
}

/** 정밀 진단 시작 (풀 모드 진입) */
export function trackFullDeepStart(variant?: "A" | "B") {
  track("full_deep_start", variant ? { variant } : {});
}

/** 정밀 진단 Stage 완료 */
export function trackFullDeepStageComplete(stageId: number) {
  track("full_deep_stage_complete", { stageId });
}

/** 정밀 진단 중 미분류 질문 폴백 처리 */
export function trackFullDeepUnknownFallback(stageId: number) {
  track("full_deep_unknown_fallback", { stageId });
}

/** 정밀 진단 비전 응답 */
export function trackVisionAnswer() {
  track("vision_answer");
}

/** 정밀 진단 문항 인사이트 토글 */
export function trackQuestionInsightToggle(questionId: string, variant?: "A" | "B") {
  track("question_insight_toggle", {
    questionId,
    variant: variant ?? "A",
  });
}

/** 정밀 진단 완료 */
export function trackFullDeepComplete(variant?: "A" | "B") {
  track("full_deep_complete", variant ? { variant } : {});
}

/** 정밀 진단 CTA 클릭 */
export function trackFullCtaClick(variant?: "A" | "B") {
  track("full_cta_click", variant ? { variant } : {});
}
