/**
 * POST /api/diagnostic-result
 *
 * 진단 완료 시 클라이언트가 익명 결과를 보낸다 → Supabase에 저장.
 * 개인식별정보(이름/연락처)는 받지 않는다. 집계·벤치마크 용도.
 */

import { NextResponse } from "next/server";
import { insertDiagnosticResult, type DiagnosticResultRow } from "@/lib/supabase";

export const runtime = "nodejs";

interface IncomingBody {
  stageScores?: { stageId: number; score: number }[];
  overallScore?: number;
  weakestStage?: number;
  resultType?: string;
  hasGap?: boolean;
  deepStageId?: number | null;
  deepAnswers?: Record<string, number> | null;
  utm?: Record<string, string> | null;
}

export async function POST(request: Request) {
  let body: IncomingBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  // 최소 검증 — 6단계 점수 배열과 핵심 필드가 있어야 한다.
  if (
    !Array.isArray(body.stageScores) ||
    body.stageScores.length === 0 ||
    typeof body.overallScore !== "number" ||
    typeof body.weakestStage !== "number"
  ) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const row: DiagnosticResultRow = {
    stage_scores: body.stageScores,
    overall_score: Math.round(body.overallScore),
    weakest_stage: body.weakestStage,
    result_type: body.resultType ?? "none",
    has_gap: body.hasGap ?? false,
    deep_stage_id: body.deepStageId ?? null,
    deep_answers: body.deepAnswers ?? null,
    utm: body.utm ?? null,
    completed: true,
  };

  try {
    await insertDiagnosticResult(row);
    return NextResponse.json({ ok: true });
  } catch (err) {
    // 저장 실패가 사용자 경험을 막지 않도록 200이 아닌 502로만 알림 (클라는 fire-and-forget)
    console.error("[diagnostic-result] insert failed:", err);
    return NextResponse.json({ error: "store failed" }, { status: 502 });
  }
}
