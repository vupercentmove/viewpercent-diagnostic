import { NextResponse } from "next/server";
import { getStats } from "@/lib/supabase-admin";

export const runtime = "nodejs";

export async function GET() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY 미설정" }, { status: 503 });
  }
  try {
    const stats = await getStats();
    return NextResponse.json(stats);
  } catch (err) {
    console.error("[admin/stats]", err);
    return NextResponse.json({ error: "통계 조회 실패" }, { status: 502 });
  }
}
