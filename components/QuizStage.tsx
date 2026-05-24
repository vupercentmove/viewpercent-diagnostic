"use client";

import { useState, useCallback } from "react";
import { STAGES } from "@/lib/stage-meta";
import {
  QUICK_QUESTIONS,
  getQuestionsByStage,
  type Question,
} from "@/lib/questions";
import { ynToScore, likertToScore, type Answers } from "@/lib/scoring";

interface QuizStageProps {
  onComplete: (answers: Answers) => void;
}

export default function QuizStage({ onComplete }: QuizStageProps) {
  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});

  const stage = STAGES[currentStageIdx];
  const stageQuestions = getQuestionsByStage(stage.id);
  const totalQuestions = QUICK_QUESTIONS.length;
  const answeredCount = Object.keys(answers).length;
  const progress = Math.round((answeredCount / totalQuestions) * 100);

  const allStageAnswered = stageQuestions.every((q) => answers[q.id] !== undefined);

  const handleYnAnswer = useCallback(
    (questionId: string, answer: "yes" | "no") => {
      setAnswers((prev) => ({
        ...prev,
        [questionId]: ynToScore(questionId, answer),
      }));
    },
    []
  );

  const handleLikertAnswer = useCallback(
    (questionId: string, value: number) => {
      setAnswers((prev) => ({
        ...prev,
        [questionId]: likertToScore(value),
      }));
    },
    []
  );

  const handleNext = () => {
    if (currentStageIdx < STAGES.length - 1) {
      setCurrentStageIdx((i) => i + 1);
    } else {
      onComplete(answers);
    }
  };

  const handlePrev = () => {
    if (currentStageIdx > 0) {
      setCurrentStageIdx((i) => i - 1);
    }
  };

  return (
    <div className="bg-white border border-gray-100 rounded-[14px] p-6 animate-fade-in-up">
      {/* 프로그레스 */}
      <div className="mb-5">
        <div className="flex justify-between text-xs text-gray-500 mb-1.5">
          <span>
            {stage.label} — {stage.name}
          </span>
          <span>
            {answeredCount}/{totalQuestions}
          </span>
        </div>
        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-vp-blue progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Stage 힌트 */}
      <p className="text-[11px] tracking-wide text-vp-blue font-medium uppercase mb-1.5">
        {stage.label}
      </p>
      <h2 className="text-lg font-medium mb-1">{stage.name}</h2>
      <p className="text-[13px] text-gray-500 leading-relaxed mb-6">
        {stage.hint}
      </p>

      {/* 문항들 */}
      <div className="flex flex-col gap-5">
        {stageQuestions.map((q) => (
          <QuestionCard
            key={q.id}
            question={q}
            answer={answers[q.id]}
            onYn={handleYnAnswer}
            onLikert={handleLikertAnswer}
          />
        ))}
      </div>

      {/* 네비게이션 */}
      <div className="flex justify-between gap-2.5 mt-5">
        {currentStageIdx > 0 ? (
          <button
            onClick={handlePrev}
            className="px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 hover:border-vp-blue"
          >
            이전
          </button>
        ) : (
          <div />
        )}
        <button
          onClick={handleNext}
          disabled={!allStageAnswered}
          className="px-5 py-2.5 rounded-lg bg-vp-blue text-white text-sm font-medium hover:bg-vp-blue-hover disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          {currentStageIdx < STAGES.length - 1 ? "다음 단계" : "결과 보기"}
        </button>
      </div>
    </div>
  );
}

/* ── 개별 문항 카드 ── */

function QuestionCard({
  question,
  answer,
  onYn,
  onLikert,
}: {
  question: Question;
  answer: number | undefined;
  onYn: (id: string, a: "yes" | "no") => void;
  onLikert: (id: string, v: number) => void;
}) {
  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <p className="text-[14.5px] leading-relaxed mb-3">{question.text}</p>

      {question.answerType === "yn" ? (
        <div className="flex gap-2">
          <button
            onClick={() => onYn(question.id, "yes")}
            className={`flex-1 h-[38px] rounded-lg border text-[13px] ${
              answer !== undefined &&
              answer === ynScoreForYes(question.id)
                ? "bg-vp-navy text-white border-vp-navy"
                : "bg-white border-gray-200 text-gray-700 hover:border-vp-blue"
            }`}
          >
            네
          </button>
          <button
            onClick={() => onYn(question.id, "no")}
            className={`flex-1 h-[38px] rounded-lg border text-[13px] ${
              answer !== undefined &&
              answer === ynScoreForNo(question.id)
                ? "bg-red-50 text-red-800 border-red-300"
                : "bg-white border-gray-200 text-gray-700 hover:border-vp-blue"
            }`}
          >
            아니요
          </button>
        </div>
      ) : (
        <div>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((v) => (
              <button
                key={v}
                onClick={() => onLikert(question.id, v)}
                className={`flex-1 h-[42px] rounded-lg border text-[13px] ${
                  answer === likertToScoreVal(v)
                    ? "bg-vp-blue text-white border-vp-blue"
                    : "bg-white border-gray-200 text-gray-700 hover:border-vp-blue"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-[11px] text-gray-400 mt-1.5 px-0.5">
            <span>전혀 아님</span>
            <span>매우 그렇다</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── 헬퍼 (active 상태 비교용) ── */

const REVERSE_YN = new Set(["q1a", "q1b", "q5a", "q6b"]);

function ynScoreForYes(qId: string): number {
  return REVERSE_YN.has(qId) ? 0 : 100;
}
function ynScoreForNo(qId: string): number {
  return REVERSE_YN.has(qId) ? 100 : 0;
}
function likertToScoreVal(v: number): number {
  return [0, 25, 50, 75, 100][v - 1] ?? 50;
}
