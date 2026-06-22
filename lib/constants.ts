/**
 * 전역 상수 단일 출처
 *
 * 카카오 채널 URL이 여러 컴포넌트에 하드코딩돼 있던 것을 한 곳으로 모은다.
 * http → https (모바일 보안경고·혼합콘텐츠·리다이렉트 끊김 방지).
 */

/** 카카오 채널 상담 URL (https 고정) */
export const KAKAO_URL = "https://pf.kakao.com/_xbunxen";

/**
 * 결과 링크(ref)를 붙인 카카오 채널 URL.
 * 채널 측이 ref를 활용하지 못해도 무해하며, 활용 가능 시 상담사가 결과를 미리 본다.
 */
export function buildKakaoUrl(ref?: string): string {
  if (!ref) return KAKAO_URL;
  const sep = KAKAO_URL.includes("?") ? "&" : "?";
  return `${KAKAO_URL}${sep}ref=${encodeURIComponent(ref)}`;
}

/**
 * 서버 사이드 절대 URL 베이스 (OG 이미지·공유 메타용).
 * 우선순위: 명시 환경변수 → Vercel 배포 URL → 로컬.
 * window가 없는 서버 컴포넌트/라우트 핸들러에서만 사용.
 */
export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

/** OG 이미지 캐시 강제 갱신용 버전 (카카오/슬랙 스크랩 캐시 무효화 시 증가) */
export const OG_VERSION = "1";
