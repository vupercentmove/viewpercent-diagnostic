"use client";

import { trackCTAClick } from "@/lib/analytics";

const KAKAO_URL = "http://pf.kakao.com/_xbunxen";

export default function CTACard() {
  return (
    <section className="bg-gradient-to-br from-vp-navy to-[#1a2050] rounded-[14px] px-7 py-8 text-white animate-fade-in-up">
      <h3 className="text-[19px] font-medium leading-[1.45] mb-2.5">
        이 결과에서 시작하면, 어디까지 갈 수 있는지 같이 그려볼까요?
      </h3>

      <p className="text-[13.5px] text-white/70 leading-relaxed mb-6">
        같은 점수라도 브랜드마다 처방이 달라요. 우리 브랜드가 어떤 모습으로
        움직여야 하는지, 진단 결과를 기반으로 같이 그려볼 수 있어요.
      </p>

      <a
        href={KAKAO_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={trackCTAClick}
        className="block w-full text-center bg-[#FEE500] text-[#191919] font-medium text-sm py-3 rounded-lg hover:bg-[#F5DC00] transition-colors"
      >
        카카오 채널로 결과 보내기
      </a>

      <div className="mt-4 bg-white/[0.06] rounded-lg p-3.5">
        <p className="text-[12.5px] text-white/65 leading-relaxed">
          <span className="text-white/90">💡</span> 결과 화면을 캡처해서 카카오
          채널로 보내주시면, 첫 답변에 단계별 1순위 진단을 드려요.
        </p>
      </div>
    </section>
  );
}
