import { NextResponse } from "next/server";

export const runtime = "nodejs";

// base 벤치마크 필터 (Task 8, 2026-08-12 Supabase에 직접 패치 반영):
// 이 라우트는 집계를 전부 Supabase Postgres RPC `get_diagnostic_stats()`에
// 위임한다. 그 함수 본문은 Supabase 프로젝트에 직접 생성되어 있고 이 저장소에는
// 소스가 없다(supabase/migrations 등 어디에도 커밋된 적 없음). base 집계
// (외곽 WHERE + stageDistribution + avgStageScores)에는
// `deep_stage_id IS NULL AND diagnostic_mode <> 'full'`이 반영되어 있어
// 심화 완료자 이중집계와 정밀(full) 모드 오염을 모두 막는다.
// lib/supabase-admin.ts의 getStats()와 동일 기준.
export async function GET() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "Supabase 환경변수 미설정" }, { status: 503 });
  }

  try {
    const res = await fetch(`${url}/rest/v1/rpc/get_diagnostic_stats`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      body: "{}",
    });
    if (!res.ok) throw new Error(`RPC 오류: ${res.status}`);
    const stats = await res.json();
    return NextResponse.json(stats ?? { total: 0, avgScore: 0, deepRate: 0, ctaRate: 0, stageDistribution: [], avgStageScores: [] });
  } catch (err) {
    console.error("[admin/stats]", err);
    return NextResponse.json({ error: "통계 조회 실패" }, { status: 502 });
  }
}
