"use client";

import { useState, useMemo } from "react";
import IntroHero from "@/components/IntroHero";
import QuizStage from "@/components/QuizStage";
import DeepQuizStage from "@/components/DeepQuizStage";
import ResultHero from "@/components/ResultHero";
import RadarChart from "@/components/RadarChart";
import StageScoreList from "@/components/StageScoreList";
import ActionCards from "@/components/ActionCards";
import PriorityCard from "@/components/PriorityCard";
import GapDiagnosisCard from "@/components/GapDiagnosisCard";
import EmpathyQuotes from "@/components/EmpathyQuotes";
import BeyondCard from "@/components/BeyondCard";
import CTACard from "@/components/CTACard";
import DeepResultCard from "@/components/DeepResultCard";
import CaseStudyCard from "@/components/CaseStudyCard";
import {
  type Answers,
  calcAllStageScores,
  calcOverallScore,
  getWorstStage,
  detectGap,
} from "@/lib/scoring";
import { getBenchmark } from "@/lib/benchmark";
import { matchCase, isGapMatch } from "@/lib/case-match";
import { matchLabel } from "@/lib/result-labels";
import {
  trackDiagnosticComplete,
  trackRestart,
  trackLabelView,
} from "@/lib/analytics";
import { track } from "@vercel/analytics";

/** 진입 경로(utm) 파라미터 수집 — 익명 집계용 */
function readUtm(): Record<string, string> | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  params.forEach((value, key) => {
    if (key.startsWith("utm_") || key === "ref") utm[key] = value;
  });
  return Object.keys(utm).length > 0 ? utm : null;
}

/** 진단 결과를 익명으로 저장 (fire-and-forget — 실패해도 UX 안 막음) */
function saveResult(payload: {
  stageScores: { stageId: number; score: number }[];
  overallScore: number;
  weakestStage: number;
  resultType: string;
  hasGap: boolean;
}) {
  try {
    fetch("/api/diagnostic-result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, utm: readUtm() }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* noop */
  }
}

type Phase = "intro" | "quiz" | "result" | "deep-quiz" | "deep-result";

export default function HomePage() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [answers, setAnswers] = useState<Answers>({});
  const [deepAnswers, setDeepAnswers] = useState<Answers>({});
  const [deepStageId, setDeepStageId] = useState<number>(0);

  const handleStart = () => {
    setPhase("quiz");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleQuizComplete = (ans: Answers) => {
    setAnswers(ans);
    setPhase("result");
    window.scrollTo({ top: 0, behavior: "smooth" });

    // 결과 산출 후 트래킹
    const scores = calcAllStageScores(ans);
    const overall = calcOverallScore(ans);
    const worst = getWorstStage(scores);
    const gapResult = detectGap(ans);
    trackDiagnosticComplete({
      overallScore: overall,
      worstStageId: worst.stageId,
      worstScore: worst.score,
      hasGap: gapResult?.hasGap ?? false,
    });

    // 정체성 라벨 산출 후 노출 트래킹 (1회)
    const label = matchLabel(gapResult, worst);
    trackLabelView(label.id, label.stageId, gapResult?.hasGap ?? false);

    // 익명 결과 저장 (업계 벤치마크 집계용)
    saveResult({
      stageScores: scores,
      overallScore: overall,
      weakestStage: worst.stageId,
      resultType: gapResult?.hasGap
        ? `gap_${gapResult.perceivedWorst}_${gapResult.actualWorst}`
        : "none",
      hasGap: gapResult?.hasGap ?? false,
    });
  };

  const handleDeepStart = () => {
    setDeepStageId(worstStage.stageId);
    setPhase("deep-quiz");
    track("deep_diagnostic_start", { stageId: worstStage.stageId });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeepComplete = (ans: Answers) => {
    setDeepAnswers(ans);
    setPhase("deep-result");
    track("deep_diagnostic_complete", { stageId: deepStageId });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeepCancel = () => {
    setPhase("result");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRestart = () => {
    trackRestart();
    setAnswers({});
    setDeepAnswers({});
    setDeepStageId(0);
    setPhase("intro");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // 결과 계산
  const stageScores = useMemo(() => calcAllStageScores(answers), [answers]);
  const overallScore = useMemo(() => calcOverallScore(answers), [answers]);
  const worstStage = useMemo(() => getWorstStage(stageScores), [stageScores]);
  const gap = useMemo(() => detectGap(answers), [answers]);
  const benchmark = useMemo(
    () => getBenchmark(overallScore, stageScores),
    [overallScore, stageScores]
  );
  const resultLabel = useMemo(
    () => matchLabel(gap, worstStage),
    [gap, worstStage]
  );
  const matchedCase = useMemo(() => matchCase(gap, worstStage), [gap, worstStage]);
  const matchedByGap = useMemo(
    () => isGapMatch(gap, matchedCase),
    [gap, matchedCase]
  );

  return (
    <>
      {phase === "intro" && <IntroHero onStart={handleStart} />}

      {phase === "quiz" && <QuizStage onComplete={handleQuizComplete} />}

      {phase === "deep-quiz" && (
        <DeepQuizStage
          stageId={deepStageId}
          onComplete={handleDeepComplete}
          onCancel={handleDeepCancel}
        />
      )}

      {phase === "result" && (
        <div className="flex flex-col gap-0">
          {/* 1. 결과 헤드라인 */}
          <ResultHero
            worstStageId={worstStage.stageId}
            overallScore={overallScore}
            benchmark={benchmark}
            label={resultLabel}
          />

          {/* 2. 레이더 차트 시각화 */}
          <RadarChart stageScores={stageScores} />

          {/* 3. Stage별 점수 리스트 */}
          <StageScoreList stageScores={stageScores} />

          {/* 4. 심화 진단 유도 버튼 */}
          <section className="bg-gradient-to-r from-vp-blue/5 to-vp-blue/10 border border-vp-blue/20 rounded-[14px] p-5 mb-4 animate-fade-in-up">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-vp-blue/15 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-vp-blue text-sm">🔍</span>
              </div>
              <div className="flex-1">
                <h3 className="text-[14px] font-semibold text-gray-900 mb-1">
                  가장 약한 부분을 더 깊이 파고들어볼까요?
                </h3>
                <p className="text-[12.5px] text-gray-500 leading-relaxed mb-3">
                  {worstStage.score}점으로 가장 약한 단계를 세부 영역별로 진단해서,
                  정확히 어디를 먼저 고쳐야 하는지 알려드릴게요.
                </p>
                <button
                  onClick={handleDeepStart}
                  className="bg-vp-blue hover:bg-vp-blue-hover text-white text-[13px] font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  심화 진단 시작 ({getDeepQuestionCount(worstStage.stageId)}문항 · 2분)
                </button>
              </div>
            </div>
          </section>

          {/* 5. 액션 추천 (가장 약한 2개 Stage) */}
          <ActionCards stageScores={stageScores} />

          {/* 6. 1순위 개선점 + 운영 원칙 카드 */}
          <PriorityCard
            worstStageId={worstStage.stageId}
            worstScore={worstStage.score}
            benchmark={benchmark}
          />

          {/* 6.5 매칭된 사례 (있을 때만) */}
          {matchedCase && (
            <CaseStudyCard caseStudy={matchedCase} matchedByGap={matchedByGap} />
          )}

          {/* 7. 빈틈 진단 (감지된 경우에만) */}
          {gap && gap.hasGap && <GapDiagnosisCard gap={gap} />}

          {/* 8. 공감 인용 */}
          <EmpathyQuotes worstStageId={worstStage.stageId} />

          {/* 9. 진단 너머의 이야기 */}
          <BeyondCard />

          {/* 10. CTA */}
          <CTACard />

          {/* 다시 진단하기 */}
          <button
            onClick={handleRestart}
            className="mt-4 mb-8 text-[13px] text-gray-400 hover:text-gray-600 transition-colors text-center"
          >
            처음부터 다시 진단하기
          </button>
        </div>
      )}

      {phase === "deep-result" && (
        <div className="flex flex-col gap-0">
          {/* 1. 기본 결과 헤드라인 */}
          <ResultHero
            worstStageId={worstStage.stageId}
            overallScore={overallScore}
            benchmark={benchmark}
            label={resultLabel}
          />

          {/* 2. 레이더 차트 */}
          <RadarChart stageScores={stageScores} />

          {/* 3. 심화 결과 카드 (새로 추가) */}
          <DeepResultCard stageId={deepStageId} deepAnswers={deepAnswers} />

          {/* 4. Stage별 점수 리스트 */}
          <StageScoreList stageScores={stageScores} />

          {/* 5. 액션 추천 */}
          <ActionCards stageScores={stageScores} />

          {/* 6. 1순위 개선점 */}
          <PriorityCard
            worstStageId={worstStage.stageId}
            worstScore={worstStage.score}
            benchmark={benchmark}
          />

          {/* 6.5 매칭된 사례 (있을 때만) */}
          {matchedCase && (
            <CaseStudyCard caseStudy={matchedCase} matchedByGap={matchedByGap} />
          )}

          {/* 7. 빈틈 진단 */}
          {gap && gap.hasGap && <GapDiagnosisCard gap={gap} />}

          {/* 8. 공감 인용 */}
          <EmpathyQuotes worstStageId={worstStage.stageId} />

          {/* 9. 진단 너머의 이야기 */}
          <BeyondCard />

          {/* 10. CTA */}
          <CTACard />

          {/* 다시 진단하기 */}
          <button
            onClick={handleRestart}
            className="mt-4 mb-8 text-[13px] text-gray-400 hover:text-gray-600 transition-colors text-center"
          >
            처음부터 다시 진단하기
          </button>
        </div>
      )}
    </>
  );
}

/** 심화 문항 수 가져오기 (버튼 텍스트용) */
function getDeepQuestionCount(stageId: number): number {
  // 동적 import 대신 직접 계산
  const counts: Record<number, number> = { 1: 4, 2: 4, 3: 5, 4: 5, 5: 4, 6: 5 };
  return counts[stageId] ?? 4;
}
