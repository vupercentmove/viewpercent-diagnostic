"use client";

import { useEffect, useState } from "react";
import { trackCTAClick, trackShareUrlCopy } from "@/lib/analytics";
import { KAKAO_URL, buildKakaoUrl } from "@/lib/constants";
import { buildShareUrl } from "@/lib/url-state";
import { reportCtaClick } from "@/lib/feedback-client";
import {
  calcAllStageScores,
  calcOverallScore,
  getWorstStage,
  type Answers,
} from "@/lib/scoring";

interface CTACardProps {
  answers: Answers;
  bridge?: string;
  /** 저장 API가 발급한 결과 행 핸들. 있으면 클릭을 그 행에 표시한다(cta_clicked). */
  resultCode?: string | null;
}

export default function CTACard({ answers, resultCode = null, bridge }: CTACardProps) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  // SSR에서는 buildShareUrl이 상대경로를 반환해 hydration mismatch가 나므로,
  // ref가 붙은 카카오 URL은 클라이언트 마운트 후에만 구성한다(서버는 기본 URL).
  const [kakaoHref, setKakaoHref] = useState(KAKAO_URL);

  useEffect(() => {
    setKakaoHref(buildKakaoUrl(buildShareUrl(answers)));
  }, [answers]);

  function legacyCopy(text: string): boolean {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }

  async function handleCopy() {
    const url = buildShareUrl(answers);
    setCopyFailed(false);
    const succeed = () => {
      trackShareUrlCopy("cta");
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    };
    try {
      await navigator.clipboard.writeText(url);
      succeed();
    } catch {
      if (legacyCopy(url)) succeed();
      else setCopyFailed(true);
    }
  }

  return (
    <section className="bg-gradient-to-br from-vp-navy to-[#1a2050] rounded-[14px] px-7 py-8 text-white animate-fade-in-up">
      <h3 className="text-[19px] font-medium leading-[1.45] mb-2.5">
        먼저 확인할 일부터 함께 정해볼까요?
      </h3>

      <p className="text-[13.5px] text-white/70 leading-relaxed mb-6">
        {bridge ?? "진단 결과와 고객 행동 근거를 함께 보고, 이번에 실행할 마케팅의 순서를 정해요."}
      </p>

      <a
        href={kakaoHref}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => {
          const worst = getWorstStage(calcAllStageScores(answers));
          trackCTAClick({
            overallScore: calcOverallScore(answers),
            worstStageId: worst.stageId,
            worstScore: worst.score,
          });
          if (resultCode) reportCtaClick(resultCode);
        }}
        className="block w-full text-center bg-[#FEE500] text-[#191919] font-medium text-sm py-3.5 rounded-lg hover:bg-[#F5DC00] transition-colors"
      >
        카카오톡으로 마케팅 문의 →
      </a>

      <button
        onClick={handleCopy}
        className="block w-full text-center text-white/70 hover:text-white text-[12.5px] py-3.5 mt-2 transition-colors"
      >
        <span role="status" aria-live="polite" aria-atomic="true">
          {copied
            ? "✓ 결과 링크가 복사됐어요 — 채널 대화에 붙여넣으면 카드가 보여요"
            : copyFailed
            ? "복사가 안 됐어요 — 주소창의 링크를 직접 복사해주세요"
            : "결과 링크 복사하기"}
        </span>
      </button>

      <p className="text-[11px] text-white/55 text-center mt-1">
        카카오톡 채널에서 1:1로 · 인증 없이 바로
      </p>
    </section>
  );
}
