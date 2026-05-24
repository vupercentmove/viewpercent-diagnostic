"use client";

import {
  Radar,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { STAGES } from "@/lib/stage-meta";
import { getTag } from "@/lib/scoring";

interface RadarChartProps {
  stageScores: { stageId: number; score: number }[];
}

export default function RadarChart({ stageScores }: RadarChartProps) {
  const data = stageScores.map(({ stageId, score }) => {
    const stage = STAGES.find((s) => s.id === stageId)!;
    return {
      stage: stage.name,
      score,
      fullMark: 100,
    };
  });

  return (
    <div className="bg-white border border-gray-100 rounded-[14px] p-5 mb-4 animate-fade-in-up">
      <h3 className="text-[13px] font-medium text-gray-500 mb-4">
        6단계 레이더 차트
      </h3>
      <div className="w-full h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsRadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
            <PolarGrid stroke="#e5e7eb" strokeDasharray="3 3" />
            <PolarAngleAxis
              dataKey="stage"
              tick={{ fontSize: 11, fill: "#6b7280" }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              tickCount={5}
            />
            <Tooltip
              contentStyle={{
                background: "#06091D",
                border: "none",
                borderRadius: "8px",
                fontSize: "12px",
                color: "#fff",
              }}
              formatter={(value: number) => [`${value}점`, "점수"]}
            />
            <Radar
              name="내 브랜드"
              dataKey="score"
              stroke="#2A5AE6"
              fill="#2A5AE6"
              fillOpacity={0.15}
              strokeWidth={2}
              dot={{
                r: 4,
                fill: "#2A5AE6",
                stroke: "#fff",
                strokeWidth: 2,
              }}
              activeDot={{
                r: 6,
                fill: "#2A5AE6",
                stroke: "#fff",
                strokeWidth: 2,
              }}
            />
          </RechartsRadarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[11px] text-gray-400 text-center mt-2">
        안쪽으로 움푹 들어간 곳이 매출이 새는 지점이에요
      </p>
    </div>
  );
}
