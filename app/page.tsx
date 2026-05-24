"use client";

import { useState, useMemo } from "react";
import IntroHero from "@/components/IntroHero";
import QuizStage from "@/components/QuizStage";
import ResultHero from "@/components/ResultHero";
import RadarChart from "@/components/RadarChart";
import StageScoreList from "@/components/StageScoreList";
import ActionCards from "@/components/ActionCards";
import PriorityCard from "@/components/PriorityCard";
import GapDiagnosisCard from "@/components/GapDiagnosisCard";
import EmpathyQuotes from "@/components/EmpathyQuotes";
import BeyondCard from "@/components/BeyondCard";
import CTACard from "@/components/CTACard";
import {
  type Answers,
  calcAllStageScores,
  calcOverallScore,
  getWorstStage,
  detectGap,
} from "@/lib/scoring";

type Phase = "intro" | "quiz" | "result";

export default function HomePage() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [answers, setAnswers] = useState<Answers>({});

  const handleStart = () => {
    setPhase("quiz");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleQuizComplete = (ans: Answers) => {
    setAnswers(ans);
    setPhase("result");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRestart = () => {
    setAnswers({});
    setPhase("intro");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // 결과 계산
  const stageScores = useMemo(() => calcAllStageScores(answers), [answers]);
  const overallScore = useMemo(() => calcOverallScore(answers), [answers]);
  const worstStage = useMemo(() => getWorstStage(stageScores), [stageScores]);
  const gap = useMemo(() => detectGap(answers), [answers]);

  return (
    <>
      {phase === "intro" && <IntroHero onStart={handleStart} />}

      {phase === "quiz" && <QuizStage onComplete={handleQuizComplete} />}

      {phase === "result" && (
        <div className="flex flex-col gap-0">
          {/* 1. 결과 헤드라인 */}
          <ResultHero
            worstStageId={worstStage.stageId}
            overallScore={overallScore}
          />

          {/* 2. 레이더 차트 시각화 */}
          <RadarChart stageScores={stageScores} />

          {/* 3. Stage별 점수 리스트 */}
          <StageScoreList stageScores={stageScores} />

          {/* 4. 액션 추천 (가장 약한 2개 Stage) */}
          <ActionCards stageScores={stageScores} />

          {/* 5. 1순위 개선점 + 운영 원칙 카드 */}
          <PriorityCard
            worstStageId={worstStage.stageId}
            worstScore={worstStage.score}
          />

          {/* 6. 빈틈 진단 (감지된 경우에만) */}
          {gap && gap.hasGap && <GapDiagnosisCard gap={gap} />}

          {/* 7. 공감 인용 */}
          <EmpathyQuotes worstStageId={worstStage.stageId} />

          {/* 8. 진단 너머의 이야기 */}
          <BeyondCard />

          {/* 9. CTA */}
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
