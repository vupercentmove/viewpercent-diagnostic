"use client";
import { useState, useRef } from "react";
import { STAGES } from "@/lib/stage-meta";
import { getDeepQuestionProgress, getDeepQuestionsByStage, type DeepQuestion } from "@/lib/deep-questions";
import { likertToScore, type Answers } from "@/lib/scoring";
import { UNKNOWN_ANSWER, getFullAnswerNextStep, nextUnknownStreak, shouldFallback } from "@/lib/quiz-fallback";
import { getExplainer, VISION_QUESTION, ICP_QUESTIONS, STAGE_COACH_LINE, ICP_COACH_LINE, type IcpSignals, getQuestionInsight } from "@/lib/full-deep-content";
import { trackFullDeepStageComplete, trackFullDeepUnknownFallback, trackVisionAnswer, trackEncouragement, trackQuizAnswer, trackQuestionInsightToggle } from "@/lib/analytics";

const STAGE_IDS = STAGES.map((s) => s.id);
type Mode = "quiz" | "explainer" | "icp" | "vision" | "coach";

export default function FullDeepQuizStage({ onComplete, variant }: { onComplete: (r: { answers: Answers; vision: string | null; icpSignals: IcpSignals }) => void; variant: "A" | "B" }) {
  const [answers, setAnswers] = useState<Answers>({});
  const [icp, setIcp] = useState<IcpSignals>({});
  const [stageIdx, setStageIdx] = useState(0);
  const [qCursor, setQCursor] = useState(0);
  const [streak, setStreak] = useState(0);
  const [icpCursor, setIcpCursor] = useState(0);
  const [mode, setMode] = useState<Mode>("quiz");
  const [showEncouragement, setShowEncouragement] = useState(false);
  const [coachLine, setCoachLine] = useState<string | null>(null);
  const [reviewMode, setReviewMode] = useState(false);
  const [insightOpen, setInsightOpen] = useState(false);
  const encouragedRef = useRef(false);
  // coach 인터스티셜의 "다음" 클릭 시 이어갈 실제 전환 로직. 코치 카드가 끼어들어도
  // 아래 전환(격려 로직 포함)은 정확히 한 번만 실행되도록 콜백으로 보관한다.
  const coachNextRef = useRef<(() => void) | null>(null);

  const stageId = STAGE_IDS[stageIdx];
  const stage = STAGES[stageIdx];
  const questions = getDeepQuestionsByStage(stageId);
  const q = questions[qCursor];
  const total = STAGE_IDS.length;
  const step = stageIdx + 1;

  /** Stage 전환 본체(기존 goNextStage 로직 그대로) — 50% 격려는 여기서 정확히 1회만 실행된다. */
  const commitStageTransition = () => {
    const next = stageIdx + 1;
    if (next < total) {
      // 50% 격려 1회 (절반 단계 진입 시)
      if (!encouragedRef.current && next >= Math.floor(total / 2)) {
        encouragedRef.current = true; setShowEncouragement(true); trackEncouragement("full");
      }
      setStageIdx(next); setQCursor(0); setStreak(0); setMode("quiz"); setReviewMode(false); setInsightOpen(false);
    } else {
      setMode("icp"); setReviewMode(false); setInsightOpen(false);
    }
  };

  const goNextStage = () => {
    trackFullDeepStageComplete(stageId);
    const line = STAGE_COACH_LINE[stageId];
    if (variant === "A" && line) {
      // pivotal 단계(2, 6) 완료 직후 — 코치 한 줄을 먼저 보여주고, "다음"에서 실제 전환.
      coachNextRef.current = commitStageTransition;
      setCoachLine(line);
      setMode("coach");
    } else {
      // variant B(또는 코치 라인 없는 단계) — 기존 동작과 완전히 동일하게 즉시 전환.
      commitStageTransition();
    }
  };

  const advance = () => {
    setReviewMode(false); setInsightOpen(false);
    (qCursor + 1 < questions.length ? setQCursor((c) => c + 1) : goNextStage());
  };

  const record = (value: number) => {
    setAnswers((prev) => ({ ...prev, [q.id]: value }));
    const s = nextUnknownStreak(streak, value); setStreak(s);
    const progress = getDeepQuestionProgress(q.id);
    trackQuizAnswer(q.id, stageId, { ...progress, context: "deep" });

    const nextStep = getFullAnswerNextStep(variant, shouldFallback(s));
    if (nextStep === "fallback") {
      trackFullDeepUnknownFallback(stageId);
      setMode("explainer");
      return;
    }
    if (nextStep === "review") {
      setReviewMode(true);
      setInsightOpen(false);
      return;
    }
    advance();
  };

  // ── ICP 2문항 ──
  if (mode === "icp") {
    const iq = ICP_QUESTIONS[icpCursor];
    const pick = (patch: IcpSignals) => {
      setIcp((prev) => ({ ...prev, ...patch }));
      if (icpCursor + 1 < ICP_QUESTIONS.length) {
        setIcpCursor((c) => c + 1);
        return;
      }
      // ICP 2문항 모두 응답 완료
      if (variant === "A") {
        coachNextRef.current = () => setMode("vision");
        setCoachLine(ICP_COACH_LINE);
        setMode("coach");
      } else {
        // variant B — 기존 동작과 완전히 동일하게 즉시 vision으로.
        setMode("vision");
      }
    };
    return (
      <Card>
        <span className="text-[11px] text-gray-400">거의 다 왔어요 · 마무리 질문</span>
        <p className="text-[15px] leading-relaxed font-medium my-3">{iq.text}</p>
        {iq.kind === "select" ? (
          <div className="flex flex-col gap-2">
            {iq.options.map((o) => (
              <button key={o.value} onClick={() => pick({ adSpendBand: o.value })} className="w-full py-3 px-4 rounded-lg border border-gray-200 text-[13.5px] text-left text-gray-700 hover:border-vp-blue">{o.label}</button>
            ))}
          </div>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => pick({ contentOngoing: true })} className="flex-1 h-[44px] rounded-lg border border-gray-200 text-[13px] hover:border-vp-blue">네</button>
            <button onClick={() => pick({ contentOngoing: false })} className="flex-1 h-[44px] rounded-lg border border-gray-200 text-[13px] hover:border-vp-blue">아니요</button>
          </div>
        )}
      </Card>
    );
  }

  // ── 비전 문항 ──
  if (mode === "vision") {
    return (
      <Card>
        <span className="text-[11px] text-gray-400">마지막</span>
        <p className="text-[15px] leading-relaxed font-medium my-3">{VISION_QUESTION.text}</p>
        <div className="flex flex-col gap-2">
          {VISION_QUESTION.options.map((opt) => (
            <button key={opt} onClick={() => { trackVisionAnswer(); onComplete({ answers, vision: opt, icpSignals: icp }); }} className="w-full py-3 px-4 rounded-lg border border-gray-200 text-[13.5px] text-left text-gray-700 hover:border-vp-blue">{opt}</button>
          ))}
        </div>
      </Card>
    );
  }

  // ── 코치 한 줄 (variant A, pivotal 단계/ICP 완료 직후 1회) ──
  if (mode === "coach") {
    return (
      <Card>
        <div className="p-4 rounded-lg bg-vp-blue/5">
          <p className="text-[10px] font-medium text-vp-blue mb-2">잠깐만요</p>
          <p className="text-[14px] leading-relaxed">{coachLine}</p>
        </div>
        <button
          onClick={() => {
            const next = coachNextRef.current;
            coachNextRef.current = null;
            setCoachLine(null);
            next?.();
          }}
          className="w-full mt-5 py-3 rounded-lg bg-vp-blue text-white text-sm font-medium hover:bg-vp-blue-hover"
        >
          다음
        </button>
      </Card>
    );
  }

  // ── 설명 카드(모름 fallback) ──
  if (mode === "explainer") {
    const ex = getExplainer(stageId);
    return (
      <Card>
        <Header stage={stage} step={step} total={total} />
        <div className="mt-4 p-4 rounded-lg bg-vp-blue/5">
          <p className="text-[10px] font-medium text-vp-blue mb-2">먼저 짚고 갈게요</p>
          <p className="text-[14px] leading-relaxed mb-2">{ex.why}</p>
          <p className="text-[13px] text-gray-500 leading-relaxed">잘 되고 있을 때 모습은 이래요 — {ex.goodLooksLike}</p>
        </div>
        <button onClick={goNextStage} className="w-full mt-5 py-3 rounded-lg bg-vp-blue text-white text-sm font-medium hover:bg-vp-blue-hover">다음 단계로</button>
      </Card>
    );
  }

  // ── 심화 문항 ──
  const insight = getQuestionInsight(q.id);
  return (
    <Card>
      <Header stage={stage} step={step} total={total} />
      <div className="h-1 bg-gray-100 rounded-full overflow-hidden my-4" role="progressbar" aria-valuenow={step} aria-valuemin={0} aria-valuemax={total} aria-valuetext={`${total}단계 중 ${step}단계`}>
        <div className="h-full bg-vp-blue" style={{ width: `${(step / total) * 100}%` }} />
      </div>
      {showEncouragement && (
        <div className="mb-4 px-3.5 py-2.5 rounded-lg bg-vp-blue/5 text-vp-blue text-[12.5px]">절반 왔어요. 여기까지 온 것만으로 이미 상위예요.</div>
      )}
      <div className="p-4 bg-gray-50 rounded-lg">
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-600 font-medium">{q.subArea}</span>
        <p className="text-[14.5px] leading-relaxed my-3">{q.text}</p>
        {!reviewMode ? (
          <>
            {q.answerType === "yn" ? (
              <div className="flex gap-2">
                <button onClick={() => record(100)} className="flex-1 h-[44px] rounded-lg border border-gray-200 text-[13px] hover:border-vp-blue">네</button>
                <button onClick={() => record(0)} className="flex-1 h-[44px] rounded-lg border border-gray-200 text-[13px] hover:border-vp-blue">아니요</button>
              </div>
            ) : (
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((v) => (
                  <button key={v} aria-label={`${v}점`} onClick={() => record(likertToScore(v))} className="flex-1 h-[48px] rounded-lg border border-gray-200 text-[13px] hover:border-vp-blue">{v}</button>
                ))}
              </div>
            )}
            {/* 모름 옵션 — 풀모드 UI 전용 (deep-questions 데이터에 없음) */}
            <button onClick={() => record(UNKNOWN_ANSWER)} className="w-full mt-2.5 h-[40px] rounded-lg border border-dashed border-gray-300 text-[12.5px] text-gray-500 hover:border-vp-blue hover:text-vp-blue">잘 모르겠어요 · 아직 안 해봤어요</button>
          </>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white p-3">
            <p className="text-[12px] text-gray-500">응답을 저장했어요. 궁금하면 아래에서 이 질문의 의도를 열어볼 수 있어요.</p>
            {variant === "A" && insight ? (
              <>
                <button
                  onClick={() => {
                    setInsightOpen((prev) => !prev);
                    trackQuestionInsightToggle(q.id, variant);
                  }}
                  className="mt-3 text-[12.5px] font-medium text-vp-blue"
                  aria-expanded={insightOpen}
                >
                  {insightOpen ? "의도 접기" : "왜 이걸 묻나요?"}
                </button>
                {insightOpen ? <p className="mt-2 text-[13px] leading-relaxed text-gray-700">{insight}</p> : null}
              </>
            ) : null}
            <button onClick={advance} className="w-full mt-3 h-[42px] rounded-lg bg-vp-blue text-white text-sm font-medium hover:bg-vp-blue-hover">다음 질문</button>
          </div>
        )}
      </div>
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-white border border-gray-100 rounded-[14px] p-6 animate-fade-in-up">{children}</div>;
}
function Header({ stage, step, total }: { stage: { label: string; name: string }; step: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-vp-blue/10 text-vp-blue">정밀 진단</span>
      <span className="text-[11px] text-gray-400">{stage.label} — {stage.name}</span>
      <span className="ml-auto text-[11px] text-gray-400">STAGE {step}/{total}</span>
    </div>
  );
}
