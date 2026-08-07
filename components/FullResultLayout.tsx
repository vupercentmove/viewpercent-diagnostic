"use client";
import { useMemo, useState } from "react";
import { STAGES } from "@/lib/stage-meta";
import type { Answers } from "@/lib/scoring";
import { calcFullDeepStageScores, getFullWeakestStage, subAreaBreakdown } from "@/lib/full-deep-scoring";
import { getExplainer } from "@/lib/full-deep-content";
import { getBenchmark } from "@/lib/benchmark";
import RadarChart from "@/components/RadarChart";
import StageScoreList from "@/components/StageScoreList";
import { buildKakaoUrl } from "@/lib/constants";
import { trackFullCtaClick, trackShareUrlCopy } from "@/lib/analytics";

export default function FullResultLayout({ answers, vision, aiComment, variant, onRestart }: { answers: Answers; vision: string | null; aiComment: string | null; variant?: "A" | "B"; onRestart: () => void }) {
  const scores = useMemo(() => calcFullDeepStageScores(answers), [answers]);
  const weakest = useMemo(() => getFullWeakestStage(scores), [scores]);
  const focus = useMemo(() => scores.filter((s) => s.measured).sort((a, b) => a.score - b.score).slice(0, 3), [scores]);
  const radarData = scores.map((s) => ({ stageId: s.stageId, score: s.score }));
  const unmeasured = scores.filter((s) => !s.measured);
  const [copied, setCopied] = useState(false);

  // 요약 헤로용 벤치마크 — 측정된 단계 평균으로 계산 (전부 '모름'이면 생략)
  const benchmark = useMemo(() => {
    const measured = scores.filter((s) => s.measured);
    if (measured.length === 0) return null;
    const overall = Math.round(measured.reduce((a, s) => a + s.score, 0) / measured.length);
    return getBenchmark(overall, measured.map(({ stageId, score }) => ({ stageId, score })));
  }, [scores]);

  const weakestName = weakest ? STAGES[weakest.stageId - 1].name : null;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      trackShareUrlCopy("full-result");
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // clipboard 미지원 브라우저 — 조용히 무시 (주소창 복사로 동일 결과 가능)
    }
  };

  return (
    <div className="max-w-[430px] mx-auto p-4 flex flex-col gap-5">
      {/* 요약 헤로 — 10분 진단의 결론을 먼저 말한다 */}
      <section className="bg-vp-navy text-white rounded-[14px] px-6 py-7 animate-fade-in-up">
        <p className="text-[10px] tracking-widest text-vp-blue-light font-medium mb-2.5 uppercase">
          diagnostic result · 정밀 진단
        </p>
        <h2 className="text-[20px] font-medium leading-[1.4] mb-2">
          {weakestName
            ? `6단계를 전부 봤어요. 지금은 '${weakestName}'에서 새고 있어요.`
            : "6단계를 전부 봤어요. 먼저 확인이 필요한 영역부터 같이 보면 돼요."}
        </h2>
        <p className="text-[13px] text-white/70 leading-relaxed">
          아래 카드가 가장 새는 세 구간이에요. 세부 영역까지 내려가면 먼저 손볼
          곳이 보입니다.
        </p>
        {benchmark && (
          <div className="mt-5 pt-4 border-t border-white/10">
            {/* 상위 50% 밖이면 "상위 N%"가 성취처럼 오독되므로, 앞선 브랜드 비율로 방향을 명시한다 */}
            <div className="flex items-baseline gap-2 flex-wrap">
              {benchmark.overallTopPercent <= 50 ? (
                <>
                  <span className="text-[12px] text-white/60">전체 점수는 진단한 브랜드 중</span>
                  <span className="text-[18px] font-semibold text-vp-blue-light leading-none">
                    상위 {benchmark.overallTopPercent}%
                  </span>
                </>
              ) : (
                <>
                  <span className="text-[12px] text-white/60">지금 우리보다 앞서 있는 브랜드가</span>
                  <span className="text-[18px] font-semibold text-vp-blue-light leading-none">
                    약 {benchmark.overallTopPercent}%
                  </span>
                </>
              )}
            </div>
            <p className="text-[11px] text-white/45 leading-relaxed mt-1.5">
              {benchmark.isSeed
                ? "여성의류 브랜드 운영 기준치와 비교한 위치예요 (초기 기준)."
                : `진단에 참여한 ${benchmark.sampleSize?.toLocaleString()}개 브랜드와 비교한 위치예요.`}
            </p>
          </div>
        )}
      </section>
      <RadarChart stageScores={radarData} unmeasuredStages={scores.filter((s) => !s.measured).map((s) => s.stageId)} />
      {unmeasured.length > 0 && (
        <p className="text-[12px] text-gray-400">{unmeasured.map((s) => STAGES[s.stageId - 1].name).join(" · ")} 단계는 아직 탐색이 필요한 영역이에요. 여기부터 같이 보면 돼요.</p>
      )}
      <StageScoreList
        stageScores={scores.map(({ stageId, score }) => ({ stageId, score }))}
        unmeasuredStageIds={unmeasured.map((s) => s.stageId)}
      />
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
      <a href={buildKakaoUrl(weakest ? `full_${weakest.stageId}` : "full")} target="_blank" rel="noopener" onClick={() => trackFullCtaClick(variant)} className="w-full py-4 rounded-xl bg-vp-blue text-white text-center font-medium hover:bg-vp-blue-hover">이 빈틈, 카톡으로 봐드릴게요</a>
      <button
        onClick={copyLink}
        className="w-full py-3 rounded-xl border border-gray-200 text-[13px] text-gray-600 hover:border-vp-blue hover:text-vp-blue"
      >
        {copied ? "복사됐어요 — 카톡·DM에 붙여넣으세요" : "결과 링크 복사하기"}
      </button>
      <button onClick={onRestart} className="text-[12px] text-gray-400 underline">다시 진단하기</button>
    </div>
  );
}
