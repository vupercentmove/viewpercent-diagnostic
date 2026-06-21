"use client";

import { useEffect, useRef } from "react";
import { getSampleSize } from "@/lib/benchmark";
import { getSocialProof } from "@/lib/social-proof";
import { trackSocialProofView } from "@/lib/analytics";

interface SocialProofBadgeProps {
  variant: "intro" | "result";
}

/**
 * 누적 진단수 사회적증거 배지.
 *
 * 표본수는 오직 getSampleSize()(단일 진실원천)에서만 읽고, 임계치 미만/null이면
 * 정성 카피로 폴백한다(조작값 미노출). 빌드/SSR 상수라 클라 fetch 없음 → layout shift 없음.
 */
export default function SocialProofBadge({ variant }: SocialProofBadgeProps) {
  const { displayCount, label, isQualitative } = getSocialProof(
    getSampleSize()
  );

  const tracked = useRef(false);
  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    trackSocialProofView(variant, isQualitative, displayCount);
  }, [variant, isQualitative, displayCount]);

  const isIntro = variant === "intro";

  // intro: 흐린 화이트(흰 강조). result: vp-blue 계열 강조 (둘 다 navy 히어로 위라 가독성 유지).
  const pillTone = isIntro
    ? "bg-white/5 border-white/10 text-white/70"
    : "bg-vp-blue/10 border-vp-blue-light/25 text-white/75";
  const strongTone = isIntro ? "text-white" : "text-vp-blue-light";
  // 점·아이콘 강조색은 두 variant 모두 vp-blue-light (navy 히어로 위 가독성).
  const dotTone = "bg-vp-blue-light";
  const iconTone = "text-vp-blue-light";

  const text = isQualitative ? (
    "이미 여러 여성의류 브랜드 대표가 자가 점검 중이에요"
  ) : (
    <>
      지금까지 <strong className={`font-semibold ${strongTone}`}>{label}</strong>{" "}
      대표가 진단했어요 · 평균 약 2분
    </>
  );

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11.5px] leading-snug ${pillTone}`}
    >
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        <span
          className={`absolute inline-flex h-full w-full rounded-full opacity-60 ${dotTone}`}
        />
        <span
          className={`relative inline-flex h-1.5 w-1.5 rounded-full ${dotTone}`}
        />
      </span>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={`h-3.5 w-3.5 shrink-0 ${iconTone}`}
      >
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
      <span>{text}</span>
    </div>
  );
}
