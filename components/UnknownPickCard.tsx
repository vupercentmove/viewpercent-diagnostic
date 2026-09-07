"use client";

import { useState } from "react";
import { STAGES } from "@/lib/stage-meta";
import { submitUnknownPick } from "@/lib/feedback-client";
import { trackUnknownPick } from "@/lib/analytics";

interface UnknownPickCardProps {
  /** 저장 API가 발급한 결과 행 핸들. 없으면 그리지 않는다. */
  resultCode: string | null;
  /** collectUnknownAreas(answers) 결과 — 정밀 진단에서 모름으로 답한 세부 영역 */
  unknownAreas: { stageId: number; subAreas: string[] }[];
}

/**
 * 모름을 결측이 아니라 대화로 다룬다.
 *
 * 배경(2026-08-25): 실고객이 유일하게 감정적으로 반응한 문항의 답이 '모름'이었다.
 * 도구는 그걸 점수에서 빼고 '탐색 필요' 칩으로 끝냈다 — 가장 정보가 많은 답을
 * 결측으로 다룬 셈이다. 여기서는 모름으로 답한 것들을 다시 보여주고 하나를 고르게
 * 한다. 고른 것이 그 사람의 관심 방향이고, 상담은 거기서 시작하면 된다.
 *
 * 고를 게 둘 이상일 때만 그린다. 하나뿐이면 "고른다"는 행위 자체가 성립하지 않는다.
 */
export default function UnknownPickCard({ resultCode, unknownAreas }: UnknownPickCardProps) {
  const [picked, setPicked] = useState<string | null>(null);

  const items = unknownAreas.flatMap((u) => {
    const stage = STAGES.find((s) => s.id === u.stageId);
    return u.subAreas.map((sub) => ({ stageId: u.stageId, stageName: stage?.name ?? "", sub }));
  });

  if (!resultCode || items.length < 2) return null;

  const pick = (item: { stageId: number; sub: string }) => {
    setPicked(item.sub);
    submitUnknownPick(resultCode, item.sub);
    trackUnknownPick(item.stageId);
  };

  if (picked) {
    return (
      <section className="bg-white border border-gray-100 rounded-[14px] px-5 py-5 mb-4 animate-fade-in-up">
        <p className="text-[13.5px] leading-relaxed text-gray-800">
          ‘{picked}’부터 보는 걸로 남겨뒀어요.
        </p>
      </section>
    );
  }

  return (
    <section className="bg-white border border-gray-100 rounded-[14px] px-5 py-5 mb-4 animate-fade-in-up">
      <p className="text-[11px] tracking-wide text-vp-warn uppercase font-medium mb-2">
        아직 안 해본 것
      </p>
      <p className="text-[15px] font-medium leading-snug text-vp-navy mb-1">
        이 {items.length}가지는 아직 안 해보셨다고 하셨어요.
      </p>
      <p className="text-[13px] text-gray-600 mb-3">하나만 고른다면, 어느 걸 먼저 해보고 싶으세요?</p>

      <div className="flex flex-wrap gap-2" role="group" aria-label="먼저 해보고 싶은 것">
        {items.map((it) => (
          <button
            key={`${it.stageId}-${it.sub}`}
            type="button"
            onClick={() => pick(it)}
            className="text-[13px] px-3 py-1.5 rounded-full border bg-white text-gray-700 border-gray-200 hover:border-vp-blue transition-colors"
          >
            {it.sub}
            <span className="ml-1.5 text-[11px] text-gray-400">{it.stageName}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
