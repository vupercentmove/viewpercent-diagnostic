import { NextResponse } from "next/server";
import { getRecentResults } from "@/lib/supabase-admin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY 미설정" }, { status: 503 });
  }
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200);
  try {
    const results = await getRecentResults(limit);
    return NextResponse.json(results);
  } catch (err) {
    console.error("[admin/results]", err);
    return NextResponse.json({ error: "결과 조회 실패" }, { status: 502 });
  }
}
