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
//
// 2026-08-12 (지표 정직화 브랜치 병합분):
// · getStats()는 아무도 호출하지 않는 죽은 코드여서 삭제했다. 이 라우트가
//   쓰는 집계는 전적으로 RPC다.
// · RPC가 반환하는 ctaRate는 화면에서 더 이상 읽지 않는다 — diagnostic_results의
//   cta_clicked를 true로 바꾸는 경로가 앱 코드에 없어 구조적으로 항상 0이었다
//   (16건 전수 false 확인). 실제 클릭은 Vercel Analytics의 cta_kakao_click에만
//   쌓인다. RPC 자체는 레포 밖 자산이라 수정하지 않았다.
// · 운영 DB의 배선 실증 행(utm->>'ref' = 'wiring-test', id 7021ebb6)을
//   completed = false로 바꿨다. 행은 보존했다. getRecentResults가
//   completed=eq.true만 가져오므로 그 행이 화면에 안 오는 진짜 이유가 이것이고,
//   lib/inflow-source.ts의 WIRING_TEST_REF 제외는 이중 안전장치다.
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
      ...(stats ?? { total: 0, avgScore: 0, deepRate: 0, stageDistribution: [], avgStageScores: [] }),
      aiComment,
    });
  } catch (err) {
    console.error("[admin/stats]", err);
    return NextResponse.json({ error: "통계 조회 실패" }, { status: 502 });
  }
}
