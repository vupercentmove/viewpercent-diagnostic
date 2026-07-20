"use client";

import { useState, useMemo, useEffect } from "react";
import IntroHero from "@/components/IntroHero";
import QuizStage from "@/components/QuizStage";
import DeepQuizStage from "@/components/DeepQuizStage";
import FullDeepQuizStage from "@/components/FullDeepQuizStage";
import AnalyzingInterstitial from "@/components/AnalyzingInterstitial";
import ResultLayout from "@/components/ResultLayout";
import FullResultLayout from "@/components/FullResultLayout";
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
  calcFullDeepStageScores,
  getFullWeakestStage,
  collectUnknownAreas,
} from "@/lib/full-deep-scoring";
import { computeIcpFlag, type IcpSignals } from "@/lib/full-deep-content";
import { getFullDeepVariant } from "@/lib/ab";
import {
  trackDiagnosticStart,
  trackDiagnosticComplete,
  trackRestart,
  trackLabelView,
  trackDeepDiagnosticStart,
  trackDeepDiagnosticComplete,
  trackModeSelect,
  trackFullDeepStart,
  trackFullDeepComplete,
} from "@/lib/analytics";
import {
  readStateFromUrl,
  pushResultState,
  pushFullResultState,
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
  // 정밀(full) 모드 필드 — Task 8/9. quick 저장 경로에서는 전달하지 않는다.
  diagnostic_mode?: string;
  vision_answer?: string | null;
  unknown_areas?: { stageId: number; subAreas: string[] }[] | null;
  icp_flag?: boolean | null;
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
  | "deep-result"
  | "full-deep-quiz"
  | "full-analyzing"
  | "full-result";

export default function HomePage() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [answers, setAnswers] = useState<Answers>({});
  const [deepAnswers, setDeepAnswers] = useState<Answers>({});
  const [deepStageId, setDeepStageId] = useState<number>(0);

  // 정밀(full) 모드 상태
  const [fullAnswers, setFullAnswers] = useState<Answers>({});
  const [fullVision, setFullVision] = useState<string | null>(null);
  const [fullAiComment, setFullAiComment] = useState<string | null>(null);
  const [fullWeakestName, setFullWeakestName] = useState<string>("");
  const [fullVariant, setFullVariant] = useState<"A" | "B">("A");

  // URL에서 결과 복원 (구버전 ?a= 공유 링크 + 새로고침/뒤로가기).
  // 복원 시에는 analyzing 인터스티셜을 건너뛰고 결과를 바로 보여준다 (마찰 제거).
  useEffect(() => {
    const {
      answers: savedAnswers,
      phase: savedPhase,
      fullAnswers: savedFullAnswers,
      vision: savedVision,
    } = readStateFromUrl();
    if (savedAnswers && savedPhase === "result") {
      setAnswers(savedAnswers);
      setPhase("result");
    } else if (savedFullAnswers && savedPhase === "full-result") {
      setFullAnswers(savedFullAnswers);
      setFullVision(savedVision);
      setFullVariant(getFullDeepVariant());
      setPhase("full-result");
    }

    const handlePop = () => {
      const {
        answers: popAnswers,
        phase: popPhase,
        fullAnswers: popFullAnswers,
        vision: popVision,
      } = readStateFromUrl();
      if (popAnswers && popPhase === "result") {
        setAnswers(popAnswers);
        setPhase("result");
      } else if (popFullAnswers && popPhase === "full-result") {
        setFullAnswers(popFullAnswers);
        setFullVision(popVision);
        setFullVariant(getFullDeepVariant());
        setPhase("full-result");
      } else {
        setAnswers({});
        setDeepAnswers({});
        setDeepStageId(0);
        setFullAnswers({});
        setFullVision(null);
        setFullAiComment(null);
        setFullWeakestName("");
        setPhase("intro");
      }
      window.scrollTo({ top: 0 });
    };

    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  const handleStart = () => {
    // 빠른 진단 — 이벤트는 여기서 (Task 4에서 IntroHero 밖으로 이동)
    trackDiagnosticStart();
    trackModeSelect("quick");
    setPhase("quiz");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleStartFull = () => {
    const v = getFullDeepVariant();
    setFullVariant(v);
    trackModeSelect("full");
    trackFullDeepStart(v);
    setPhase("full-deep-quiz");
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

  /** 정밀(full) 진단 완료 — 저장 + AI 코멘트 요청 후 analyzing → result */
  const handleFullComplete = async ({
    answers: fullAns,
    vision,
    icpSignals,
  }: {
    answers: Answers;
    vision: string | null;
    icpSignals: IcpSignals;
  }) => {
    setFullAnswers(fullAns);
    setFullVision(vision);

    const scores = calcFullDeepStageScores(fullAns);
    const weakest = getFullWeakestStage(scores);
    const overall = Math.round(
      scores.reduce((a, s) => a + s.score, 0) / scores.length
    );
    setFullWeakestName(weakest ? STAGES[weakest.stageId - 1].name : "");
    trackFullDeepComplete(fullVariant);
    pushFullResultState(fullAns, vision);
    setPhase("full-analyzing"); // 인터스티셜 먼저
    window.scrollTo({ top: 0, behavior: "smooth" });

    // 저장 (fire-and-forget) — icpFlag 판정 포함
    saveResult({
      stageScores: scores.map((s) => ({ stageId: s.stageId, score: s.score })),
      overallScore: overall,
      weakestStage: weakest?.stageId ?? 0,
      resultType: "full",
      hasGap: false,
      diagnostic_mode: "full",
      vision_answer: vision,
      unknown_areas: collectUnknownAreas(fullAns),
      icp_flag: computeIcpFlag(icpSignals),
    });

    // 전 Stage 모름 — 약점 Stage 자체가 없으므로 /api/analyze 호출 없이 고정 메시지
    // (weakestStage:0 → stageName(0) → "STAGE 0"이 사용자에게 노출되는 것을 방지)
    if (!weakest) {
      setFullAiComment("아직 탐색이 필요한 영역이 많아요. 카톡으로 같이 짚어드릴게요.");
      return;
    }

    // AI 코멘트 (실패해도 폴백 반환, 네트워크 오류만 null로 남김)
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "full",
          stageScores: scores.map((s) => ({ stageId: s.stageId, score: s.score })),
          overallScore: overall,
          weakestStage: weakest.stageId,
          vision,
        }),
      });
      const data = await res.json();
      setFullAiComment(typeof data.comment === "string" ? data.comment : null);
    } catch {
      setFullAiComment(null);
    }
  };

  const handleRestart = () => {
    trackRestart();
    setAnswers({});
    setDeepAnswers({});
    setDeepStageId(0);
    setFullAnswers({});
    setFullVision(null);
    setFullAiComment(null);
    setFullWeakestName("");
    setFullVariant("A");
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
      {phase === "intro" && (
        <IntroHero onStart={handleStart} onStartFull={handleStartFull} />
      )}

      {phase === "quiz" && <QuizStage onComplete={handleQuizComplete} />}

      {phase === "full-deep-quiz" && (
        <FullDeepQuizStage onComplete={handleFullComplete} variant={fullVariant} />
      )}

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

      {phase === "full-analyzing" && (
        <AnalyzingInterstitial
          worstStageName={fullWeakestName}
          worstStageId={0}
          hasGap={false}
          hasCase={false}
          onDone={() => {
            setPhase("full-result");
            window.scrollTo({ top: 0 });
          }}
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

      {phase === "full-result" && (
        <FullResultLayout
          answers={fullAnswers}
          vision={fullVision}
          aiComment={fullAiComment}
          variant={fullVariant}
          onRestart={handleRestart}
        />
      )}
    </>
  );
}
