"use client";

import { useState } from "react";
import { STAGES } from "@/lib/stage-meta";
import {
  STAGE_TOOL_MAP,
  VERIFIED_TOOLS,
  FIT_META,
  CITATION_WARNINGS,
} from "@/lib/consulting-tools";
import ToolStageDiagram from "@/components/admin/ToolStageDiagram";

const REPORT_URL = "https://claude.ai/code/artifact/d21f8a0d-fdec-40ee-8f71-a1e4aa83568f";

/** 작은 섹션 라벨 (검증 스택 / STAGE별 적용 / 인용 금지) */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10.5px] font-bold tracking-wider text-gray-400 uppercase mt-5 mb-2.5">
      {children}
    </p>
  );
}

/**
 * 관리자 전용 — Stage별 컨설팅 도구 참고.
 * 고객용 결과 화면(ActionCards)과 분리된 내부 세일즈·미팅 근거.
 */
export default function ConsultingToolReference() {
  const [open, setOpen] = useState(false);

  // 도구별 커버 단계 계산 (STAGE_TOOL_MAP에서 파생 — 데이터와 항상 동기화)
  const coverage = new Map<string, Set<number>>();
  for (const [sid, recs] of Object.entries(STAGE_TOOL_MAP)) {
    for (const rec of recs) {
      if (!rec.toolKey) continue;
      const set = coverage.get(rec.toolKey) ?? new Set<number>();
      set.add(Number(sid));
      coverage.set(rec.toolKey, set);
    }
  }
  const matrixRows = Object.entries(VERIFIED_TOOLS)
    .map(([key, tool]) => ({
      key,
      tool,
      fit: FIT_META[tool.fit],
      stageSet: coverage.get(key) ?? new Set<number>(),
    }))
    .filter((r) => r.stageSet.size > 0)
    .sort((a, b) => {
      const aStages = Array.from(a.stageSet);
      const bStages = Array.from(b.stageSet);
      const am = Math.min(...aStages);
      const bm = Math.min(...bStages);
      return am - bm || Math.max(...aStages) - Math.max(...bStages);
    });

  return (
    <div className="bg-white rounded-xl border border-gray-100 mb-4 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-gray-50/60 transition-colors"
      >
        <div>
          <h2 className="text-[15px] font-bold text-gray-800 flex items-center gap-1.5 flex-wrap">
            컨설팅 도구 참고
            <span className="text-[10px] font-semibold text-vp-warn bg-vp-warn-bg px-1.5 py-0.5 rounded">
              내부용 · 고객 전달 금지
            </span>
          </h2>
          <p className="text-[11.5px] text-gray-400 mt-1">
            딥리서치 3표 검증 통과 · 규모별 판단 근거 · 2026-07-19
          </p>
        </div>
        <span className="text-gray-300 text-xl shrink-0 ml-3 leading-none">
          {open ? "−" : "+"}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-5 border-t border-gray-100">
          {/* 규모 조건 범례 */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-3.5 text-[11px] text-gray-500">
            <span className="text-gray-400">규모 조건</span>
            {Object.values(FIT_META).map((f) => (
              <span key={f.label} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${f.dot}`} />
                {f.label}
              </span>
            ))}
          </div>

          {/* 커버리지 맵 — 도구 × Shopping Flow 6단계 (검증 스택 상세 흡수) */}
          <SectionLabel>커버리지 맵 · 도구 × 6단계</SectionLabel>
          <div className="rounded-lg border border-gray-100 overflow-x-auto">
            <div className="min-w-[340px] px-3 py-3">
              {/* 단계 헤더 */}
              <div
                className="grid items-center gap-x-1 mb-2.5"
                style={{ gridTemplateColumns: "56px repeat(6, minmax(0,1fr)) auto" }}
              >
                <span />
                {STAGES.map((s) => (
                  <span
                    key={s.id}
                    title={s.name}
                    className="text-[10px] text-gray-400 text-center font-semibold"
                  >
                    S{s.id}
                  </span>
                ))}
                <span />
              </div>
              {/* 도구별 커버리지 행 */}
              <div className="flex flex-col gap-2.5">
                {matrixRows.map(({ key, tool, fit, stageSet }) => (
                  <div key={key}>
                    <div
                      className="grid items-center gap-x-1"
                      style={{ gridTemplateColumns: "56px repeat(6, minmax(0,1fr)) auto" }}
                    >
                      <a
                        href={tool.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[12px] font-semibold text-vp-blue hover:underline truncate"
                      >
                        {tool.name}
                      </a>
                      {STAGES.map((s) => (
                        <span key={s.id} className="flex justify-center">
                          {stageSet.has(s.id) ? (
                            <span
                              className={`w-2.5 h-2.5 rounded-full ${fit.dot}`}
                              title={fit.label}
                            />
                          ) : (
                            <span className="w-1 h-1 rounded-full bg-gray-200" />
                          )}
                        </span>
                      ))}
                      <span className="text-[10.5px] text-gray-400 tabular-nums text-right pl-2 whitespace-nowrap">
                        {tool.license} · {tool.stars}
                      </span>
                    </div>
                    <p className="text-[10.5px] text-gray-400 mt-0.5 pl-[56px]">
                      {tool.note}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 커버리지 다이어그램 — Rekit식 노드-링크 (같은 데이터의 흐름 뷰) */}
          <SectionLabel>커버리지 다이어그램</SectionLabel>
          <div className="rounded-lg border border-gray-100 px-2 py-3">
            <ToolStageDiagram showLegend={false} />
          </div>

          {/* Stage별 적용 — 스캔용 목록 (메타 없음) */}
          <SectionLabel>Stage별 적용</SectionLabel>
          <div className="flex flex-col gap-3.5">
            {STAGES.map((stage) => {
              const recs = STAGE_TOOL_MAP[stage.id];
              if (!recs?.length) return null;
              return (
                <div key={stage.id}>
                  <p className="text-[12px] font-bold text-gray-700 pb-1.5 mb-1.5 border-b border-gray-100">
                    <span className="text-gray-400 font-semibold">S{stage.id}</span>{" "}
                    {stage.name}
                  </p>
                  <ul className="flex flex-col gap-2">
                    {recs.map((rec, i) => {
                      const tool = rec.toolKey ? VERIFIED_TOOLS[rec.toolKey] : null;
                      const fit = tool ? FIT_META[tool.fit] : null;
                      return (
                        <li key={i} className="flex items-start gap-2 text-[13px] leading-relaxed">
                          {tool && fit ? (
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 mt-[6px] ${fit.dot}`}
                              title={fit.label}
                            />
                          ) : (
                            <span className="text-[9px] font-bold text-gray-400 bg-gray-100 rounded px-1 py-0.5 shrink-0 mt-[3px]">
                              전략
                            </span>
                          )}
                          <span className="text-gray-600">
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
                              <span className="font-semibold text-gray-800">
                                {rec.strategy}
                              </span>
                            )}
                            <span className="text-gray-300"> — </span>
                            {rec.why}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>

          {/* 인용 금지·공백 */}
          <SectionLabel>인용 금지 · 공백</SectionLabel>
          <div className="rounded-lg border border-vp-risk/15 bg-vp-risk-bg/40 px-3.5 py-3">
            <p className="text-[11px] text-gray-500 mb-2">
              세일즈 자료에 넣지 말 것
            </p>
            <ul className="flex flex-col gap-1.5">
              {CITATION_WARNINGS.map((w, i) => (
                <li key={i} className="text-[12px] text-gray-600 leading-relaxed">
                  {w}
                </li>
              ))}
            </ul>
          </div>

          <a
            href={REPORT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-4 text-[12px] font-medium text-vp-blue hover:underline"
          >
            전체 검증 리포트 열기 →
          </a>
        </div>
      )}
    </div>
  );
}
