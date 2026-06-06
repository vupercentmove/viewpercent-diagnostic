/**
 * Supabase 진단 결과 저장 헬퍼 (서버사이드 전용)
 *
 * @supabase/supabase-js 의존성 없이 PostgREST REST 엔드포인트에 직접 fetch.
 * 익명 insert-only — 테이블 RLS가 INSERT만 허용하므로 anon key로 읽기 불가.
 * 반드시 Route Handler(서버)에서만 호출할 것 (env가 NEXT_PUBLIC 아님).
 */

export interface DiagnosticResultRow {
  stage_scores: { stageId: number; score: number }[];
  overall_score: number;
  weakest_stage: number;
  result_type: string;
  has_gap: boolean;
  deep_stage_id?: number | null;
  deep_answers?: Record<string, number> | null;
  utm?: Record<string, string> | null;
  completed?: boolean;
}

/** 진단 결과 1건을 diagnostic_results 테이블에 insert. 실패 시 throw. */
export async function insertDiagnosticResult(
  row: DiagnosticResultRow
): Promise<void> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_ANON_KEY 환경변수가 없습니다.");
  }

  const res = await fetch(`${url}/rest/v1/diagnostic_results`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: "return=minimal",
    },
    body: JSON.stringify(row),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Supabase insert 실패 (${res.status}): ${detail}`);
  }
}
