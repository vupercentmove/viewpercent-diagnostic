"use client";

import { useEffect } from "react";
import { type Answers, type GapDiagnosis, buildEcho, LOSS_AVERSION_LINE } from "@/lib/scoring";
import { STAGES } from "@/lib/stage-meta";
import { trackEchoView } from "@/lib/analytics";

interface GapDiagnosisCardProps {
  gap: GapDiagnosis;
  answers: Answers;
}

export default function GapDiagnosisCard({ gap, answers }: GapDiagnosisCardProps) {
  const actualStage = STAGES.find((s) => s.id === gap.actualWorst);
  const echo = buildEcho(answers, gap.actualWorst);

  useEffect(() => {
    if (echo) trackEchoView("gap", gap.actualWorst, echo.questionId);
  }, [echo?.questionId, gap.actualWorst]);

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

      {/* 개인화 되비춤 — 대표가 직접 답한 내용을 되짚어줌 */}
      {echo && (
        <div className="mb-3">
          <p className="text-[13px] text-gray-500 leading-relaxed italic">
            &ldquo;{echo.phrase}&rdquo;
          </p>
          <p className="text-[12.5px] text-gray-400 leading-relaxed mt-1.5">
            {LOSS_AVERSION_LINE}
          </p>
        </div>
      )}

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
