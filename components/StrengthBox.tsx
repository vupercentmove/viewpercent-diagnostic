"use client";

import { getStrengthStages } from "@/lib/strength-stages";
import { getTag } from "@/lib/scoring";

interface StrengthBoxProps {
  stageScores: { stageId: number; score: number }[];
  worstStageId: number;
}

export default function StrengthBox({ stageScores, worstStageId }: StrengthBoxProps) {
  const strengths = getStrengthStages(stageScores, worstStageId);

  if (strengths.length === 0) return null;

  return (
    <div className="bg-[#E1F5EE] border border-[#0F6E56]/20 rounded-[14px] p-5 mb-4 animate-fade-in-up">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[18px]">✅</span>
        <h3 className="text-[13.5px] font-semibold text-[#0F6E56]">
          잘하고 있는 부분도 있어요
        </h3>
      </div>
      <div className="flex flex-col gap-2.5">
        {strengths.map((s) => (
          <div key={s.stageId} className="flex items-start gap-3">
            <div className="shrink-0 mt-0.5">
              <span className="inline-block text-[11px] font-semibold text-[#0F6E56] bg-[#0F6E56]/10 rounded-full px-2 py-0.5">
                S{s.stageId}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-[13px] font-medium text-gray-800">
                  {s.name}
                </span>
                <span className="text-[12px] font-semibold text-[#0F6E56]">
                  {s.score}점
                </span>
              </div>
              <p className="text-[12px] text-gray-500 leading-relaxed mt-0.5">
                {s.message}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
