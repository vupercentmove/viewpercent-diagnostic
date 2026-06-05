"use client";

import { STAGES } from "@/lib/stage-meta";
import { getDeepQuestionsByStage } from "@/lib/deep-questions";
import type { Answers } from "@/lib/scoring";

interface DeepResultCardProps {
  stageId: number;
  deepAnswers: Answers;
}

/** 심화 진단 결과에서 하위 영역별 강약을 분석 */
export default function DeepResultCard({
  stageId,
  deepAnswers,
}: DeepResultCardProps) {
  const stage = STAGES.find((s) => s.id === stageId)!;
  const questions = getDeepQuestionsByStage(stageId);

  // subArea별 점수 계산
  const subAreaScores = questions.map((q) => ({
    subArea: q.subArea,
    questionText: q.text,
    score: deepAnswers[q.id] ?? 50,
  }));

  const avgScore = Math.round(
    subAreaScores.reduce((sum, s) => sum + s.score, 0) / subAreaScores.length
  );

  // 약한 영역 (50 미만)
  const weakAreas = subAreaScores.filter((s) => s.score < 50);
  // 강한 영역 (75 이상)
  const strongAreas = subAreaScores.filter((s) => s.score >= 75);

  return (
    <section className="bg-white border border-vp-blue/20 rounded-[14px] p-5 mb-4 animate-fade-in-up">
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
        {subAreaScores.map(({ subArea, score }) => (
          <div key={subArea}>
            <div className="flex justify-between text-[12px] mb-1">
              <span className="text-gray-600">{subArea}</span>
              <span
                className={`font-medium ${
                  score >= 75
                    ? "text-green-600"
                    : score >= 50
                    ? "text-yellow-600"
                    : "text-red-500"
                }`}
              >
                {score}점
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  score >= 75
                    ? "bg-green-400"
                    : score >= 50
                    ? "bg-yellow-400"
                    : "bg-red-400"
                }`}
                style={{ width: `${score}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* 약한 영역 액션 */}
      {weakAreas.length > 0 && (
        <div className="bg-red-50/50 border border-red-100 rounded-lg p-4 mb-3">
          <h4 className="text-[12px] font-semibold text-red-700 mb-2">
            지금 바로 개선할 영역
          </h4>
          <ul className="flex flex-col gap-1.5">
            {weakAreas.map(({ subArea }) => (
              <li
                key={subArea}
                className="text-[13px] text-red-800 flex items-center gap-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                {subArea}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 강한 영역 */}
      {strongAreas.length > 0 && (
        <div className="bg-green-50/50 border border-green-100 rounded-lg p-4">
          <h4 className="text-[12px] font-semibold text-green-700 mb-2">
            잘 하고 있는 영역
          </h4>
          <ul className="flex flex-col gap-1.5">
            {strongAreas.map(({ subArea }) => (
              <li
                key={subArea}
                className="text-[13px] text-green-800 flex items-center gap-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                {subArea}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
