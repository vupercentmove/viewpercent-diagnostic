"use client";

import { useState } from "react";
import { STAGES } from "@/lib/stage-meta";
import {
  STAGE_TOOL_MAP,
  VERIFIED_TOOLS,
  FIT_META,
  CITATION_WARNINGS,
} from "@/lib/consulting-tools";

/**
 * 관리자 전용 — Stage별 컨설팅 도구 참고.
 * 고객용 결과 화면(ActionCards)과 분리된 내부 세일즈·미팅 근거.
 */
export default function ConsultingToolReference() {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-gray-100 mb-4 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 py-3 flex items-center justify-between text-left"
      >
        <div>
          <h2 className="text-sm font-semibold text-gray-700">
            컨설팅 도구 참고{" "}
            <span className="text-[10px] font-medium text-vp-warn bg-vp-warn-bg px-1.5 py-0.5 rounded ml-1">
              내부용 · 고객 전달 금지
            </span>
          </h2>
          <p className="text-[11px] text-gray-400 mt-0.5">
            딥리서치 3표 검증 통과 도구 5종 (2026-07-19) · 규모별 판단 근거
          </p>
        </div>
        <span className="text-gray-300 text-lg shrink-0 ml-3">
          {open ? "−" : "+"}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-gray-50">
          {/* 규모 조건 범례 */}
          <div className="flex flex-wrap items-center gap-2 py-3 text-[10px] text-gray-400">
            <span>규모 조건:</span>
            {Object.values(FIT_META).map((f) => (
              <span key={f.label} className={`px-1.5 py-0.5 rounded font-medium ${f.color}`}>
                {f.label}
              </span>
            ))}
          </div>

          {/* Stage별 매핑 */}
          <div className="flex flex-col gap-3">
            {STAGES.map((stage) => {
              const recs = STAGE_TOOL_MAP[stage.id];
              if (!recs?.length) return null;
              return (
                <div key={stage.id} className="border border-gray-100 rounded-lg p-3 bg-gray-50/50">
                  <p className="text-[11px] font-semibold text-gray-600 mb-2">
                    S{stage.id} {stage.name}
                  </p>
                  <ul className="flex flex-col gap-2">
                    {recs.map((rec, i) => {
                      const tool = rec.toolKey ? VERIFIED_TOOLS[rec.toolKey] : null;
                      const fit = tool ? FIT_META[tool.fit] : null;
                      return (
                        <li key={i} className="text-[12px] leading-relaxed">
                          <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                            {tool ? (
                              <a
                                href={tool.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-semibold text-vp-blue hover:underline"
                              >
                                {tool.name}
                              </a>
                            ) : (
                              <span className="font-semibold text-gray-700">
                                {rec.strategy}
                              </span>
                            )}
                            {fit && (
                              <span className={`text-[9px] px-1 py-0.5 rounded font-medium ${fit.color}`}>
                                {fit.label}
                              </span>
                            )}
                          </div>
                          <p className="text-gray-500">{rec.why}</p>
                          {tool && (
                            <p className="text-[10px] text-gray-400 mt-0.5">{tool.meta}</p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>

          {/* 인용 금지·공백 */}
          <div className="mt-4 bg-vp-risk-bg/40 border border-vp-risk/10 rounded-lg p-3">
            <p className="text-[11px] font-semibold text-vp-risk mb-1.5">
              인용 금지 · 공백 (세일즈 자료에 넣지 말 것)
            </p>
            <ul className="flex flex-col gap-1">
              {CITATION_WARNINGS.map((w, i) => (
                <li key={i} className="text-[11px] text-gray-600 leading-relaxed">
                  {w}
                </li>
              ))}
            </ul>
          </div>

          <a
            href="https://claude.ai/code/artifact/d21f8a0d-fdec-40ee-8f71-a1e4aa83568f"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-3 text-[11px] text-vp-blue hover:underline"
          >
            전체 검증 리포트 열기 →
          </a>
        </div>
      )}
    </div>
  );
}
