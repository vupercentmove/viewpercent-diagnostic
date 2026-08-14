import { NextResponse } from "next/server";

export const runtime = "nodejs";

// base 벤치마크 필터 (Task 8 — 2026-08-12 정리 완료):
// 이 라우트는 집계를 전부 Supabase Postgres RPC `get_diagnostic_stats()`에
// 위임한다. **함수 정의는 이제 `supabase/migrations/`에 있다** — 최신은
// `20260812081047_fix_diagnostic_stats_base_row_filter.sql`. 여기서 다시
// 추측하지 말고 그 파일을 읽을 것.
//
// 그동안 이 주석과 실제 RPC가 계속 어긋났던 이유는 RPC 소스가 저장소 밖에만
// 있었기 때문이다(2026-07-04·07-19 적용분이 파일로 남지 않았음). 그 둘도
// 라이브 statements에서 복원해 함께 커밋했다. RPC를 고칠 때는 반드시
// 마이그레이션 파일을 같이 남긴다.
//
// base 분포 정의: `completed = true AND diagnostic_mode IS DISTINCT FROM 'full'
// AND deep_stage_id IS NULL`. 마지막 조건이 핵심이다 — 심화 완료자는 base 행과
// 심화 행을 각각 남기므로 빼먹으면 이중집계된다(2026-08-12 수정 전 total이
// 실제 9인데 12로 잡혔고 deepRate가 56%가 아니라 33%로 나왔다).
// deepRate만 분자에 심화 행이 필요하므로 base가 아닌 scoped를 쓴다.
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

    // AI 코멘트 폴백률은 별도 RPC. 이쪽이 실패해도 진단 통계는 그대로 보여준다.
    let aiComment = null;
    try {
      const aiRes = await fetch(`${url}/rest/v1/rpc/get_ai_comment_stats`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
        body: "{}",
      });
      if (aiRes.ok) aiComment = await aiRes.json();
    } catch (err) {
      console.error("[admin/stats] ai comment stats:", err);
    }

    return NextResponse.json({
      ...(stats ?? { total: 0, avgScore: 0, deepRate: 0, ctaRate: 0, stageDistribution: [], avgStageScores: [] }),
      aiComment,
    });
  } catch (err) {
    console.error("[admin/stats]", err);
    return NextResponse.json({ error: "통계 조회 실패" }, { status: 502 });
  }
}
