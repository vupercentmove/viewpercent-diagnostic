"use client";
import { useMemo, useState } from "react";
import { STAGES } from "@/lib/stage-meta";
import { type Answers } from "@/lib/scoring";
import { calcFullDeepStageScores, getFullWeakestStage, subAreaBreakdown, collectUnknownAreas } from "@/lib/full-deep-scoring";
import { classifyFullResult } from "@/lib/full-result-policy";
import { getExplainer } from "@/lib/full-deep-content";
import { getBenchmark } from "@/lib/benchmark";
import { buildStageEvidence, hasEvidence } from "@/lib/full-deep-evidence";
import { getRevenueLever } from "@/lib/revenue-lever";
import RadarChart from "@/components/RadarChart";
import StageScoreList from "@/components/StageScoreList";
import StrengthBox from "@/components/StrengthBox";
import { buildKakaoUrl } from "@/lib/constants";
import { trackFullCtaClick, trackShareUrlCopy } from "@/lib/analytics";
import { reportCtaClick } from "@/lib/feedback-client";
import ReactionCard from "@/components/ReactionCard";
import DecisionGuideCard from "@/components/DecisionGuideCard";
import { buildDecisionGuide } from "@/lib/decision-guide";
import UnknownPickCard from "@/components/UnknownPickCard";

export default function FullResultLayout({ answers, vision, aiComment, variant, onRestart, resultCode = null }: { answers: Answers; vision: string | null; aiComment: string | null; variant?: "A" | "B"; onRestart: () => void; resultCode?: string | null }) {
  const decisionGuide = useMemo(() => buildDecisionGuide("full", answers), [answers]);
  const scores = useMemo(() => calcFullDeepStageScores(answers), [answers]);
  const unknownAreas = useMemo(() => collectUnknownAreas(answers), [answers]);
  const weakest = useMemo(() => getFullWeakestStage(scores), [scores]);
  const resultState = useMemo(() => classifyFullResult(scores), [scores]);
  const hasPriorityStage = resultState === "priority";
  // 최약 1개는 강조 카드로, 그 다음 2개는 함께 볼 구간으로 분리한다.
  const others = useMemo(
    () => scores.filter((s) => s.measured && s.stageId !== weakest?.stageId).sort((a, b) => a.score - b.score).slice(0, 2),
    [scores, weakest]
  );
  const radarData = scores.map((s) => ({ stageId: s.stageId, score: s.score }));
  const unmeasured = scores.filter((s) => !s.measured);
  const [copied, setCopied] = useState(false);
  const [ctaCopied, setCtaCopied] = useState(false);

  // 강점 후보는 (a) 측정된 구간이면서 (b) 양호 기준(70점)을 넘긴 것만.
  // getStrengthStages에는 "70점 넘는 게 없으면 상위 2개라도 집는" 폴백이 있어서,
  // 그대로 넘기면 미측정(0점)이나 25점짜리가 "탄탄하게 잡혀 있어요"로 나온다.
  const strengthCandidates = useMemo(
    () => scores.filter((s) => s.measured && s.score >= 70).map((s) => ({ stageId: s.stageId, score: s.score })),
    [scores]
  );

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

  // 카톡 버튼은 채널 채팅만 연다 — ref에는 단계 번호뿐이고 채널이 그걸 상담 화면에 보여주는지도
  // 확인되지 않았다. 결과 링크를 따로 복사하지 않으면 코치는 결과 없이 대화를 시작한다
  // (제이블린 대표님은 주소창을 직접 복사해 보냈다, 2026-08-25). 누르는 순간 링크를 복사해 둔다.
  // await하지 않는다 — 새 탭 열기를 막지 않기 위해서. 인앱 브라우저 등에서 막히면 조용히 넘어가고
  // 아래 "결과 링크 복사하기" 버튼이 그대로 남는다.
  const copyLinkForCta = () => {
    navigator.clipboard
      ?.writeText(window.location.href)
      .then(() => {
        trackShareUrlCopy("full-cta");
        setCtaCopied(true);
      })
      .catch(() => {});
  };

  return (
    <div className="max-w-[430px] mx-auto p-4 flex flex-col gap-5">
      {/* 요약 헤로 — 10분 진단의 결론을 먼저 말한다 */}
      <section className="bg-vp-navy text-white rounded-[14px] px-6 py-7 animate-fade-in-up">
        <p className="text-[10px] tracking-widest text-vp-blue-light font-medium mb-2.5 uppercase">
          diagnostic result · 정밀 진단
        </p>
        <h2 className="text-[20px] font-medium leading-[1.4] mb-2">
          {resultState === "unmeasured"
            ? "6단계를 전부 봤어요. 먼저 확인이 필요한 영역부터 같이 보면 돼요."
            : resultState === "maintain"
              ? "6단계를 전부 봤어요. 확인된 답변은 양호 범위예요."
              : resultState === "incomplete"
                ? "확인된 답변은 양호 범위예요. 아직 확인 전인 영역이 남아 있어요."
              : `6단계를 전부 봤어요. 답변 기준으로 '${weakestName}'부터 확인해봐요.`}
        </h2>
        <p className="text-[13px] text-white/70 leading-relaxed">
          {resultState === "maintain"
            ? "점수를 더 올리기보다 유지할 기준과 다음 확인 날짜를 정할 차례예요."
            : resultState === "incomplete"
              ? "확인 전 영역을 실제 관리자 화면과 기록에서 먼저 열어봐요."
              : "아래는 답변으로 정리한 확인 순서예요. 실제 고객 행동과 비교하며 먼저 볼 곳을 정해요."}
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
                  <span className="text-[12px] text-white/60">전체 점수 기준, 우리보다 앞서 있는 브랜드가</span>
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
      <RadarChart stageScores={radarData} unmeasuredStages={unmeasured.map((s) => s.stageId)} />
      {unmeasured.length > 0 && (
        <p className="text-[12px] text-gray-400">{unmeasured.map((s) => STAGES[s.stageId - 1].name).join(" · ")} 단계는 아직 탐색이 필요한 영역이에요. 여기부터 같이 보면 돼요.</p>
      )}
      <StageScoreList
        stageScores={scores.map(({ stageId, score }) => ({ stageId, score }))}
        unmeasuredStageIds={unmeasured.map((s) => s.stageId)}
      />
      {hasPriorityStage && aiComment && (
        <section className="p-4 rounded-[14px] bg-white border border-vp-blue/20">
          <p className="text-[10px] font-medium text-vp-blue mb-2">진단 코멘트</p>
          <p className="text-[14px] leading-relaxed whitespace-pre-line">{aiComment}</p>
        </section>
      )}

      {/* 이미 되고 있는 구간 — 새는 구간만 나열하면 성장 프레임이 깨진다 */}
      {weakest && <StrengthBox stageScores={strengthCandidates} worstStageId={weakest.stageId} />}

      {/* 가장 먼저 볼 구간 — 판정 근거를 함께 되짚는다 */}
      {hasPriorityStage && weakest && <WeakestStageCard stage={weakest} answers={answers} />}

      {hasPriorityStage && others.length > 0 && (
        <section className="flex flex-col gap-3">
          <p className="text-[11px] tracking-wide text-gray-400 uppercase font-medium px-1">이어서 볼 구간</p>
          {others.map((s) => (
            <StageCard key={s.stageId} stage={s} answers={answers} />
          ))}
        </section>
      )}

      <DecisionGuideCard guide={decisionGuide} />

      {/* 모름을 결측이 아니라 대화로 — 둘 이상일 때만 */}
      <UnknownPickCard resultCode={resultCode} unknownAreas={unknownAreas} />

      {/* 판결이 아니라 질문으로 — CTA 앞에 딱 하나 */}
      <ReactionCard resultCode={resultCode} />

      {vision && (
        <p className="text-[13px] text-gray-700 leading-relaxed px-1">
          {hasPriorityStage
            ? `말씀하신 그 방향을 위해, 먼저 확인할 ${weakestName ?? "이 지점"}부터 같이 보면 돼요.`
            : resultState === "incomplete"
              ? "말씀하신 그 방향을 위해, 아직 확인 전인 근거부터 같이 열어보면 돼요."
              : "말씀하신 그 방향을 위해, 지금 확인된 기준을 유지하며 다음 고객 행동을 같이 보면 돼요."}
        </p>
      )}
      <p className="text-[13px] text-gray-700 leading-relaxed px-1">{decisionGuide.ctaBridge}</p>
      <a href={buildKakaoUrl(hasPriorityStage && weakest ? `full_${weakest.stageId}` : resultState === "incomplete" ? "full_incomplete" : resultState === "maintain" ? "full_maintain" : "full")} target="_blank" rel="noopener" onClick={() => { trackFullCtaClick(variant); if (resultCode) reportCtaClick(resultCode); copyLinkForCta(); }} className="w-full py-4 rounded-xl bg-vp-blue text-white text-center font-medium hover:bg-vp-blue-hover">이 빈틈, 카톡으로 봐드릴게요</a>
      {ctaCopied && (
        <p role="status" aria-live="polite" className="-mt-2 text-[12.5px] text-vp-blue text-center px-1">
          결과 링크를 복사해 뒀어요 — 카톡 창에 붙여넣어 주세요
        </p>
      )}
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

type StageScore = { stageId: number; score: number };

/** 최약 구간 — 파란 테두리로 위계를 주고, 판정 근거(①)를 함께 보여준다. */
function WeakestStageCard({ stage, answers }: { stage: StageScore; answers: Answers }) {
  const meta = STAGES[stage.stageId - 1];
  const ex = getExplainer(stage.stageId);
  const evidence = buildStageEvidence(stage.stageId, answers);
  // 상담이 도구 결과를 이어받도록 코치의 매출 공식 언어로 한 줄 번역 (lib/revenue-lever.ts)
  const lever = getRevenueLever(stage.stageId);

  return (
    <section className="p-4 rounded-[14px] bg-white border-2 border-vp-blue/40">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-vp-blue/10 text-vp-blue">가장 먼저 볼 구간</span>
        <span className="ml-auto text-[13px] font-semibold text-vp-blue">{stage.score}점</span>
      </div>
      <p className="text-[14px] font-medium">{meta.label} — {meta.name}</p>
      {/* 두괄식: 왜 봤나(의도) + 이렇게 가면 됨(행동) 먼저 */}
      <p className="text-[12.5px] text-gray-500 leading-relaxed mt-1.5">{ex.why}</p>
      <p className="text-[12.5px] text-vp-blue leading-relaxed">→ {ex.goodLooksLike}</p>
      {lever && (
        <p className="text-[12.5px] text-gray-600 leading-relaxed mt-2.5">
          <span className="inline-block text-[11px] px-1.5 py-0.5 mr-1.5 rounded bg-vp-navy/[0.06] text-vp-navy font-medium align-[1px]">
            매출 공식 · {lever.label}
          </span>
          {lever.line}
        </p>
      )}

      {/* 판정 근거 되짚기 — 해석은 붙이지 않고 응답한 영역만 그대로 */}
      {hasEvidence(evidence) && (
        <div className="mt-3.5 pt-3.5 border-t border-gray-100">
          <p className="text-[12px] text-gray-500 mb-2">이 구간을 짚은 건, 대표님이 이렇게 답하신 부분 때문이에요.</p>
          <div className="flex flex-wrap gap-1.5">
            {evidence.low.map((sa) => (
              <span key={sa} className="text-[11.5px] px-2 py-1 rounded-md bg-vp-risk-bg text-vp-risk">{sa}</span>
            ))}
            {evidence.unknown.map((sa) => (
              <span key={sa} className="text-[11.5px] px-2 py-1 rounded-md bg-gray-100 text-gray-500">{sa} · 아직 확인 전</span>
            ))}
          </div>
        </div>
      )}

      <SubAreaList stageId={stage.stageId} answers={answers} className="mt-3.5 pt-3.5 border-t border-gray-100" />
    </section>
  );
}

/** 이어서 볼 구간 — 최약 카드보다 가벼운 위계 */
function StageCard({ stage, answers }: { stage: StageScore; answers: Answers }) {
  const meta = STAGES[stage.stageId - 1];
  const ex = getExplainer(stage.stageId);

  return (
    <section className="p-4 rounded-[14px] bg-white border border-gray-100">
      <p className="text-[13px] font-medium">{meta.label} — {meta.name} · {stage.score}점</p>
      <p className="text-[12.5px] text-gray-500 leading-relaxed mt-1.5">{ex.why}</p>
      <p className="text-[12.5px] text-vp-blue leading-relaxed mb-3">→ {ex.goodLooksLike}</p>
      <SubAreaList stageId={stage.stageId} answers={answers} />
    </section>
  );
}

function SubAreaList({ stageId, answers, className = "" }: { stageId: number; answers: Answers; className?: string }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {subAreaBreakdown(stageId, answers).map((sa) => (
        <div key={sa.subArea} className="flex items-center justify-between text-[12px]">
          <span className="text-gray-600">{sa.subArea}</span>
          <span className={sa.unknown ? "text-gray-400" : "font-medium"}>{sa.unknown ? "탐색 필요" : `${sa.score}점`}</span>
        </div>
      ))}
    </div>
  );
}
