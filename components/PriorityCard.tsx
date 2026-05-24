"use client";

import { STAGES } from "@/lib/stage-meta";

interface PriorityCardProps {
  worstStageId: number;
  worstScore: number;
}

export default function PriorityCard({
  worstStageId,
  worstScore,
}: PriorityCardProps) {
  const stage = STAGES.find((s) => s.id === worstStageId)!;

  return (
    <section className="bg-white border border-gray-100 rounded-[14px] p-6 mb-4 animate-fade-in-up">
      <p className="text-[11px] tracking-wide text-gray-400 uppercase font-medium mb-2.5">
        1순위 개선점 — 운영 원칙
      </p>

      <h3 className="text-base font-medium mb-1">
        {stage.label} {stage.name}
      </h3>

      <p className="text-[13px] text-gray-500 mb-4">
        핵심 질문: &ldquo;{stage.coreQuestion}&rdquo;
      </p>

      {/* 운영 원칙 카드 (Thinking 프레임 반영) */}
      <div className="bg-vp-navy/[0.03] border border-vp-navy/10 rounded-lg p-4 mb-4">
        <p className="text-[11px] text-vp-blue font-medium uppercase tracking-wide mb-1.5">
          운영 원칙
        </p>
        <p className="text-[15px] font-medium leading-relaxed text-gray-900 italic">
          &ldquo;{stage.principle}&rdquo;
        </p>
        <p className="text-[12.5px] text-gray-500 mt-2 leading-relaxed">
          이 원칙이 지금 브랜드에서 작동하고 있는지가 판단 기준이에요. 점수가
          아니라, 이 질문에 &lsquo;예&rsquo;라고 확신할 수 있는지.
        </p>
      </div>

      {/* 잠금 메시지 */}
      <div className="bg-gray-50 border border-dashed border-gray-200 rounded-lg p-4">
        <p className="text-[11px] tracking-wide text-gray-400 uppercase font-medium mb-1.5">
          해석은 여기서 멈춥니다
        </p>
        <p className="text-[13px] text-gray-500 leading-relaxed italic">
          왜 이 점수가 나왔는지, 무엇부터 바꿔야 하는지 — 같은 점수라도
          브랜드 성격에 따라 처방이 완전히 달라요. 그래서 해석은 함께 봐야
          정확합니다.
        </p>
      </div>
    </section>
  );
}
