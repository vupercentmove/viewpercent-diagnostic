"use client";

import { STAGES } from "@/lib/stage-meta";

interface EmpathyQuotesProps {
  worstStageId: number;
}

export default function EmpathyQuotes({ worstStageId }: EmpathyQuotesProps) {
  const stage = STAGES.find((s) => s.id === worstStageId);
  if (!stage || stage.empathyQuotes.length === 0) return null;

  return (
    <section className="bg-white border border-gray-100 rounded-[14px] p-6 mb-4 animate-fade-in-up">
      <h3 className="text-[15px] font-medium mb-1">
        같은 고민을 하는 대표님들
      </h3>
      <p className="text-xs text-gray-400 mb-4">
        패션 이커머스 단톡방에서 발견한 실제 목소리
      </p>
      <div className="flex flex-col gap-2.5">
        {stage.empathyQuotes.map((quote, i) => (
          <blockquote
            key={i}
            className="pl-3.5 py-3 pr-3.5 bg-gray-50 border-l-2 border-vp-blue-light rounded-r-md text-[13px] leading-relaxed text-gray-700"
          >
            {quote}
          </blockquote>
        ))}
      </div>
    </section>
  );
}
