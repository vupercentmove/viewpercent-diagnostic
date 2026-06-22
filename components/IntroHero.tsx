"use client";

import { trackDiagnosticStart } from "@/lib/analytics";
import SocialProofBadge from "./SocialProofBadge";

interface IntroHeroProps {
  onStart: () => void;
}

export default function IntroHero({ onStart }: IntroHeroProps) {
  const handleStart = () => {
    trackDiagnosticStart();
    onStart();
  };
  return (
    <section className="bg-vp-navy text-white rounded-[14px] px-7 py-9 animate-fade-in-up">
      <p className="text-xs tracking-widest text-vp-blue-light font-medium mb-3 uppercase">
        viewpercent move diagnostic
      </p>

      <h1 className="text-[26px] font-medium leading-[1.35] mb-3.5">
        광고비를 더 쓰기 전에,
        <br />
        매출이 어디서 새고 있는지부터.
      </h1>

      <p className="text-sm leading-relaxed text-white/70 mb-4">
        &ldquo;광고비를 늘렸는데 매출이 그만큼 따라오지 않는다&rdquo; — 이
        감각이 익숙하다면, 새는 곳은 광고가 아니라 고객이 지나가는 길목일 수
        있어요.
      </p>

      <p className="text-[13px] leading-relaxed text-white/55 mb-6 border-l-2 border-vp-blue-light/30 pl-3">
        쇼핑은 고객이 가장 까다로워지는 순간이에요. 그 까다로움에 우리
        브랜드가 얼마나 준비돼 있는지, 6단계로 점검합니다.
      </p>

      <div className="flex gap-4 flex-wrap mb-7">
        <div className="text-xs text-white/55">
          <strong className="block text-white font-medium text-lg mb-0.5">
            10
          </strong>
          문항
        </div>
        <div className="text-xs text-white/55">
          <strong className="block text-white font-medium text-lg mb-0.5">
            약 2분
          </strong>
          소요
        </div>
        <div className="text-xs text-white/55">
          <strong className="block text-white font-medium text-lg mb-0.5">
            6
          </strong>
          단계 진단
        </div>
      </div>

      <div className="mb-5">
        <SocialProofBadge variant="intro" />
      </div>

      <button
        onClick={handleStart}
        className="w-full bg-vp-blue hover:bg-vp-blue-hover text-white font-medium text-sm py-3 rounded-lg transition-colors"
      >
        빠른 진단 시작하기
      </button>

      <p className="text-[11px] text-white/40 text-center mt-3">
        인증 없이 바로 시작 · 결과는 즉시 확인
      </p>
    </section>
  );
}
