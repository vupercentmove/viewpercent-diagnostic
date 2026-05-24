"use client";

import { RESULT_HEADLINES } from "@/lib/stage-meta";

interface ResultHeroProps {
  worstStageId: number;
  overallScore: number;
}

export default function ResultHero({ worstStageId, overallScore }: ResultHeroProps) {
  const headline = RESULT_HEADLINES[worstStageId] ?? RESULT_HEADLINES[1];

  return (
    <section className="bg-vp-navy text-white rounded-[14px] px-7 py-8 mb-4 animate-fade-in-up">
      <p className="text-[11px] tracking-widest text-vp-blue-light uppercase font-medium mb-2.5">
        diagnostic result
      </p>
      <h2 className="text-[22px] font-medium leading-[1.4] mb-3">
        {headline.title}
      </h2>
      <p className="text-[13.5px] text-white/70 leading-relaxed">
        {headline.sub}
      </p>
    </section>
  );
}
