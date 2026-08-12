/**
 * AI 코멘트 폴백 판정.
 *
 * 배경: cleanComment()가 빈 문자열을 반환하면 정적 폴백 문구가 조용히 나가는데,
 * 그 사실이 응답에 남지 않아 폴백률을 셀 수 없었다. 판정을 여기로 모아
 * 응답에 fallback·reason을 싣는다.
 */
import { cleanComment } from "@/lib/clean-comment";
import { findUngroundedMetrics } from "@/lib/numeric-guard";

/** AI 코멘트를 요청한 진단 모드 */
export type AiCommentMode = "quick" | "full";

/** 정적 폴백이 나가거나 코멘트가 아예 없을 때의 이유 */
export type AiFallbackReason =
  | "no_key" // ANTHROPIC_API_KEY 미설정
  | "api_error" // Claude API 호출 예외
  | "empty_after_clean" // AI는 응답했으나 정리 후 빈 문자열
  | "ungrounded_number" // 진단에 없는 성과 수치를 지어냄
  | "network"; // 클라이언트 fetch 자체 실패

/** /api/analyze 응답 본문 */
export interface AiCommentPayload {
  comment: string;
  fallback?: true;
  reason?: AiFallbackReason;
}

/**
 * 응답 본문을 만든다. rawText를 정리해 내용이 남고 근거 없는 성과 수치도 없으면
 * 그대로, 아니면 fallbackText + 폴백 표시.
 *
 * allowedNumbers에는 진단이 제공한 값(단계 점수·종합 점수)을 넣는다.
 */
export function resolveComment(
  rawText: string,
  fallbackText: string,
  allowedNumbers: number[] = []
): AiCommentPayload {
  const cleaned = cleanComment(rawText);
  if (!cleaned) return { comment: fallbackText, fallback: true, reason: "empty_after_clean" };
  if (findUngroundedMetrics(cleaned, allowedNumbers).length > 0) {
    return { comment: fallbackText, fallback: true, reason: "ungrounded_number" };
  }
  return { comment: cleaned };
}

/** full 모드용 별칭 — 기존 호출부 호환 유지 */
export function resolveFullComment(
  rawText: string,
  fallbackText: string,
  allowedNumbers: number[] = []
): AiCommentPayload {
  return resolveComment(rawText, fallbackText, allowedNumbers);
}
