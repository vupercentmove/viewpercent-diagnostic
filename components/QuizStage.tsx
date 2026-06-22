"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { STAGES } from "@/lib/stage-meta";
import { QUICK_QUESTIONS, type Question } from "@/lib/questions";
import { ynToScore, likertToScore, type Answers } from "@/lib/scoring";
import { trackQuizAnswer, trackEncouragement } from "@/lib/analytics";
import {
  nextIndex,
  prevIndex,
  isLastQuestion,
  shouldAutoAdvance,
  autoAdvanceDelay,
} from "@/lib/quiz-navigation";
import {
  progressPercent,
  hasCrossedHalf,
  achievementLabel,
} from "@/lib/progress";

interface QuizStageProps {
  onComplete: (answers: Answers) => void;
}

export default function QuizStage({ onComplete }: QuizStageProps) {
  const [cursor, setCursor] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [showEncouragement, setShowEncouragement] = useState(false);

  const total = QUICK_QUESTIONS.length;
  const q = QUICK_QUESTIONS[cursor];
  const stage = STAGES.find((s) => s.id === q.stageId)!;
  const answeredCount = Object.keys(answers).length;
  const progress = progressPercent(answeredCount, total);
  const onLast = isLastQuestion(cursor, total);
  const currentAnswered = answers[q.id] !== undefined;

  // 펜딩 자동 전진 타이머 / 격려 1회 가드 / 직전 응답 수
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shownHalfRef = useRef(false);
  const prevAnsweredRef = useRef(0);

  const clearAdvanceTimer = useCallback(() => {
    if (advanceTimer.current !== null) {
      clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
  }, []);

  // 언마운트 시 펜딩 타이머 정리
  useEffect(() => clearAdvanceTimer, [clearAdvanceTimer]);

  /** 공통 응답 처리: 트래킹 즉시 + 격려 1회 + 처음 답할 때만 자동 전진 */
  const applyAnswer = useCallback(
    (question: Question, score: number) => {
      // 타이머 즉시 호출 — 타이머가 취소돼도 이벤트 유실 방지
      trackQuizAnswer(question.id, question.stageId);

      // 이전에 답이 있던 문항(=수정)인지 판단 — 루프 방지의 실제 메커니즘
      const wasAnswered = answers[question.id] !== undefined;

      const prevAnswered = prevAnsweredRef.current;
      const currAnswered = prevAnswered + (wasAnswered ? 0 : 1);

      // 50% 격려 (1회만) — updater 밖에서 실행해 StrictMode 이중호출 방지
      if (
        !shownHalfRef.current &&
        hasCrossedHalf(prevAnswered, currAnswered, total)
      ) {
        shownHalfRef.current = true;
        setShowEncouragement(true);
        trackEncouragement("quiz");
      }
      prevAnsweredRef.current = currAnswered;

      clearAdvanceTimer();

      setAnswers((prev) => ({ ...prev, [question.id]: score }));

      // 처음 답하는 현재 문항이고 마지막이 아닐 때만 자동 전진
      if (
        !wasAnswered &&
        shouldAutoAdvance({ answeredIndex: cursor, cursor, total })
      ) {
        advanceTimer.current = setTimeout(() => {
          setCursor((c) => nextIndex(c, total));
        }, autoAdvanceDelay(question.answerType));
      }
    },
    [answers, cursor, total, clearAdvanceTimer]
  );

  const handleYnAnswer = useCallback(
    (questionId: string, answer: "yes" | "no") => {
      applyAnswer(q, ynToScore(questionId, answer));
    },
    [applyAnswer, q]
  );

  const handleLikertAnswer = useCallback(
    (questionId: string, value: number) => {
      applyAnswer(q, likertToScore(value));
    },
    [applyAnswer, q]
  );

  const handlePrev = () => {
    clearAdvanceTimer();
    setCursor((c) => prevIndex(c));
  };

  const handleComplete = () => {
    clearAdvanceTimer();
    onComplete(answers);
  };

  return (
    <div className="bg-white border border-gray-100 rounded-[14px] p-6 animate-fade-in-up">
      {/* 진행바 + 성취 라벨 + 카운터 */}
      <div className="mb-5">
        <div className="flex justify-between items-baseline text-xs mb-1.5">
          <span className="text-vp-blue font-medium">
            {achievementLabel(answeredCount, total)}
          </span>
          <span className="text-gray-400">
            {answeredCount}/{total}
          </span>
        </div>
        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-vp-blue progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 50% 격려 배너 (1회) */}
      {showEncouragement && (
        <div className="mb-5 px-3.5 py-2.5 rounded-lg bg-vp-blue/5 text-vp-blue text-[12.5px] leading-relaxed animate-fade-in-up">
          절반 왔어요. 남은 절반이 더 빠릅니다.
        </div>
      )}

      {/* Stage 헤더 (현재 문항 기준) */}
      <p className="text-[11px] tracking-wide text-vp-blue font-medium uppercase mb-1.5">
        {stage.label} — {stage.name}
      </p>
      <p className="text-[12px] text-gray-400 leading-relaxed mb-5">
        {stage.hint}
      </p>

      {/* 현재 문항 1개 (key로 전환 애니메이션) */}
      <QuestionCard
        key={q.id}
        question={q}
        answer={answers[q.id]}
        onYn={handleYnAnswer}
        onLikert={handleLikertAnswer}
      />

      {/* 네비게이션 */}
      <div className="flex justify-between gap-2.5 mt-5">
        {cursor > 0 ? (
          <button
            onClick={handlePrev}
            className="px-4 py-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 hover:border-vp-blue"
          >
            이전
          </button>
        ) : (
          <div />
        )}
        {onLast ? (
          <button
            onClick={handleComplete}
            disabled={!currentAnswered}
            className="px-5 py-3 rounded-lg bg-vp-blue text-white text-sm font-medium hover:bg-vp-blue-hover disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            결과 보기
          </button>
        ) : (
          <div />
        )}
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
            className={`flex-1 h-[44px] rounded-lg border text-[13px] ${
              answer !== undefined &&
              answer === ynToScore(question.id, "yes")
                ? "bg-vp-navy text-white border-vp-navy"
                : "bg-white border-gray-200 text-gray-700 hover:border-vp-blue"
            }`}
          >
            네
          </button>
          <button
            onClick={() => onYn(question.id, "no")}
            className={`flex-1 h-[44px] rounded-lg border text-[13px] ${
              answer !== undefined &&
              answer === ynToScore(question.id, "no")
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
                className={`flex-1 h-[48px] rounded-lg border text-[13px] ${
                  answer === likertToScore(v)
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

