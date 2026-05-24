"use client";

import type { GapDiagnosis } from "@/lib/scoring";
import { STAGES } from "@/lib/stage-meta";

interface GapDiagnosisCardProps {
  gap: GapDiagnosis;
}

export default function GapDiagnosisCard({ gap }: GapDiagnosisCardProps) {
  const actualStage = STAGES.find((s) => s.id === gap.actualWorst);

  return (
    <section className="bg-white border-2 border-vp-blue/20 rounded-[14px] p-6 mb-4 animate-fade-in-up">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full bg-vp-blue animate-pulse" />
        <p className="text-[11px] tracking-wide text-vp-blue font-medium uppercase">
          빈틈 진단
        </p>
      </div>

      <p className="text-[15px] font-medium leading-relaxed text-gray-900 mb-3">
        {gap.message}
      </p>

      {actualStage && (
        <div className="bg-vp-blue/[0.04] rounded-lg p-3.5">
          <p className="text-[12px] text-vp-blue font-medium mb-1">
            {actualStage.label} {actualStage.name}
          </p>
          <p className="text-[13px] text-gray-600 leading-relaxed italic">
            &ldquo;{actualStage.principle}&rdquo;
          </p>
        </div>
      )}

      <p className="text-[12px] text-gray-400 mt-3 leading-relaxed">
        내가 느끼는 문제와 데이터가 보여주는 문제가 다를 때, 진짜 원인이 보이기 시작해요.
      </p>
    </section>
  );
}
