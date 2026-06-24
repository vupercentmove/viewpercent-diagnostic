"use client";

import { useState } from "react";
import { STAGES } from "@/lib/stage-meta";

interface RadarChartProps {
  stageScores: { stageId: number; score: number }[];
}

/** 의존성 0 순수 SVG 레이더 차트 (recharts 제거 — 번들 ~91KB 절감). */
export default function RadarChart({ stageScores }: RadarChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const data = stageScores.map(({ stageId, score }) => ({
    name: STAGES.find((s) => s.id === stageId)?.name ?? "",
    score,
  }));

  const n = data.length || 6;
  const cx = 180;
  const cy = 140;
  const R = 86;

  const point = (i: number, radius: number): [number, number] => {
    const angle = (-90 + (i * 360) / n) * (Math.PI / 180);
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
  };
  const toPoly = (radius: (i: number) => number) =>
    data.map((_, i) => point(i, radius(i)).join(",")).join(" ");

  const gridLevels = [0.25, 0.5, 0.75, 1];
  // score=0이면 최소 2px 반지름 보장 — 퇴화 폴리곤/점 겹침 방지
  const safeR = (i: number) => Math.max((R * data[i].score) / 100, 2);
  const dataPoly = toPoly(safeR);

  const labelFor = (
    i: number
  ): {
    x: number;
    y: number;
    anchor: "start" | "end" | "middle";
    baseline: "hanging" | "auto" | "middle";
  } => {
    const [x, y] = point(i, R + 16);
    const cos = Math.cos((-90 + (i * 360) / n) * (Math.PI / 180));
    const sin = Math.sin((-90 + (i * 360) / n) * (Math.PI / 180));
    const anchor = cos > 0.3 ? "start" : cos < -0.3 ? "end" : "middle";
    const baseline = sin > 0.3 ? "hanging" : sin < -0.3 ? "auto" : "middle";
    return { x, y, anchor, baseline };
  };

  // 툴팁 위치 — 점 기준 위/아래, SVG viewBox(360×290) 내 클램프
  const tooltipPos = (i: number): { tx: number; ty: number } => {
    const [px, py] = point(i, safeR(i));
    const W = 84;
    const H = 32;
    const tx = Math.max(4, Math.min(px - W / 2, 360 - W - 4));
    const rawTy = py < cy ? py + 14 : py - H - 10;
    const ty = Math.max(4, Math.min(rawTy, 290 - H - 4));
    return { tx, ty };
  };

  const ariaLabel =
    "6단계 레이더 차트. " +
    data.map((d) => `${d.name} ${d.score}점`).join(", ");

  return (
    <div className="bg-white border border-gray-100 rounded-[14px] p-5 mb-4 animate-fade-in-up">
      <h3 className="text-[13px] font-medium text-gray-500 mb-2">
        6단계 레이더 차트
      </h3>
      <svg
        viewBox="0 0 360 290"
        className="w-full h-auto"
        role="img"
        aria-label={ariaLabel}
        onClick={() => setActiveIndex(null)}
      >
        {/* 그리드 */}
        {gridLevels.map((lv) => (
          <polygon
            key={lv}
            points={toPoly(() => R * lv)}
            fill="none"
            stroke="#e5e7eb"
            strokeDasharray="3 3"
            strokeWidth={1}
          />
        ))}

        {/* 축선 */}
        {data.map((_, i) => {
          const [x, y] = point(i, R);
          return (
            <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#eef0f3" strokeWidth={1} />
          );
        })}

        {/* 데이터 영역 */}
        <polygon
          points={dataPoly}
          fill="#2A5AE6"
          fillOpacity={0.15}
          stroke="#2A5AE6"
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {/* 축 라벨 */}
        {data.map((d, i) => {
          const { x, y, anchor, baseline } = labelFor(i);
          return (
            <text
              key={i}
              x={x}
              y={y}
              fontSize={11}
              fill="#6b7280"
              textAnchor={anchor}
              dominantBaseline={baseline}
            >
              {d.name}
            </text>
          );
        })}

        {/* 데이터 점 + 히트 영역 (hover/tap → 툴팁) */}
        {data.map((d, i) => {
          const [x, y] = point(i, safeR(i));
          const active = activeIndex === i;
          return (
            <g
              key={i}
              onMouseEnter={() => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(null)}
              onClick={(e) => {
                e.stopPropagation();
                setActiveIndex(active ? null : i);
              }}
              style={{ cursor: "pointer" }}
            >
              {/* 터치 44px 히트 영역 */}
              <circle cx={x} cy={y} r={16} fill="transparent" />
              <circle
                cx={x}
                cy={y}
                r={active ? 6 : 4}
                fill={active ? "#1e40af" : "#2A5AE6"}
                stroke="#fff"
                strokeWidth={2}
              />
            </g>
          );
        })}

        {/* 툴팁 (활성 점 위에 렌더 — z-order 최상위) */}
        {activeIndex !== null && (() => {
          const d = data[activeIndex];
          const { tx, ty } = tooltipPos(activeIndex);
          return (
            <g style={{ pointerEvents: "none" }}>
              <rect
                x={tx} y={ty}
                width={84} height={32}
                rx={6}
                fill="#1e293b"
                fillOpacity={0.93}
              />
              <text
                x={tx + 42} y={ty + 11}
                textAnchor="middle"
                fontSize={9.5}
                fill="#94a3b8"
              >
                {d.name}
              </text>
              <text
                x={tx + 42} y={ty + 24}
                textAnchor="middle"
                fontSize={12}
                fontWeight={700}
                fill="white"
              >
                {d.score}점
              </text>
            </g>
          );
        })()}
      </svg>
      <p className="text-[11px] text-gray-400 text-center mt-2">
        점을 탭하면 점수를 볼 수 있어요
      </p>
    </div>
  );
}
