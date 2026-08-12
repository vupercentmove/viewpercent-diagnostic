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
  /** "quick"(기본) | "full"(정밀). 구행(마이그레이션 전) 데이터는 undefined일 수 있음. */
  diagnostic_mode?: string;
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
    `${baseUrl()}/diagnostic_results?select=id,created_at,overall_score,weakest_stage,result_type,has_gap,deep_stage_id,stage_scores,utm,diagnostic_mode&completed=eq.true&order=created_at.desc&limit=${limit}`,
    { headers: adminHeaders() }
  );
  if (!res.ok) throw new Error(`Supabase 조회 실패: ${res.status}`);
  return res.json();
}

