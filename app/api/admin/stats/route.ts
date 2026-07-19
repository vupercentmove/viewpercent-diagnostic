import { NextResponse } from "next/server";

export const runtime = "nodejs";

// ⚠️ base 벤치마크 필터 관련 알림 (Task 8):
// 이 라우트는 집계를 전부 Supabase Postgres RPC `get_diagnostic_stats()`에
// 위임한다. 그 함수 본문은 Supabase 프로젝트에 직접 생성되어 있고 이 저장소에는
// 소스가 없다(supabase/migrations 등 어디에도 커밋된 적 없음 — 전체 레포·git
// 로그 검색 확인). 정밀(full) 모드가 base 분포를 오염시키지 않으려면 그 RPC
// 내부의 `deep_stage_id IS NULL` 필터에도 `AND diagnostic_mode <> 'full'`을
// 반영해야 하지만, 하드 세이프티 규칙상 라이브 DB에 접속해 RPC 정의를 읽거나
// 수정할 수 없어 여기서는 코드로 고칠 수 없다. 운영자가 Supabase에서 RPC 정의를
// 확인 후 직접 패치해야 한다 (맥미니 집계 파이프라인 핸드오프와 동일 성격).
// 코드로 고칠 수 있는 경로(lib/supabase-admin.ts의 getStats())는 이번 커밋에서
// 반영했다.
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
