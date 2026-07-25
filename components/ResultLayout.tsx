"use client";

import { useMemo } from "react";
import ResultHero from "@/components/ResultHero";
import RadarChart from "@/components/RadarChart";
import StrengthBox from "@/components/StrengthBox";
import StageScoreList from "@/components/StageScoreList";
import ActionCards from "@/components/ActionCards";
import PriorityCard from "@/components/PriorityCard";
import GapDiagnosisCard from "@/components/GapDiagnosisCard";
import EmpathyQuotes from "@/components/EmpathyQuotes";
import BeyondCard from "@/components/BeyondCard";
import CTACard from "@/components/CTACard";
import CaseStudyCard from "@/components/CaseStudyCard";
import DeepResultCard from "@/components/DeepResultCard";
import AiCommentCard from "@/components/AiCommentCard";
import ShareCardButton from "@/components/ShareCardButton";
import StickyCtaBar from "@/components/StickyCtaBar";
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
import { getDeepQuestionsByStage } from "@/lib/deep-questions";

interface ResultLayoutProps {
  answers: Answers;
  /** "result": 기본 결과(심화 유도 노출) / "deep-result": 심화 결과 / "shared": 공유링크 수신자 */
  variant: "result" | "deep-result" | "shared";
  deepStageId?: number;
  deepAnswers?: Answers;
  /** 심화 진단 시작 (variant=result일 때만 사용) */
  onDeepStart?: () => void;
  /** 처음부터 다시 진단 (SPA 내부). shared 변형에서는 미사용 */
  onRestart?: () => void;
}

export default function ResultLayout({
  answers,
  variant,
  deepStageId = 0,
  deepAnswers = {},
  onDeepStart,
  onRestart,
}: ResultLayoutProps) {
  const stageScores = useMemo(() => calcAllStageScores(answers), [answers]);
  const overallScore = useMemo(() => calcOverallScore(answers), [answers]);
  const worstStage = useMemo(() => getWorstStage(stageScores), [stageScores]);
  const gap = useMemo(() => detectGap(answers), [answers]);
  const benchmark = useMemo(
    () => getBenchmark(overallScore, stageScores),
    [overallScore, stageScores]
  );
  const resultLabel = useMemo(() => matchLabel(gap, worstStage), [gap, worstStage]);
  const matchedCase = useMemo(
    () => matchCase(gap, worstStage, undefined, JSON.stringify(answers)),
    [gap, worstStage, answers]
  );
  const matchedByGap = useMemo(
    () => isGapMatch(gap, matchedCase),
    [gap, matchedCase]
  );

  const showDeepCta = variant === "result" && !!onDeepStart;
  const isShared = variant === "shared";

  return (
    <div className="flex flex-col gap-0 pb-32">
      {/* 공유 링크 수신자 배너 */}
      {isShared && (
        <section className="bg-vp-blue/5 border border-vp-blue/20 rounded-[14px] px-5 py-4 mb-4 animate-fade-in-up">
          <p className="text-[13px] text-vp-navy/80 leading-relaxed mb-3">
            <span className="font-semibold text-vp-blue">친구가 보낸 진단 결과</span>예요.
            우리 브랜드는 어디서 매출이 새고 있을까요?
          </p>
          <a
            href="/"
            className="block w-full text-center bg-vp-blue hover:bg-vp-blue-hover text-white text-[13.5px] font-medium py-2.5 rounded-lg transition-colors"
          >
            내 브랜드도 진단해보기 →
          </a>
        </section>
      )}

      {/* 1. 결과 헤드라인 */}
      <ResultHero
        worstStageId={worstStage.stageId}
        overallScore={overallScore}
        benchmark={benchmark}
        label={resultLabel}
      />

      {/* 2. 레이더 차트 */}
      <RadarChart stageScores={stageScores} />

      {/* 3. 강점 인정 박스 */}
      <StrengthBox stageScores={stageScores} worstStageId={worstStage.stageId} />

      {/* 3.5 심화 결과 카드 (deep-result 전용) */}
      {variant === "deep-result" && (
        <DeepResultCard stageId={deepStageId} deepAnswers={deepAnswers} />
      )}

      {/* 4. Stage별 점수 리스트 */}
      <StageScoreList stageScores={stageScores} />

      {/* 5. 심화 진단 유도 (기본 결과에서만) */}
      {showDeepCta && (
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
                onClick={onDeepStart}
                className="bg-vp-blue hover:bg-vp-blue-hover text-white text-[13px] font-medium px-4 py-2 rounded-lg transition-colors"
              >
                심화 진단 시작 (
                {getDeepQuestionsByStage(worstStage.stageId).length}문항 · 2분)
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 5.5 AI 분석 코멘트 (공유 링크 수신자에게는 미노출) */}
      {!isShared && <AiCommentCard answers={answers} />}

      {/* 6. 액션 추천 */}
      <ActionCards stageScores={stageScores} />

      {/* 7. 1순위 개선점 */}
      <PriorityCard
        worstStageId={worstStage.stageId}
        worstScore={worstStage.score}
        answers={answers}
        benchmark={benchmark}
      />

      {/* 7.5 매칭된 사례 */}
      {matchedCase && (
        <CaseStudyCard caseStudy={matchedCase} matchedByGap={matchedByGap} />
      )}

      {/* 8. 빈틈 진단 */}
      {gap && gap.hasGap && <GapDiagnosisCard gap={gap} answers={answers} />}

      {/* 9. 공감 인용 */}
      <EmpathyQuotes worstStageId={worstStage.stageId} />

      {/* 10. 진단 너머의 이야기 */}
      <BeyondCard />

      {/* 11. CTA — 결과 링크 동봉 */}
      <CTACard answers={answers} />

      {/* 12. 결과 공유 카드 */}
      <ShareCardButton
        stageScores={stageScores}
        overallScore={overallScore}
        label={resultLabel}
        worstStageId={worstStage.stageId}
        answers={answers}
      />

      {/* 다시 진단 / 내 진단 시작 */}
      {isShared ? (
        <a
          href="/"
          className="mt-4 mb-8 text-[13px] text-vp-blue hover:text-vp-blue-hover transition-colors text-center"
        >
          내 브랜드도 진단해보기 →
        </a>
      ) : (
        onRestart && (
          <button
            onClick={onRestart}
            className="mt-4 mb-8 text-[13px] text-gray-500 hover:text-gray-700 transition-colors text-center"
          >
            처음부터 다시 진단하기
          </button>
        )
      )}

      {/* 하단 sticky 카톡 CTA */}
      <StickyCtaBar stageId={worstStage.stageId} gap={gap} />
    </div>
  );
}
