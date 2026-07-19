"use client";
import { useMemo } from "react";
import { STAGES } from "@/lib/stage-meta";
import type { Answers } from "@/lib/scoring";
import { calcFullDeepStageScores, getFullWeakestStage, subAreaBreakdown } from "@/lib/full-deep-scoring";
import { getExplainer } from "@/lib/full-deep-content";
import RadarChart from "@/components/RadarChart";
import { buildKakaoUrl } from "@/lib/constants";
import { trackFullCtaClick } from "@/lib/analytics";

export default function FullResultLayout({ answers, vision, aiComment, onRestart }: { answers: Answers; vision: string | null; aiComment: string | null; onRestart: () => void }) {
  const scores = useMemo(() => calcFullDeepStageScores(answers), [answers]);
  const weakest = useMemo(() => getFullWeakestStage(scores), [scores]);
  const focus = useMemo(() => scores.filter((s) => s.measured).sort((a, b) => a.score - b.score).slice(0, 3), [scores]);
  const radarData = scores.map((s) => ({ stageId: s.stageId, score: s.score }));
  const unmeasured = scores.filter((s) => !s.measured);

  return (
    <div className="max-w-[430px] mx-auto p-4 flex flex-col gap-5">
      <RadarChart stageScores={radarData} />
      {unmeasured.length > 0 && (
        <p className="text-[12px] text-gray-400">{unmeasured.map((s) => STAGES[s.stageId - 1].name).join(" · ")} 단계는 아직 탐색이 필요한 영역이에요. 여기부터 같이 보면 돼요.</p>
      )}
      {aiComment && (
        <section className="p-4 rounded-[14px] bg-white border border-vp-blue/20">
          <p className="text-[10px] font-medium text-vp-blue mb-2">진단 코멘트</p>
          <p className="text-[14px] leading-relaxed whitespace-pre-line">{aiComment}</p>
        </section>
      )}
      {focus.map((s) => {
        const ex = getExplainer(s.stageId);
        return (
          <section key={s.stageId} className="p-4 rounded-[14px] bg-white border border-gray-100">
            <p className="text-[13px] font-medium">{STAGES[s.stageId - 1].label} — {STAGES[s.stageId - 1].name} · {s.score}점</p>
            {/* 두괄식: 왜 봤나(의도) + 이렇게 가면 됨(행동) 먼저 */}
            <p className="text-[12.5px] text-gray-500 leading-relaxed mt-1.5">{ex.why}</p>
            <p className="text-[12.5px] text-vp-blue leading-relaxed mb-3">→ {ex.goodLooksLike}</p>
            <div className="flex flex-col gap-2">
              {subAreaBreakdown(s.stageId, answers).map((sa) => (
                <div key={sa.subArea} className="flex items-center justify-between text-[12px]">
                  <span className="text-gray-600">{sa.subArea}</span>
                  <span className={sa.unknown ? "text-gray-400" : "font-medium"}>{sa.unknown ? "탐색 필요" : `${sa.score}점`}</span>
                </div>
              ))}
            </div>
          </section>
        );
      })}
      {vision && (
        <p className="text-[13px] text-gray-700 leading-relaxed px-1">말씀하신 그 방향을 위해서라도, 지금 새는 {weakest ? STAGES[weakest.stageId - 1].name : "이 지점"}부터 같이 보면 돼요.</p>
      )}
      <a href={buildKakaoUrl(weakest ? `full_${weakest.stageId}` : "full")} target="_blank" rel="noopener" onClick={() => trackFullCtaClick()} className="w-full py-4 rounded-xl bg-vp-blue text-white text-center font-medium hover:bg-vp-blue-hover">이 빈틈, 카톡으로 봐드릴게요</a>
      <button onClick={onRestart} className="text-[12px] text-gray-400 underline">다시 진단하기</button>
    </div>
  );
}
