import { NextResponse } from "next/server";

export const runtime = "nodejs";

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
