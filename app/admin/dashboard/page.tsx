"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const STAGE_NAMES: Record<number, string> = {
  1: "욕구·검색·방문",
  2: "정보탐색·비교",
  3: "구매결정",
  4: "장바구니·결제",
  5: "구매완료·기다림",
  6: "배송·수령완료",
};

interface Stats {
  total: number;
  avgScore: number;
  deepRate: number;
  stageDistribution: { stageId: number; count: number }[];
  avgStageScores: { stageId: number; avg: number }[];
}

interface Result {
  id: string;
  created_at: string;
  overall_score: number;
  weakest_stage: number;
  has_gap: boolean;
  deep_stage_id: number | null;
}

function ScoreBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.round((value / max) * 100);
  const color = value >= 70 ? "bg-green-400" : value >= 40 ? "bg-yellow-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-8 text-right">{value}점</span>
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/stats").then((r) => r.json()),
      fetch("/api/admin/results?limit=30").then((r) => r.json()),
    ])
      .then(([s, r]) => {
        if (s.error) throw new Error(s.error);
        setStats(s);
        setResults(Array.isArray(r) ? r : []);
      })
      .catch((e) => setError(e.message ?? "데이터 로드 실패"))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.push("/admin/login");
  };

  return (
    <div className="max-w-3xl mx-auto p-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-gray-900">뷰퍼센트 어드민</h1>
          <p className="text-xs text-gray-400">브랜드 진단 현황</p>
        </div>
        <div className="flex items-center gap-3">
          <a href="/" className="text-xs text-vp-blue hover:underline">← 진단 앱</a>
          <button onClick={handleLogout} className="text-xs text-gray-400 hover:text-gray-600">
            로그아웃
          </button>
        </div>
      </div>

      {loading && (
        <p className="text-center text-gray-400 py-12">불러오는 중...</p>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600 mb-4">
          {error.includes("SERVICE_ROLE_KEY")
            ? "⚠️ .env.local에 SUPABASE_SERVICE_ROLE_KEY를 추가해야 합니다."
            : error}
        </div>
      )}

      {stats && (
        <>
          {/* 상단 지표 */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: "총 완료", value: `${stats.total}건` },
              { label: "평균 점수", value: `${stats.avgScore}점` },
              { label: "심화 진단율", value: `${stats.deepRate}%` },
            ].map((m) => (
              <div key={m.label} className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{m.value}</p>
                <p className="text-xs text-gray-400 mt-1">{m.label}</p>
              </div>
            ))}
          </div>

          {/* Stage별 평균 점수 */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Stage별 평균 점수</h2>
            <div className="flex flex-col gap-2">
              {stats.avgStageScores.map(({ stageId, avg }) => (
                <div key={stageId}>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>S{stageId} {STAGE_NAMES[stageId]}</span>
                  </div>
                  <ScoreBar value={avg} />
                </div>
              ))}
            </div>
          </div>

          {/* 최약 Stage 분포 */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">최약 Stage 분포 (사용자 기준)</h2>
            <div className="flex flex-col gap-1.5">
              {stats.stageDistribution.map(({ stageId, count }) => (
                <div key={stageId} className="flex items-center gap-2 text-xs text-gray-600">
                  <span className="w-24 shrink-0">S{stageId} {STAGE_NAMES[stageId]}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-vp-blue/60 rounded-full"
                      style={{ width: `${Math.round((count / stats.total) * 100)}%` }}
                    />
                  </div>
                  <span className="w-12 text-right">{count}명 ({Math.round((count / stats.total) * 100)}%)</span>
                </div>
              ))}
            </div>
          </div>

          {/* 최근 결과 목록 */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50">
              <h2 className="text-sm font-semibold text-gray-700">최근 진단 결과</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {results.map((r) => (
                <div key={r.id} className="px-4 py-3 flex items-center gap-3 text-xs">
                  <span className="text-gray-400 w-28 shrink-0">
                    {new Date(r.created_at).toLocaleDateString("ko-KR", {
                      month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                  <span className="font-medium text-gray-800">{r.overall_score}점</span>
                  <span className="text-gray-500">최약 S{r.weakest_stage}</span>
                  {r.has_gap && (
                    <span className="bg-vp-warn-bg text-vp-warn text-[10px] px-1.5 py-0.5 rounded">착각패턴</span>
                  )}
                  {r.deep_stage_id != null && (
                    <span className="bg-vp-blue/10 text-vp-blue text-[10px] px-1.5 py-0.5 rounded">심화완료</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
