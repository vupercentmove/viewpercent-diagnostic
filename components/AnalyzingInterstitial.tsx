"use client";

import { useEffect, useRef, useState } from "react";
import { trackAnalyzingShown, trackAnalyzingSkipped } from "@/lib/analytics";
import {
  buildSteps,
  STEP_MS,
  REDUCED_MOTION_MS,
} from "@/lib/analyzing-steps";

/**
 * 분석중 인터스티셜 (Labor Illusion)
 *
 * 실제 산출값(hasGap/hasCase) 기반의 정직한 3단계 문구만 노출한다.
 * 가짜 수치·진행%·가짜 카운터는 절대 쓰지 않는다.
 * 순수 로직(buildSteps/타이밍 상수)은 `lib/analyzing-steps`에 분리 — 테스트는 거기서.
 */

interface AnalyzingInterstitialProps {
  worstStageName: string;
  hasGap: boolean;
  hasCase: boolean;
  /** worst stage id — 트래킹용 (선택) */
  worstStageId?: number;
  onDone: () => void;
}

export default function AnalyzingInterstitial({
  worstStageName,
  hasGap,
  hasCase,
  worstStageId = 0,
  onDone,
}: AnalyzingInterstitialProps) {
  const steps = buildSteps(hasGap, hasCase);
  const [activeIndex, setActiveIndex] = useState(0);

  // onDone 1회 가드 (StrictMode 이중 마운트 방어)
  const doneRef = useRef(false);
  const callDone = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  };

  useEffect(() => {
    trackAnalyzingShown(worstStageId, hasGap, hasCase);
    // 마운트 1회만 — 의도적으로 deps 비움
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    // 탭이 백그라운드면 애니메이션 의미 없음 → 즉시 완료
    if (typeof document !== "undefined" && document.hidden) {
      trackAnalyzingSkipped("tab_hidden");
      callDone();
      return;
    }

    // 모션 최소화 선호 시 단일 짧은 페이드 후 완료
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      trackAnalyzingSkipped("reduced_motion");
      timeouts.push(setTimeout(callDone, REDUCED_MOTION_MS));
      return () => timeouts.forEach(clearTimeout);
    }

    // setTimeout 체인으로 단계 인덱스 증가
    let elapsed = 0;
    for (let i = 1; i < steps.length; i++) {
      elapsed += STEP_MS[i - 1];
      timeouts.push(
        setTimeout(() => setActiveIndex(i), elapsed)
      );
    }
    // 마지막 단계 표시 후 onDone
    elapsed += STEP_MS[steps.length - 1];
    timeouts.push(setTimeout(callDone, elapsed));

    return () => timeouts.forEach(clearTimeout);
    // 마운트 1회만 — steps/hasGap 등은 마운트 시점에 고정
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-[430px] mx-auto animate-fade-in-up">
        {worstStageName && (
          <p className="text-[12.5px] text-gray-400 text-center mb-5">
            {worstStageName} 중심으로 살펴보는 중
          </p>
        )}

        <ul className="flex flex-col gap-3.5">
          {steps.map((step, i) => {
            const isDone = i < activeIndex;
            const isActive = i === activeIndex;
            return (
              <li
                key={i}
                className="flex items-center gap-2.5 text-[14px] leading-relaxed"
              >
                <span
                  className={
                    "w-4 shrink-0 text-center " +
                    (isDone
                      ? "text-gray-400"
                      : isActive
                      ? "text-vp-blue animate-pulse"
                      : "text-gray-300")
                  }
                  aria-hidden="true"
                >
                  {isDone ? "✓" : "•"}
                </span>
                <span
                  className={
                    isDone
                      ? "text-gray-400"
                      : isActive
                      ? "text-vp-blue font-medium animate-pulse"
                      : "text-gray-300"
                  }
                >
                  {step}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
