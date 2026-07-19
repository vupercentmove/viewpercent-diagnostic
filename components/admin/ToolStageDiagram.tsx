"use client";

import { STAGES } from "@/lib/stage-meta";
import { STAGE_TOOL_MAP, VERIFIED_TOOLS, FIT_META } from "@/lib/consulting-tools";

/** 규모 조건 → SVG 색상값 (vp 토큰과 동일) */
const FIT_COLOR: Record<string, string> = {
  "cloud-ok": "#0F6E56",
  "self-server": "#854F0B",
  "top-seller": "#A32D2D",
};

/**
 * Rekit Studio식 노드-링크 다이어그램.
 * 왼쪽 = 검증 도구 노드, 오른쪽 = Shopping Flow 6단계 노드, 곡선 = 커버리지.
 * 색 = 규모 조건(초록 소규모 / 주황 자체서버 / 빨강 상위셀러).
 */
export default function ToolStageDiagram({ showLegend = true }: { showLegend?: boolean }) {
  // 도구별 커버 단계 (STAGE_TOOL_MAP 파생)
  const coverage = new Map<string, Set<number>>();
  for (const [sid, recs] of Object.entries(STAGE_TOOL_MAP)) {
    for (const rec of recs) {
      if (!rec.toolKey) continue;
      const s = coverage.get(rec.toolKey) ?? new Set<number>();
      s.add(Number(sid));
      coverage.set(rec.toolKey, s);
    }
  }
  const tools = Object.entries(VERIFIED_TOOLS)
    .map(([key, t]) => ({ key, t, stages: coverage.get(key) ?? new Set<number>() }))
    .filter((x) => x.stages.size > 0)
    .sort((a, b) => {
      const as = Array.from(a.stages);
      const bs = Array.from(b.stages);
      return Math.min(...as) - Math.min(...bs) || Math.max(...as) - Math.max(...bs);
    });

  // 좌표계
  const W = 720;
  const H = 356;
  const toolCX = 116;
  const toolW = 140;
  const toolH = 30;
  const stageCX = 560;
  const stageR = 16;
  const toolTop = 46;
  const toolGap = tools.length > 1 ? (H - 92) / (tools.length - 1) : 0;
  const stageTop = 40;
  const stageGap = (H - 80) / (STAGES.length - 1);

  const toolY = (i: number) => toolTop + i * toolGap;
  const stageY = (j: number) => stageTop + j * stageGap;
  const stageIndex = new Map(STAGES.map((s, idx) => [s.id, idx]));

  const x1 = toolCX + toolW / 2; // 도구 노드 오른쪽
  const x2 = stageCX - stageR; // 단계 노드 왼쪽
  const midX = (x1 + x2) / 2;

  return (
    <div>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          role="img"
          aria-label="검증 도구와 Shopping Flow 6단계 커버리지 다이어그램"
          style={{ display: "block", minWidth: 500 }}
        >
          {/* 축 라벨 */}
          <text x={toolCX} y={22} textAnchor="middle" fontSize="11" fontWeight="700" fill="#7A7E93" letterSpacing="0.04em">
            검증 도구
          </text>
          <text x={stageCX} y={22} textAnchor="middle" fontSize="11" fontWeight="700" fill="#7A7E93" letterSpacing="0.04em">
            SHOPPING FLOW
          </text>

          {/* 연결선 (곡선) — 노드 뒤에 렌더 */}
          {tools.map((tool, i) => {
            const color = FIT_COLOR[tool.t.fit];
            return Array.from(tool.stages).map((sid) => {
              const j = stageIndex.get(sid);
              if (j === undefined) return null;
              const y1 = toolY(i);
              const y2 = stageY(j);
              return (
                <path
                  key={`${tool.key}-${sid}`}
                  d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                  fill="none"
                  stroke={color}
                  strokeWidth={1.6}
                  strokeOpacity={0.4}
                />
              );
            });
          })}

          {/* 단계 노드 (오른쪽) */}
          {STAGES.map((s, j) => (
            <g key={s.id}>
              <circle cx={stageCX} cy={stageY(j)} r={stageR} fill="#EEF2FF" stroke="#2A5AE6" strokeWidth={1.2} />
              <text x={stageCX} y={stageY(j)} textAnchor="middle" dominantBaseline="central" fontSize="10.5" fontWeight="700" fill="#2A5AE6">
                S{s.id}
              </text>
              <text x={stageCX + stageR + 7} y={stageY(j)} dominantBaseline="central" fontSize="10.5" fill="#565A70">
                {s.name}
              </text>
            </g>
          ))}

          {/* 도구 노드 (왼쪽) */}
          {tools.map((tool, i) => {
            const color = FIT_COLOR[tool.t.fit];
            const left = toolCX - toolW / 2;
            return (
              <g key={tool.key}>
                <rect x={left} y={toolY(i) - toolH / 2} width={toolW} height={toolH} rx={9} fill="#FFFFFF" stroke={color} strokeWidth={1.4} />
                <circle cx={left + 16} cy={toolY(i)} r={4} fill={color} />
                <text x={left + 28} y={toolY(i)} dominantBaseline="central" fontSize="12" fontWeight="600" fill="#06091D">
                  {tool.t.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* 범례 (독립 사용 시에만 — 패널 내에서는 상단 범례가 대체) */}
      {showLegend && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-1 text-[11px] text-gray-500">
          <span className="text-gray-400">규모 조건</span>
          {Object.values(FIT_META).map((f) => (
            <span key={f.label} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${f.dot}`} />
              {f.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
