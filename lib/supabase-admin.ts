/**
 * Supabase 관리자 전용 헬퍼 — service_role 키 사용.
 * 반드시 Route Handler(서버)에서만 호출할 것.
 */

interface StageScore {
  stageId: number;
  score: number;
}

export interface DiagnosticRow {
  id: string;
  created_at: string;
  overall_score: number;
  weakest_stage: number;
  result_type: string;
  has_gap: boolean;
  deep_stage_id: number | null;
  stage_scores: StageScore[];
  utm: Record<string, string> | null;
}

function adminHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.");
  return {
    "Content-Type": "application/json",
    apikey: key,
    Authorization: `Bearer ${key}`,
  };
}

function baseUrl() {
  const url = process.env.SUPABASE_URL;
  if (!url) throw new Error("SUPABASE_URL이 설정되지 않았습니다.");
  return `${url}/rest/v1`;
}

/** 전체 완료 건수 */
export async function getTotalCount(): Promise<number> {
  const res = await fetch(
    `${baseUrl()}/diagnostic_results?select=*&completed=eq.true`,
    { headers: { ...adminHeaders(), Prefer: "count=exact", "Range-Unit": "items" } }
  );
  const range = res.headers.get("Content-Range") ?? "0/0";
  return parseInt(range.split("/")[1] ?? "0", 10);
}

/** 최근 결과 목록 */
export async function getRecentResults(limit = 50): Promise<DiagnosticRow[]> {
  const res = await fetch(
    `${baseUrl()}/diagnostic_results?select=id,created_at,overall_score,weakest_stage,result_type,has_gap,deep_stage_id,stage_scores,utm&completed=eq.true&order=created_at.desc&limit=${limit}`,
    { headers: adminHeaders() }
  );
  if (!res.ok) throw new Error(`Supabase 조회 실패: ${res.status}`);
  return res.json();
}

/** 통계 집계 (서버에서 계산) */
export async function getStats() {
  const rows = await getRecentResults(1000);

  const total = rows.length;
  if (total === 0) {
    return { total: 0, avgScore: 0, deepRate: 0, stageDistribution: [], avgStageScores: [] };
  }

  const avgScore = Math.round(rows.reduce((s, r) => s + r.overall_score, 0) / total);
  const deepCount = rows.filter((r) => r.deep_stage_id != null).length;
  const deepRate = Math.round((deepCount / total) * 100);

  // 최약 Stage 분포
  const dist: Record<number, number> = {};
  rows.forEach((r) => {
    dist[r.weakest_stage] = (dist[r.weakest_stage] ?? 0) + 1;
  });
  const stageDistribution = Object.entries(dist)
    .map(([stageId, count]) => ({ stageId: Number(stageId), count }))
    .sort((a, b) => b.count - a.count);

  // Stage별 평균 점수
  const stageSums: Record<number, { sum: number; count: number }> = {};
  rows.forEach((r) => {
    (r.stage_scores ?? []).forEach(({ stageId, score }) => {
      if (!stageSums[stageId]) stageSums[stageId] = { sum: 0, count: 0 };
      stageSums[stageId].sum += score;
      stageSums[stageId].count += 1;
    });
  });
  const avgStageScores = Object.entries(stageSums)
    .map(([stageId, { sum, count }]) => ({
      stageId: Number(stageId),
      avg: Math.round(sum / count),
    }))
    .sort((a, b) => a.stageId - b.stageId);

  return { total, avgScore, deepRate, stageDistribution, avgStageScores };
}
