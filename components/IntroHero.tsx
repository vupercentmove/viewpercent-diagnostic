"use client";

import ModeSelect from "./ModeSelect";
import SocialProofBadge from "./SocialProofBadge";

interface IntroHeroProps {
  onStart: () => void;
  onStartFull?: () => void;
}

export default function IntroHero({ onStart, onStartFull }: IntroHeroProps) {
  return (
    <section className="bg-vp-navy text-white rounded-[14px] px-7 py-9 animate-fade-in-up">
      <p className="text-xs tracking-widest text-vp-blue-light font-medium mb-3 uppercase">
        vupercent move diagnostic
      </p>

      <h1 className="text-[26px] font-medium leading-[1.35] mb-3.5">
        광고비를 더 쓰기 전에,
        <br />
        고객이 어디서 돌아서는지부터.
      </h1>

      <p className="text-sm leading-relaxed text-white/70 mb-4">
        &ldquo;광고비를 늘렸는데 매출이 그만큼 따라오지 않는다&rdquo; — 이런
        경험이 쌓여있다면, 광고 문제가 아니라 고객 경험 쪽을 봐야 할 때입니다.
      </p>

      <p className="text-[13px] leading-relaxed text-white/55 mb-5 border-l-2 border-vp-blue-light/30 pl-3">
        방문한 고객에게 가장 좋은 구매 경험을 만들 준비, 지금 어디까지 돼
        있을까요? 6단계로 점검합니다.
      </p>

      <div className="mb-6 rounded-lg bg-white/[0.05] px-4 py-3.5">
        <p className="text-[12px] text-vp-blue-light font-medium mb-1.5">
          2분 뒤, 이걸 받게 돼요
        </p>
        <ul className="text-[12.5px] text-white/70 leading-relaxed space-y-1">
          <li>· 6단계 중 <strong className="text-white font-medium">매출이 새는 구간</strong></li>
          <li>· 업계 운영 기준 대비 <strong className="text-white font-medium">내 위치</strong></li>
          <li>· 지금 가장 먼저 손볼 <strong className="text-white font-medium">1순위 액션</strong></li>
        </ul>
      </div>

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

      <ModeSelect onQuick={onStart} onFull={onStartFull ?? onStart} />

      <p className="text-[11px] text-white/55 text-center mt-3">
        인증 없이 바로 시작 · 결과는 즉시 확인
      </p>
    </section>
  );
}
