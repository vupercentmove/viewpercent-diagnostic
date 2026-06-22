"use client";

import { RESULT_HEADLINES } from "@/lib/stage-meta";
import type { BenchmarkResult } from "@/lib/benchmark";
import type { ResultLabel } from "@/lib/result-labels";
import SocialProofBadge from "./SocialProofBadge";

interface ResultHeroProps {
  worstStageId: number;
  overallScore: number;
  benchmark?: BenchmarkResult;
  label?: ResultLabel;
}

export default function ResultHero({
  worstStageId,
  overallScore,
  benchmark,
  label,
}: ResultHeroProps) {
  const headline = RESULT_HEADLINES[worstStageId] ?? RESULT_HEADLINES[1];

  return (
    <section className="bg-vp-navy text-white rounded-[14px] px-7 py-8 mb-4 animate-fade-in-up">
      <p className="text-[11px] tracking-widest text-vp-blue-light uppercase font-medium mb-2.5">
        diagnostic result
      </p>

      {/* 정체성 결과 라벨 — 배지 + 한 줄 부연 */}
      {label && (
        <div className="mb-4">
          <span className="inline-block text-[12.5px] font-medium text-vp-blue-light border border-vp-blue-light/40 rounded-full px-3 py-1 leading-snug">
            {label.label}
          </span>
          <p className="text-[12.5px] text-white/55 leading-relaxed mt-2">
            {label.tagline}
          </p>
        </div>
      )}

      <h2 className="text-[22px] font-medium leading-[1.4] mb-3">
        {headline.title}
      </h2>
      <p className="text-[13.5px] text-white/70 leading-relaxed">
        {headline.sub}
      </p>

      {/* 누적 진단수 사회적증거 — 표본 임계치 미만이면 정성 폴백 */}
      <div className="mt-4">
        <SocialProofBadge variant="result" />
      </div>

      {/* 업계 벤치마크 — 상대 위치 */}
      {benchmark && (
        <div className="mt-6 pt-5 border-t border-white/10">
          <div className="flex items-baseline gap-2">
            <span className="text-[12px] text-white/60">
              전체 점수는 진단한 브랜드 중
            </span>
            <span className="text-[20px] font-semibold text-vp-blue-light leading-none">
              상위 {benchmark.overallTopPercent}%
            </span>
          </div>
          <p className="text-[11.5px] text-white/45 leading-relaxed mt-2">
            {benchmark.isSeed
              ? "여성의류 브랜드 운영 기준치와 비교한 위치예요. 진단 브랜드가 늘수록 실제 업계 분포로 정교해집니다."
              : `진단에 참여한 ${benchmark.sampleSize?.toLocaleString()}개 브랜드와 비교한 위치예요.`}
          </p>
        </div>
      )}
    </section>
  );
}
