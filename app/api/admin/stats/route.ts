import { NextResponse } from "next/server";

export const runtime = "nodejs";

// base 벤치마크 필터 (Task 8 — 2026-08-12 해소 확인):
// 이 라우트는 집계를 전부 Supabase Postgres RPC `get_diagnostic_stats()`에
// 위임한다. 함수 본문은 Supabase 프로젝트(vupercent)에만 있고 이 저장소에는
// 소스가 없다. 한때 정밀(full) 모드가 base 분포를 오염시킬 우려가 있었으나,
// 2026-08-12 라이브 정의를 직접 조회해 세 집계(총계·stageDistribution·
// avgStageScores) 모두 `completed = true AND diagnostic_mode <> 'full'`
// 필터가 들어있고 실행 결과도 quick만 집계됨(quick 12·full 4 중 total=12)을
// 확인했다. 주의: 이 필터는 diagnostic_mode가 NULL인 행을 제외한다 —
// 현재 데이터엔 NULL이 없지만, 저장 경로가 mode를 안 싣게 바뀌면 깨진다.
// RPC를 다시 수정할 일이 있으면 결과를 이 주석에 갱신할 것.
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
