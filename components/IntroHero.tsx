"use client";

import ModeSelect from "./ModeSelect";
import SocialProofBadge from "./SocialProofBadge";
import StageJourneyStrip from "./StageJourneyStrip";

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
        AI와 광고를 더 쓰기 전에,
        <br />
        고객 흐름을 먼저 봅니다.
      </h1>

      <p className="text-sm leading-relaxed text-white/70 mb-4">
        여성의류 자사몰의 방문부터 수령 후 관계까지. 후기·문의·주문 기록에서 확인한 경험으로, 고객이 어디서 돌아서는지 살펴봐요.
      </p>

      <p className="text-[13px] leading-relaxed text-white/55 mb-5 border-l-2 border-vp-blue-light/30 pl-3">
        고객에게 무엇을 더 제안할지 정하기 전에, 편하게 고르고 기다릴 준비가 되어 있는지 6단계로 확인합니다.
      </p>

      <StageJourneyStrip />

      <div className="mb-5 grid grid-cols-3 gap-2" aria-label="워크북 사용법">
        {[
          ["01", "개념을 읽고"],
          ["02", "바로 답하고"],
          ["03", "실행을 정해요"],
        ].map(([number, label]) => (
          <div key={number} className="rounded-lg border border-white/10 px-2 py-3 text-center">
            <span className="block text-[10px] text-vp-blue-light">{number}</span>
            <span className="mt-1 block text-[11px] leading-tight text-white/65">{label}</span>
          </div>
        ))}
      </div>

      <div className="mb-6 rounded-lg bg-white/[0.05] px-4 py-3.5">
        <p className="text-[12px] text-vp-blue-light font-medium mb-1.5">
          답변을 마치면, 이렇게 정리돼요
        </p>
        <ul className="text-[12.5px] text-white/70 leading-relaxed space-y-1">
          <li>· 6단계 중 <strong className="text-white font-medium">답변에 근거한 확인 순서</strong></li>
          <li>· <strong className="text-white font-medium">AI가 도울 일과 대표의 판단</strong></li>
          <li>· 지금 가장 먼저 손볼 <strong className="text-white font-medium">실행과 다음 확인 기준</strong></li>
        </ul>
      </div>

      <div className="flex gap-4 flex-wrap mb-7">
        <div className="text-xs text-white/55">
          <strong className="block text-white font-medium text-lg mb-0.5">
            6
          </strong>
          챕터
        </div>
        <div className="text-xs text-white/55">
          <strong className="block text-white font-medium text-lg mb-0.5">
            약 10분
          </strong>
          소요
        </div>
        <div className="text-xs text-white/55">
          <strong className="block text-white font-medium text-lg mb-0.5">
            27
          </strong>
          핵심 질문
        </div>
      </div>

      <div className="mb-5">
        <SocialProofBadge variant="intro" />
      </div>

      <ModeSelect onQuick={onStart} onFull={onStartFull ?? onStart} />
    </section>
  );
}
