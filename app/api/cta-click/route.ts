/**
 * POST /api/cta-click
 *
 * 카톡 CTA 클릭을 결과 행에 표시한다 → diagnostic_results.cta_clicked = true.
 *
 * 클라이언트는 keepalive fire-and-forget으로 부르고 응답을 보지 않는다. 그래도
 * 상태 코드는 정직하게 낸다 — 어드민 CTA 전환율이 다시 0%로 보이면 Vercel 로그의
 * 502가 첫 단서다. (2026-08-20 조사 때는 로그도 없이 "그냥 0"이라 원인 추적에
 * 반나절이 걸렸다.)
 */

import { NextResponse } from "next/server";
import { markCtaClicked } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { code?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const code = body.code;
  if (typeof code !== "string" || code.length === 0 || code.length > 64) {
    return NextResponse.json({ error: "missing code" }, { status: 400 });
  }

  try {
    await markCtaClicked(code);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[cta-click] rpc failed:", err);
    return NextResponse.json({ error: "store failed" }, { status: 502 });
  }
}
