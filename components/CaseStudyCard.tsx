"use client";

import { useEffect } from "react";
import type { CaseStudy } from "@/lib/cases";
import { trackCaseView, trackCaseCtaClick } from "@/lib/analytics";
import { KAKAO_URL } from "@/lib/constants";

interface Props {
  caseStudy: CaseStudy;
  matchedByGap: boolean;
}

export default function CaseStudyCard({ caseStudy, matchedByGap }: Props) {
  useEffect(() => {
    trackCaseView(caseStudy.id, caseStudy.stageId, matchedByGap);
  }, [caseStudy.id, caseStudy.stageId, matchedByGap]);

  const badge = matchedByGap
    ? "같은 착각을 했던 브랜드"
    : "같은 진단을 받은 브랜드";

  return (
    <section className="bg-white border border-gray-200 rounded-[14px] p-5 mb-4 animate-fade-in-up shadow-sm">
      <div className="inline-flex items-center gap-1.5 bg-vp-blue/10 text-vp-blue text-[11.5px] font-semibold px-2.5 py-1 rounded-full mb-3">
        <span>📌</span>
        {badge}
      </div>

      <h3 className="text-[14px] font-bold text-vp-navy mb-3">
        {caseStudy.brandType}
      </h3>

      <div className="flex flex-col gap-3">
        <div className="border-l-2 border-gray-300 pl-3">
          <p className="text-[11px] text-gray-400 mb-0.5">처음 느낀 문제</p>
          <p className="text-[13px] text-gray-700 leading-relaxed italic">
            "{caseStudy.symptom}"
          </p>
        </div>

        <div>
          <p className="text-[11px] text-vp-blue font-medium mb-0.5">
            진단이 찾아낸 진짜 원인
          </p>
          <p className="text-[13px] text-gray-700 leading-relaxed">
            {caseStudy.realCause}
          </p>
        </div>

        <div>
          <p className="text-[11px] text-gray-400 mb-0.5">무엇을 바꿨나</p>
          <p className="text-[13px] text-gray-700 leading-relaxed">
            {caseStudy.action}
          </p>
        </div>

        <div>
          <p className="text-[11px] text-gray-400 mb-0.5">결과</p>
          <p className="text-[13px] text-gray-800 font-medium leading-relaxed">
            {caseStudy.result}
          </p>
        </div>

        {caseStudy.metric && (
          <div className="flex items-center justify-between bg-vp-good-bg rounded-lg px-4 py-3 mt-1">
            <span className="text-[12px] text-vp-good font-medium">
              {caseStudy.metric.label}
            </span>
            <span className="text-[14px] font-bold text-vp-good">
              {caseStudy.metric.before} → {caseStudy.metric.after}
            </span>
          </div>
        )}
      </div>

      <a
        href={KAKAO_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackCaseCtaClick(caseStudy.id)}
        className="block w-full text-center bg-vp-blue hover:bg-vp-blue-hover text-white text-[13px] font-medium px-4 py-2.5 rounded-lg transition-colors mt-4"
      >
        우리 브랜드도 이렇게 될 수 있을까요? →
      </a>
    </section>
  );
}
