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
import type { AiCommentMode } from "@/lib/ai-fallback";

/** 진단 시작 버튼 클릭 */
export function trackDiagnosticStart() {
  track("diagnostic_start");
}

/**
 * 개별 문항 응답 (step 위치 포함 — 문항별 이탈 퍼널 분석용)
 * context: "quick"=기본 10문항 / "deep"=빠른진단 심화(4~5문항) / "full"=정밀진단 27문항.
 * deep과 full은 문항 id(d1a~d6e)를 공유하므로 context 없이는 퍼널 구분이 안 된다.
 */
export function trackQuizAnswer(
  questionId: string,
  stageId: number,
  opts?: { stepIndex?: number; totalSteps?: number; context?: "quick" | "deep" | "full" }
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

/** 카카오톡 CTA 클릭 — 어떤 결과가 상담으로 이어지는지 보려면 결과 컨텍스트가 필요하다 */
export function trackCTAClick(data?: {
  overallScore: number;
  worstStageId: number;
  worstScore: number;
}) {
  if (!data) {
    track("cta_kakao_click");
    return;
  }
  track("cta_kakao_click", {
    overallScore: data.overallScore,
    worstStage: data.worstStageId,
    worstScore: data.worstScore,
  });
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

/**
 * 결과 화면 진입 (1회).
 *
 * 이름은 sticky_cta_view지만 실제 의미는 "결과 화면에 도달한 세션 수"다.
 * StickyCtaBar 마운트 시점에 발사되며, 2026-06 이후 시계열이 이 정의로
 * 쌓여 있다. **이름을 바꾸거나 발사 시점을 옮기면 과거와 비교가 끊긴다.**
 * 실제로 CTA가 눈에 보인 시점은 trackStickyCtaImpression을 쓴다.
 */
export function trackStickyCtaView(stageId: number) {
  track("sticky_cta_view", { stageId });
}

/**
 * 하단 sticky 카톡 CTA가 실제로 화면에 노출된 시점 (1회).
 *
 * 결과 화면을 한 화면 넘게 내려본 세션만 잡힌다 (진단·영업 분리).
 * sticky_cta_click / sticky_cta_view 대비로 보면
 * "결과를 읽은 비율"과 "읽고 나서 누른 비율"이 분리된다.
 */
export function trackStickyCtaImpression(stageId: number) {
  track("sticky_cta_impression", { stageId });
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

/**
 * 정밀 진단 문항 인사이트 토글.
 * action을 실어 보내므로 "열어본 수"는 action=open만 세면 된다 (열기/접기 합산 금지).
 */
export function trackQuestionInsightToggle(
  questionId: string,
  variant: "A" | "B" | undefined,
  action: "open" | "close"
) {
  track("question_insight_toggle", {
    questionId,
    variant: variant ?? "A",
    action,
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

/**
 * AI 코멘트 호출 시도 — 폴백률·실패율의 분모.
 * 기존 완료 이벤트는 분모로 못 쓴다(diagnostic_complete에 mode가 없고,
 * full 모드엔 호출을 건너뛰는 분기가, quick엔 옵트인 버튼이 있다).
 */
export function trackAiCommentRequested(mode: AiCommentMode) {
  track("ai_comment_requested", { mode });
}

/** AI 코멘트가 정적 폴백 문구로 대체됨 (코멘트는 보이지만 AI가 쓴 게 아님) */
export function trackAiCommentFallback(mode: AiCommentMode, reason: string) {
  track("ai_comment_fallback", { mode, reason });
}

/** AI 코멘트 호출 실패 — 코멘트가 아예 안 나감 */
export function trackAiCommentError(mode: AiCommentMode, reason: string) {
  track("ai_comment_error", { mode, reason });
}
