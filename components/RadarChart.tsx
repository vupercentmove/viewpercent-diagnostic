"use client";

import { STAGES } from "@/lib/stage-meta";

interface RadarChartProps {
  stageScores: { stageId: number; score: number }[];
}

/** 의존성 0 순수 SVG 레이더 차트 (recharts 제거 — 번들 ~91KB 절감). */
export default function RadarChart({ stageScores }: RadarChartProps) {
  const data = stageScores.map(({ stageId, score }) => ({
    name: STAGES.find((s) => s.id === stageId)?.name ?? "",
    score,
  }));

  const n = data.length || 6;
  const cx = 180;
  const cy = 140;
  const R = 86;

  // i번째 축의 각도(상단 12시부터 시계방향) 좌표
  const point = (i: number, radius: number): [number, number] => {
    const angle = (-90 + (i * 360) / n) * (Math.PI / 180);
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
  };
  const toPoly = (radius: (i: number) => number) =>
    data.map((_, i) => point(i, radius(i)).join(",")).join(" ");

  const gridLevels = [0.25, 0.5, 0.75, 1];
  const dataPoly = toPoly((i) => (R * data[i].score) / 100);

  // 축 라벨 위치/정렬 (각도에 따라 좌/중/우)
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

        {/* 데이터 점 */}
        {data.map((d, i) => {
          const [x, y] = point(i, (R * d.score) / 100);
          return (
            <circle key={i} cx={x} cy={y} r={4} fill="#2A5AE6" stroke="#fff" strokeWidth={2} />
          );
        })}

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
      </svg>
      <p className="text-[11px] text-gray-400 text-center mt-2">
        안쪽으로 움푹 들어간 곳이 매출이 새는 지점이에요
      </p>
    </div>
  );
}
