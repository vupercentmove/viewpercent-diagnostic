"use client";

import { useState } from "react";
import type { Answers } from "@/lib/scoring";
import { calcAllStageScores, calcOverallScore, getWorstStage, detectGap } from "@/lib/scoring";
import { trackAiCommentRequested, trackAiCommentError } from "@/lib/analytics";

interface Props {
  answers: Answers;
}

export default function AiCommentCard({ answers }: Props) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [comment, setComment] = useState("");

  const handleRequest = async () => {
    setState("loading");
    trackAiCommentRequested("quick");
    try {
      const stageScores = calcAllStageScores(answers);
      const overallScore = calcOverallScore(answers);
      const worstStage = getWorstStage(stageScores);
      const gap = detectGap(answers);

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stageScores,
          overallScore,
          weakestStage: worstStage.stageId,
          hasGap: gap?.hasGap ?? false,
          perceivedWorst: gap?.perceivedWorst,
          actualWorst: gap?.actualWorst,
        }),
      });

      if (!res.ok) {
        // 서버가 실패 이유를 body에 싣는다(no_key / api_error).
        // 파싱이 안 되면 상태 코드로 대체한다.
        const reason = await res
          .json()
          .then((body) => (typeof body?.reason === "string" ? body.reason : `http_${res.status}`))
          .catch(() => `http_${res.status}`);
        trackAiCommentError("quick", reason);
        setState("error");
        return;
      }

      const { comment: text } = await res.json();
      setComment(text);
      setState("done");
    } catch {
      trackAiCommentError("quick", "network");
      setState("error");
    }
  };

  if (state === "idle") {
    return (
      <section className="border border-vp-blue/20 rounded-[14px] p-5 mb-4 animate-fade-in-up">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">✨</span>
          <h3 className="text-[14px] font-semibold text-gray-900">AI가 본 우리 브랜드</h3>
        </div>
        <p className="text-[12.5px] text-gray-500 leading-relaxed mb-3">
          진단 결과를 AI가 종합해서 가장 중요한 한 가지를 짚어드려요.
        </p>
        <button
          onClick={handleRequest}
          className="bg-vp-navy hover:bg-vp-navy/80 text-white text-[13px] font-medium px-4 py-2 rounded-lg transition-colors"
        >
          AI 분석 보기
        </button>
      </section>
    );
  }

  if (state === "loading") {
    return (
      <section className="border border-vp-blue/20 rounded-[14px] p-5 mb-4 animate-fade-in-up">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">✨</span>
          <h3 className="text-[14px] font-semibold text-gray-900">AI가 본 우리 브랜드</h3>
        </div>
        <div className="flex items-center gap-2 text-[13px] text-gray-400">
          <div className="w-4 h-4 border-2 border-vp-blue/30 border-t-vp-blue rounded-full animate-spin" />
          분석 중...
        </div>
      </section>
    );
  }

  if (state === "error") {
    return (
      <section className="border border-gray-200 rounded-[14px] p-5 mb-4 animate-fade-in-up">
        <p className="text-[13px] text-gray-400">
          AI 분석을 불러오지 못했어요.{" "}
          <button onClick={handleRequest} className="text-vp-blue underline">
            다시 시도
          </button>
        </p>
      </section>
    );
  }

  return (
    <section className="bg-vp-navy rounded-[14px] p-5 mb-4 animate-fade-in-up">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">✨</span>
        <h3 className="text-[14px] font-semibold text-white">AI가 본 우리 브랜드</h3>
      </div>
      <p className="text-[14px] text-white/90 leading-relaxed">{comment}</p>
    </section>
  );
}
