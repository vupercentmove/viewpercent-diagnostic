"use client";

import { useState, useMemo, useEffect } from "react";
import IntroHero from "@/components/IntroHero";
import QuizStage from "@/components/QuizStage";
import DeepQuizStage from "@/components/DeepQuizStage";
import AnalyzingInterstitial from "@/components/AnalyzingInterstitial";
import ResultLayout from "@/components/ResultLayout";
import {
  type Answers,
  calcAllStageScores,
  calcOverallScore,
  getWorstStage,
  detectGap,
} from "@/lib/scoring";
import { STAGES } from "@/lib/stage-meta";
import { matchCase } from "@/lib/case-match";
import { matchLabel } from "@/lib/result-labels";
import {
  trackDiagnosticComplete,
  trackRestart,
  trackLabelView,
  trackDeepDiagnosticStart,
  trackDeepDiagnosticComplete,
} from "@/lib/analytics";
import {
  readStateFromUrl,
  pushResultState,
  pushInitialState,
} from "@/lib/url-state";

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
  deepStageId?: number | null;
  deepAnswers?: Record<string, number> | null;
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

type Phase =
  | "intro"
  | "quiz"
  | "analyzing"
  | "result"
  | "deep-quiz"
  | "deep-result";

export default function HomePage() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [answers, setAnswers] = useState<Answers>({});
  const [deepAnswers, setDeepAnswers] = useState<Answers>({});
  const [deepStageId, setDeepStageId] = useState<number>(0);

  // URL에서 결과 복원 (구버전 ?a= 공유 링크 + 새로고침/뒤로가기).
  // 복원 시에는 analyzing 인터스티셜을 건너뛰고 결과를 바로 보여준다 (마찰 제거).
  useEffect(() => {
    const { answers: savedAnswers, phase: savedPhase } = readStateFromUrl();
    if (savedAnswers && savedPhase === "result") {
      setAnswers(savedAnswers);
      setPhase("result");
    }

    const handlePop = () => {
      const { answers: popAnswers, phase: popPhase } = readStateFromUrl();
      if (popAnswers && popPhase === "result") {
        setAnswers(popAnswers);
        setPhase("result");
      } else {
        setAnswers({});
        setDeepAnswers({});
        setDeepStageId(0);
        setPhase("intro");
      }
      window.scrollTo({ top: 0 });
    };

    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  const handleStart = () => {
    setPhase("quiz");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleQuizComplete = (ans: Answers) => {
    setAnswers(ans);
    setPhase("analyzing");
    pushResultState(ans);
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

    // 정체성 라벨 노출 트래킹 (1회)
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

  const handleAnalyzingDone = () => {
    setPhase("result");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeepStart = () => {
    setDeepStageId(worstStage.stageId);
    setPhase("deep-quiz");
    trackDeepDiagnosticStart(worstStage.stageId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeepComplete = (ans: Answers) => {
    setDeepAnswers(ans);
    setPhase("deep-result");
    trackDeepDiagnosticComplete(deepStageId);

    // 심화 답변(subArea 분포)을 추가 레코드로 저장. base 답변(answers)은 변하지
    // 않았으므로 렌더 스코프의 메모값을 그대로 재사용한다.
    // ⚠️ 이 레코드는 deep_stage_id가 non-null인 것으로 구분된다. 벤치마크 집계 시
    //    base 분포는 deep_stage_id IS NULL 행만 세어 deep 완료자 이중집계를 피한다.
    saveResult({
      stageScores,
      overallScore,
      weakestStage: worstStage.stageId,
      resultType: gap?.hasGap
        ? `gap_${gap.perceivedWorst}_${gap.actualWorst}`
        : "none",
      hasGap: gap?.hasGap ?? false,
      deepStageId,
      deepAnswers: ans,
    });

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
    pushInitialState();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // analyzing 인터스티셜 + deep 저장에 필요한 최소 계산 (결과 화면 계산은 ResultLayout이 담당)
  const stageScores = useMemo(() => calcAllStageScores(answers), [answers]);
  const overallScore = useMemo(() => calcOverallScore(answers), [answers]);
  const worstStage = useMemo(() => getWorstStage(stageScores), [stageScores]);
  const gap = useMemo(() => detectGap(answers), [answers]);
  const matchedCase = useMemo(() => matchCase(gap, worstStage), [gap, worstStage]);

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

      {phase === "analyzing" && (
        <AnalyzingInterstitial
          worstStageName={
            STAGES.find((s) => s.id === worstStage.stageId)?.name ?? ""
          }
          worstStageId={worstStage.stageId}
          hasGap={!!gap?.hasGap}
          hasCase={!!matchedCase}
          onDone={handleAnalyzingDone}
        />
      )}

      {phase === "result" && (
        <ResultLayout
          answers={answers}
          variant="result"
          onDeepStart={handleDeepStart}
          onRestart={handleRestart}
        />
      )}

      {phase === "deep-result" && (
        <ResultLayout
          answers={answers}
          variant="deep-result"
          deepStageId={deepStageId}
          deepAnswers={deepAnswers}
          onRestart={handleRestart}
        />
      )}
    </>
  );
}
