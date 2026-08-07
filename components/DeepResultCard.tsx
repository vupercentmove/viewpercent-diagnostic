"use client";

import { useEffect, useRef } from "react";
import { STAGES } from "@/lib/stage-meta";
import { getDeepQuestionsByStage } from "@/lib/deep-questions";
import { getTag, type ScoreTag } from "@/lib/scoring";
import type { Answers } from "@/lib/scoring";

interface DeepResultCardProps {
  stageId: number;
  deepAnswers: Answers;
}

/** 앱 공통 점수 체계(양호·주의·위험)와 같은 색을 쓴다 — 카드만 다른 신호등이면 혼란 */
const TEXT_COLORS: Record<ScoreTag, string> = {
  good: "text-vp-good",
  warn: "text-vp-warn",
  risk: "text-vp-risk",
};
const BAR_COLORS: Record<ScoreTag, string> = {
  good: "bg-vp-good",
  warn: "bg-vp-warn",
  risk: "bg-vp-risk",
};

/** 심화 진단 결과에서 하위 영역별 강약을 분석 */
export default function DeepResultCard({
  stageId,
  deepAnswers,
}: DeepResultCardProps) {
  const stage = STAGES.find((s) => s.id === stageId)!;
  const questions = getDeepQuestionsByStage(stageId);
  const cardRef = useRef<HTMLElement>(null);

  // 심화를 막 끝낸 사용자가 찾는 건 이 카드다 — 결과 페이지 상단이 아니라 여기로 데려온다
  useEffect(() => {
    cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // subArea별 점수 계산
  const subAreaScores = questions.map((q) => ({
    subArea: q.subArea,
    questionText: q.text,
    score: deepAnswers[q.id] ?? 50,
  }));

  const avgScore = Math.round(
    subAreaScores.reduce((sum, s) => sum + s.score, 0) / subAreaScores.length
  );

  // 앱 공통 구간과 동일하게 분류 — 위험(<40)만 "지금 개선", 양호(≥70)는 "잘하고 있는"
  const weakAreas = subAreaScores.filter((s) => getTag(s.score) === "risk");
  const strongAreas = subAreaScores.filter((s) => getTag(s.score) === "good");

  return (
    <section
      ref={cardRef}
      className="bg-white border border-vp-blue/20 rounded-[14px] p-5 mb-4 animate-fade-in-up scroll-mt-4"
    >
      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-vp-blue/10 text-vp-blue">
          심화 진단 결과
        </span>
        <span className="text-[11px] text-gray-400">
          {stage.label} — {stage.name}
        </span>
        <span className="ml-auto text-[13px] font-semibold text-vp-navy">
          {avgScore}점
        </span>
      </div>

      {/* 요약 메시지 */}
      <p className="text-[14px] leading-relaxed text-gray-800 mb-5">
        {avgScore >= 70
          ? `${stage.name} 단계의 기본 구조는 갖춰져 있어요. 아래 세부 영역을 미세 조정하면 더 큰 효과를 볼 수 있어요.`
          : avgScore >= 40
          ? `${stage.name} 단계에서 놓치고 있는 부분이 보여요. 아래 약한 영역부터 하나씩 개선하면 체감이 달라질 거예요.`
          : `${stage.name} 단계에 구조적인 빈틈이 있어요. 기초부터 다시 설계해야 할 수 있어요.`}
      </p>

      {/* 하위 영역 바 차트 */}
      <div className="flex flex-col gap-3 mb-5">
        {subAreaScores.map(({ subArea, score }) => {
          const tag = getTag(score);
          return (
            <div key={subArea}>
              <div className="flex justify-between text-[12px] mb-1">
                <span className="text-gray-600">{subArea}</span>
                <span className={`font-medium ${TEXT_COLORS[tag]}`}>
                  {score}점
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${BAR_COLORS[tag]}`}
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* 약한 영역 액션 — 어떤 운영 습관이 비어 있는지(문항)까지 보여준다 */}
      {weakAreas.length > 0 && (
        <div className="bg-vp-risk-bg/50 border border-vp-risk/15 rounded-lg p-4 mb-3">
          <h4 className="text-[12px] font-semibold text-vp-risk mb-2">
            지금 바로 개선할 영역
          </h4>
          <ul className="flex flex-col gap-2.5">
            {weakAreas.map(({ subArea, questionText }) => (
              <li key={subArea} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-vp-risk shrink-0 mt-[6px]" />
                <div>
                  <p className="text-[13px] font-medium text-gray-800">
                    {subArea}
                  </p>
                  <p className="text-[12px] text-gray-500 leading-relaxed mt-0.5">
                    {questionText}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 강한 영역 */}
      {strongAreas.length > 0 && (
        <div className="bg-vp-good-bg/50 border border-vp-good/15 rounded-lg p-4">
          <h4 className="text-[12px] font-semibold text-vp-good mb-2">
            잘하고 있는 영역
          </h4>
          <ul className="flex flex-col gap-1.5">
            {strongAreas.map(({ subArea }) => (
              <li
                key={subArea}
                className="text-[13px] text-gray-700 flex items-center gap-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-vp-good shrink-0" />
                {subArea}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
