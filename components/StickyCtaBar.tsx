"use client";

import { useEffect, useState } from "react";
import { buildStickyCtaCopy } from "@/lib/sticky-cta-copy";
import {
  trackStickyCtaView,
  trackStickyCtaImpression,
  trackStickyCtaClick,
} from "@/lib/analytics";
import type { GapDiagnosis } from "@/lib/scoring";
import { KAKAO_URL } from "@/lib/constants";

interface StickyCtaBarProps {
  stageId: number;
  gap: GapDiagnosis | null;
}

/**
 * 진단을 읽기 전에는 CTA를 띄우지 않는다 (진단·영업 분리).
 * 결과 화면 첫 화면에서 바로 상담 버튼이 보이면, 대표는 진단 결과보다
 * "팔려고 하는구나"를 먼저 읽는다. 한 화면 넘게 내려본 뒤에 붙는다.
 */
const REVEAL_RATIO = 0.9;

export default function StickyCtaBar({ stageId, gap }: StickyCtaBarProps) {
  const copy = buildStickyCtaCopy(stageId, gap);
  const byGap = !!gap?.hasGap;
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (revealed) return;

    const check = () => {
      if (window.scrollY > window.innerHeight * REVEAL_RATIO) {
        setRevealed(true);
      }
    };

    check(); // 새로고침으로 스크롤 위치가 복원된 경우
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, [revealed]);

  // 결과 화면 진입수. 발사 시점을 옮기면 2026-06부터의 시계열이 끊긴다.
  useEffect(() => {
    trackStickyCtaView(stageId);
    // 마운트 1회만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // CTA가 실제로 보인 시점 1회만
  useEffect(() => {
    if (revealed) trackStickyCtaImpression(stageId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed]);

  if (!revealed) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-black/5 bg-white/85 backdrop-blur-md shadow-[0_-6px_20px_-8px_rgba(6,9,29,0.18)] pb-[env(safe-area-inset-bottom)]">
      <div className="w-full max-w-[430px] mx-auto px-4 pt-2.5 pb-3">
        <p className="text-[12.5px] text-vp-navy/80 leading-snug mb-2 text-center truncate">
          {copy.headline}
        </p>

        <a
          href={KAKAO_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackStickyCtaClick(stageId, byGap)}
          className="block w-full text-center bg-[#FEE500] text-[#191919] font-medium text-[14px] py-3 rounded-lg hover:bg-[#F5DC00] transition-colors"
        >
          {copy.button}
        </a>

        <p className="mt-1.5 text-[11px] text-gray-400 leading-snug text-center">
          {copy.subnote}
        </p>
      </div>
    </div>
  );
}
