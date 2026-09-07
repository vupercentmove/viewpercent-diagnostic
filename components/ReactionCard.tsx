"use client";

import { useState } from "react";
import { STAGES } from "@/lib/stage-meta";
import { submitReaction } from "@/lib/feedback-client";
import { trackReactionStage, trackReactionNote } from "@/lib/analytics";

interface ReactionCardProps {
  /**
   * 저장 API가 발급한 결과 행 핸들. 없으면 카드를 그리지 않는다 —
   * 공유 링크로 온 사람(진단한 당사자가 아닐 수 있음)과 새로고침 복원 화면이 여기 해당.
   */
  resultCode: string | null;
}

const NOTE_MAX = 200;

/**
 * 결과 화면의 마지막을 판결이 아니라 질문으로 끝낸다.
 *
 * 배경(2026-08-25): 실고객 완주 6명 중 말을 건 사람이 1명. 결과 화면의 유일한
 * 출구가 상담 신청이라 "이건 몰랐네" 한 마디를 둘 곳이 없었다. 그 1명이 반응한
 * 것도 결과가 아니라 문항(= 질문)이었다. 탭 한 번이면 끝나는 질문을 CTA 앞에 둔다.
 *
 * 단계를 고르는 순간 바로 보낸다. 한 줄은 안 쓰고 닫는 사람이 대부분이라, 한 줄까지
 * 기다렸다 보내면 탭 자체를 잃는다. 한 줄이 오면 같은 행에 덧붙인다.
 */
export default function ReactionCard({ resultCode }: ReactionCardProps) {
  const [picked, setPicked] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);

  if (!resultCode) return null;

  const pick = (stageId: number) => {
    setPicked(stageId);
    submitReaction(resultCode, stageId);
    trackReactionStage(stageId);
  };

  const finish = () => {
    if (picked === null) return;
    const t = note.trim();
    if (t) {
      submitReaction(resultCode, picked, t);
      trackReactionNote(picked);
    }
    setDone(true);
  };

  if (done) {
    return (
      <section className="bg-white border border-gray-100 rounded-[14px] px-5 py-5 mb-4 animate-fade-in-up">
        <p className="text-[13.5px] leading-relaxed text-gray-800">남겨주셔서 고맙습니다.</p>
        <p className="text-[12.5px] text-gray-500 mt-1">결과에 함께 남겨뒀어요.</p>
      </section>
    );
  }

  return (
    <section className="bg-white border border-gray-100 rounded-[14px] px-5 py-5 mb-4 animate-fade-in-up">
      <p className="text-[11px] tracking-wide text-vp-blue uppercase font-medium mb-2">
        한 가지만 여쭐게요
      </p>
      <p className="text-[15px] font-medium leading-snug text-vp-navy mb-3">
        이 중 어디가 제일 의외였어요?
      </p>

      <div className="flex flex-wrap gap-2" role="group" aria-label="의외였던 단계">
        {STAGES.map((s) => {
          const on = picked === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => pick(s.id)}
              aria-pressed={on}
              className={`text-[13px] px-3 py-1.5 rounded-full border transition-colors ${
                on
                  ? "bg-vp-navy text-white border-vp-navy"
                  : "bg-white text-gray-700 border-gray-200 hover:border-vp-blue"
              }`}
            >
              {s.name}
            </button>
          );
        })}
      </div>

      {picked !== null && (
        <div className="mt-4 animate-fade-in-up">
          <label htmlFor="reaction-note" className="block text-[12.5px] text-gray-500 mb-1.5">
            한 줄 남기셔도 돼요 (선택)
          </label>
          <textarea
            id="reaction-note"
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX))}
            rows={2}
            maxLength={NOTE_MAX}
            placeholder="예: 여기는 생각도 못 해봤어요"
            className="w-full text-[13.5px] leading-relaxed border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-vp-blue/40"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-[11px] text-gray-400">
              {note.length}/{NOTE_MAX}
            </span>
            <button
              type="button"
              onClick={finish}
              className="text-[13px] font-medium text-white bg-vp-blue hover:bg-vp-blue-hover px-4 py-2 rounded-lg transition-colors"
            >
              {note.trim() ? "남기기" : "이대로 마치기"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
