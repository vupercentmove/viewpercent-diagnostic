"use client";

import { useState, useCallback } from "react";
import { STAGES } from "@/lib/stage-meta";
import { getDeepQuestionsByStage, type DeepQuestion } from "@/lib/deep-questions";
import { ynToScore, likertToScore, type Answers } from "@/lib/scoring";
import { trackQuizAnswer } from "@/lib/analytics";

/** 심화 진단에서 역방향 yn 문항은 없음 (모두 정방향) */

interface DeepQuizStageProps {
  stageId: number;
  onComplete: (answers: Answers) => void;
  onCancel: () => void;
}

export default function DeepQuizStage({
  stageId,
  onComplete,
  onCancel,
}: DeepQuizStageProps) {
  const [answers, setAnswers] = useState<Answers>({});
  const questions = getDeepQuestionsByStage(stageId);
  const stage = STAGES.find((s) => s.id === stageId)!;
  const allAnswered = questions.every((q) => answers[q.id] !== undefined);
  const progress = Math.round(
    (Object.keys(answers).length / questions.length) * 100
  );

  const handleYn = useCallback(
    (questionId: string, answer: "yes" | "no") => {
      trackQuizAnswer(questionId, stageId);
      setAnswers((prev) => ({
        ...prev,
        [questionId]: answer === "yes" ? 100 : 0,
      }));
    },
    [stageId]
  );

  const handleLikert = useCallback(
    (questionId: string, value: number) => {
      trackQuizAnswer(questionId, stageId);
      setAnswers((prev) => ({
        ...prev,
        [questionId]: likertToScore(value),
      }));
    },
    [stageId]
  );

  const handleSubmit = () => {
    onComplete(answers);
  };

  return (
    <div className="bg-white border border-gray-100 rounded-[14px] p-6 animate-fade-in-up">
      {/* 헤더 */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-vp-blue/10 text-vp-blue">
            심화 진단
          </span>
          <span className="text-[11px] text-gray-400">
            {stage.label} — {stage.name}
          </span>
        </div>
        <h2 className="text-lg font-medium mb-1">
          이 부분을 더 자세히 들여다볼게요
        </h2>
        <p className="text-[13px] text-gray-500 leading-relaxed">
          {stage.hint}
        </p>
      </div>

      {/* 프로그레스 */}
      <div className="mb-5">
        <div className="flex justify-between text-xs text-gray-500 mb-1.5">
          <span>심화 진단 진행</span>
          <span>
            {Object.keys(answers).length}/{questions.length}
          </span>
        </div>
        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-vp-blue progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 문항들 */}
      <div className="flex flex-col gap-4">
        {questions.map((q) => (
          <DeepQuestionCard
            key={q.id}
            question={q}
            answer={answers[q.id]}
            onYn={handleYn}
            onLikert={handleLikert}
          />
        ))}
      </div>

      {/* 버튼 */}
      <div className="flex justify-between gap-2.5 mt-5">
        <button
          onClick={onCancel}
          className="px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 hover:border-vp-blue"
        >
          건너뛰기
        </button>
        <button
          onClick={handleSubmit}
          disabled={!allAnswered}
          className="px-5 py-2.5 rounded-lg bg-vp-blue text-white text-sm font-medium hover:bg-vp-blue-hover disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          심화 결과 보기
        </button>
      </div>
    </div>
  );
}

/* ── 개별 심화 문항 카드 ── */

function DeepQuestionCard({
  question,
  answer,
  onYn,
  onLikert,
}: {
  question: DeepQuestion;
  answer: number | undefined;
  onYn: (id: string, a: "yes" | "no") => void;
  onLikert: (id: string, v: number) => void;
}) {
  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-600 font-medium">
          {question.subArea}
        </span>
      </div>
      <p className="text-[14.5px] leading-relaxed mb-3">{question.text}</p>

      {question.answerType === "yn" ? (
        <div className="flex gap-2">
          <button
            onClick={() => onYn(question.id, "yes")}
            className={`flex-1 h-[38px] rounded-lg border text-[13px] ${
              answer === 100
                ? "bg-vp-navy text-white border-vp-navy"
                : "bg-white border-gray-200 text-gray-700 hover:border-vp-blue"
            }`}
          >
            네
          </button>
          <button
            onClick={() => onYn(question.id, "no")}
            className={`flex-1 h-[38px] rounded-lg border text-[13px] ${
              answer === 0
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
            {[1, 2, 3, 4, 5].map((v) => {
              const score = [0, 25, 50, 75, 100][v - 1];
              return (
                <button
                  key={v}
                  onClick={() => onLikert(question.id, v)}
                  className={`flex-1 h-[42px] rounded-lg border text-[13px] ${
                    answer === score
                      ? "bg-vp-blue text-white border-vp-blue"
                      : "bg-white border-gray-200 text-gray-700 hover:border-vp-blue"
                  }`}
                >
                  {v}
                </button>
              );
            })}
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
