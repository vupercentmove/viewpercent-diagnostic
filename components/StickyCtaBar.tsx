"use client";

import { useEffect } from "react";
import { buildStickyCtaCopy } from "@/lib/sticky-cta-copy";
import { trackStickyCtaView, trackStickyCtaClick } from "@/lib/analytics";
import type { GapDiagnosis } from "@/lib/scoring";
import { KAKAO_URL } from "@/lib/constants";

interface StickyCtaBarProps {
  stageId: number;
  gap: GapDiagnosis | null;
}

export default function StickyCtaBar({ stageId, gap }: StickyCtaBarProps) {
  const copy = buildStickyCtaCopy(stageId, gap);
  const byGap = !!gap?.hasGap;

  useEffect(() => {
    trackStickyCtaView(stageId);
    // 마운트 1회만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
