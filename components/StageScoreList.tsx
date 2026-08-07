"use client";

import { STAGES } from "@/lib/stage-meta";
import { getTag, getTagLabel, type ScoreTag } from "@/lib/scoring";

interface StageScoreListProps {
  stageScores: { stageId: number; score: number }[];
  /** 정밀 진단에서 '잘 모르겠어요'로 측정하지 못한 단계 — 점수 대신 '탐색 필요' 표기 */
  unmeasuredStageIds?: number[];
}

const TAG_STYLES: Record<ScoreTag, string> = {
  good: "bg-vp-good-bg text-vp-good",
  warn: "bg-vp-warn-bg text-vp-warn",
  risk: "bg-vp-risk-bg text-vp-risk",
};

const DOT_COLORS: Record<ScoreTag, string> = {
  good: "bg-vp-good",
  warn: "bg-vp-warn",
  risk: "bg-vp-risk",
};

export default function StageScoreList({
  stageScores,
  unmeasuredStageIds,
}: StageScoreListProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-[14px] p-5 mb-4 animate-fade-in-up">
      <h3 className="text-[13px] font-medium text-gray-500 mb-3">
        6단계 진단 결과
      </h3>
      <div className="flex flex-col gap-2">
        {stageScores.map(({ stageId, score }) => {
          const stage = STAGES.find((s) => s.id === stageId)!;
          const unmeasured = unmeasuredStageIds?.includes(stageId) ?? false;
          if (unmeasured) {
            return (
              <div
                key={stageId}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-gray-50"
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-gray-300" />
                <span className="text-[13px] font-medium flex-1 text-gray-500">
                  {stage.label} {stage.name}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500">
                  탐색 필요
                </span>
              </div>
            );
          }
          const tag = getTag(score);

          return (
            <div
              key={stageId}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-gray-50"
            >
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${DOT_COLORS[tag]}`}
              />
              <span className="text-[13px] font-medium flex-1">
                {stage.label} {stage.name}
              </span>
              <span className="text-xs text-gray-500 tabular-nums">
                {score}점
              </span>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${TAG_STYLES[tag]}`}
              >
                {getTagLabel(tag)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
