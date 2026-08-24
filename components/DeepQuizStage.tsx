"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { STAGES } from "@/lib/stage-meta";
import { getDeepQuestionsByStage, type DeepQuestion } from "@/lib/deep-questions";
import { likertToScore, ynToScore, type Answers } from "@/lib/scoring";
import { LIKERT_ANCHOR_LOW, LIKERT_ANCHOR_HIGH, LIKERT_OPTION_LABEL } from "@/lib/likert-scale";
import { trackQuizAnswer, trackEncouragement } from "@/lib/analytics";
import QuestionExample from "@/components/QuestionExample";
import {
  nextIndex,
  prevIndex,
  isLastQuestion,
  shouldAutoAdvance,
  autoAdvanceDelay,
} from "@/lib/quiz-navigation";
import {
  endowedProgress,
  hasCrossedHalf,
  achievementLabel,
} from "@/lib/progress";

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
  const [cursor, setCursor] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [showEncouragement, setShowEncouragement] = useState(false);
  const [srMessage, setSrMessage] = useState("");

  const questions = getDeepQuestionsByStage(stageId);
  const stage = STAGES.find((s) => s.id === stageId)!;
  const total = questions.length;
  const q = questions[cursor];
  const answeredCount = Object.keys(answers).length;
  const barWidth = endowedProgress(answeredCount, total);
  const onLast = isLastQuestion(cursor, total);
  const currentAnswered = answers[q.id] !== undefined;

  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shownHalfRef = useRef(false);
  const prevAnsweredRef = useRef(0);

  // 문항 전환 시 새 문항으로 포커스 이동
  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    cardRef.current?.focus({ preventScroll: true });
  }, [cursor]);

  // 격려 배너는 뜬 문항 한 번만 — 다음 문항으로 넘어가면(자동전진·이전 모두) 사라진다
  useEffect(() => {
    setShowEncouragement(false);
  }, [cursor]);

  const clearAdvanceTimer = useCallback(() => {
    if (advanceTimer.current !== null) {
      clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
  }, []);

  useEffect(() => clearAdvanceTimer, [clearAdvanceTimer]);

  const applyAnswer = useCallback(
    (question: DeepQuestion, score: number) => {
      trackQuizAnswer(question.id, stageId, {
        stepIndex: cursor,
        totalSteps: total,
        context: "deep",
      });

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
        trackEncouragement("deep");
      }
      prevAnsweredRef.current = currAnswered;

      clearAdvanceTimer();

      setAnswers((prev) => ({ ...prev, [question.id]: score }));

      if (
        !wasAnswered &&
        shouldAutoAdvance({ answeredIndex: cursor, cursor, total })
      ) {
        advanceTimer.current = setTimeout(() => {
          setCursor((c) => nextIndex(c, total));
        }, autoAdvanceDelay(question.answerType));
      }

      if (!wasAnswered && isLastQuestion(cursor, total)) {
        setSrMessage("마지막 문항 답변 완료. 심화 결과 보기 버튼이 활성화됩니다.");
      }
    },
    [answers, cursor, total, stageId, clearAdvanceTimer]
  );

  const handleYn = useCallback(
    (questionId: string, answer: "yes" | "no") => {
      applyAnswer(q, answer === "yes" ? 100 : 0);
    },
    [applyAnswer, q]
  );

  const handleLikert = useCallback(
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
        <div
          className="h-1 bg-gray-100 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={answeredCount}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuetext={`${total}문항 중 ${answeredCount}문항 완료`}
        >
          <div
            className="h-full bg-vp-blue progress-fill"
            style={{ width: `${barWidth}%` }}
          />
        </div>
      </div>

      {/* 50% 격려 배너 (1회) */}
      {showEncouragement && (
        <div className="mb-5 px-3.5 py-2.5 rounded-lg bg-vp-blue/5 text-vp-blue text-[12.5px] leading-relaxed animate-fade-in-up">
          핵심만 남았어요. 여기까지가 가장 중요합니다.
        </div>
      )}

      {/* 현재 심화 문항 1개 */}
      <DeepQuestionCard
        key={q.id}
        cardRef={cardRef}
        stepLabel={`심화 문항 ${cursor + 1} / ${total}`}
        question={q}
        answer={answers[q.id]}
        onYn={handleYn}
        onLikert={handleLikert}
      />

      {/* 스크린리더 알림 */}
      <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {srMessage}
      </span>

      {/* 버튼 */}
      <div className="flex justify-between gap-2.5 mt-5">
        {cursor === 0 ? (
          <button
            onClick={onCancel}
            className="px-4 py-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 hover:border-vp-blue"
          >
            건너뛰기
          </button>
        ) : (
          <button
            onClick={handlePrev}
            className="px-4 py-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 hover:border-vp-blue"
          >
            이전
          </button>
        )}
        {onLast ? (
          <button
            onClick={handleComplete}
            disabled={!currentAnswered}
            className="px-5 py-3 rounded-lg bg-vp-blue text-white text-sm font-medium hover:bg-vp-blue-hover disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            심화 결과 보기
          </button>
        ) : (
          <div />
        )}
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
  cardRef,
  stepLabel,
}: {
  question: DeepQuestion;
  answer: number | undefined;
  onYn: (id: string, a: "yes" | "no") => void;
  onLikert: (id: string, v: number) => void;
  cardRef: React.RefObject<HTMLDivElement>;
  stepLabel: string;
}) {
  const btnBase =
    "rounded-lg border text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vp-blue focus-visible:ring-offset-1";

  // 심화 yn 문항은 모두 정방향 (예=100, 아니요=0)
  const handleYnKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
    e.preventDefault();
    const options: Array<"yes" | "no"> = ["yes", "no"];
    const ci = answer === 100 ? 0 : answer === 0 ? 1 : -1;
    const next =
      e.key === "ArrowRight" || e.key === "ArrowDown"
        ? (ci === -1 ? 0 : (ci + 1) % 2)
        : (ci === -1 ? 1 : (ci - 1 + 2) % 2);
    onYn(question.id, options[next]);
  };

  const handleLikertKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
    e.preventDefault();
    const scores = [0, 25, 50, 75, 100];
    const ci = answer !== undefined ? scores.indexOf(answer) : -1;
    const next =
      e.key === "ArrowRight" || e.key === "ArrowDown"
        ? (ci === -1 ? 0 : Math.min(ci + 1, 4))
        : (ci === -1 ? 4 : Math.max(ci - 1, 0));
    onLikert(question.id, next + 1);
  };

  return (
    <div
      ref={cardRef}
      tabIndex={-1}
      role="group"
      aria-label={`${stepLabel}: ${question.text}`}
      className="p-4 bg-gray-50 rounded-lg focus-visible:ring-2 focus-visible:ring-vp-blue focus-visible:ring-offset-2"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-600 font-medium">
          {question.subArea}
        </span>
      </div>
      <p className="text-[14.5px] leading-relaxed mb-1.5">{question.text}</p>
      <QuestionExample questionId={question.id} />

      {question.answerType === "yn" ? (
        <div
          className="flex gap-2"
          role="radiogroup"
          aria-label={question.text}
          onKeyDown={handleYnKeyDown}
        >
          <button
            role="radio"
            aria-checked={answer === 100}
            tabIndex={answer === 100 || answer === undefined ? 0 : -1}
            onClick={() => onYn(question.id, "yes")}
            className={`flex-1 h-[44px] ${btnBase} ${
              answer === 100
                ? "bg-vp-navy text-white border-vp-navy"
                : "bg-white border-gray-200 text-gray-700 hover:border-vp-blue"
            }`}
          >
            네
          </button>
          <button
            role="radio"
            aria-checked={answer === 0}
            tabIndex={answer === 0 ? 0 : -1}
            onClick={() => onYn(question.id, "no")}
            className={`flex-1 h-[44px] ${btnBase} ${
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
          <div
            className="flex gap-1.5"
            role="radiogroup"
            aria-label={question.text}
            onKeyDown={handleLikertKeyDown}
          >
            {[1, 2, 3, 4, 5].map((v) => {
              const score = [0, 25, 50, 75, 100][v - 1];
              return (
                <button
                  key={v}
                  role="radio"
                  aria-checked={answer === score}
                  tabIndex={answer === score || (answer === undefined && v === 1) ? 0 : -1}
                  aria-label={LIKERT_OPTION_LABEL[v]}
                  onClick={() => onLikert(question.id, v)}
                  className={`flex-1 h-[48px] ${btnBase} ${
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
            <span>{LIKERT_ANCHOR_LOW}</span>
            <span>{LIKERT_ANCHOR_HIGH}</span>
          </div>
        </div>
      )}
    </div>
  );
}
