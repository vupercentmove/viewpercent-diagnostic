/**
 * POST /api/result-feedback
 *
 * 결과 화면 반응 두 가지를 같은 결과 행에 기록한다.
 *   - reactionStage (+ reactionNote): "이 중 어디가 제일 의외였어요?"
 *   - unknownPick: 정밀 진단에서 모름으로 답한 것 중 "먼저 해보고 싶은 것"
 *
 * 넘긴 필드만 갱신된다(RPC 쪽 coalesce). 두 카드가 따로 보내도 서로 덮어쓰지 않는다.
 * 길이 상한은 여기서 400으로 막고, DB 함수(record_result_feedback)에서도 한 번 더
 * 자른다 — DB가 마지막 방어선이다.
 */

import { NextResponse } from "next/server";
import { recordResultFeedback } from "@/lib/supabase";

export const runtime = "nodejs";

const NOTE_MAX = 200;
const PICK_MAX = 80;

interface IncomingBody {
  code?: unknown;
  reactionStage?: unknown;
  reactionNote?: unknown;
  unknownPick?: unknown;
}

function bad(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

export async function POST(request: Request) {
  let body: IncomingBody;
  try {
    body = await request.json();
  } catch {
    return bad("invalid json");
  }

  const code = body.code;
  if (typeof code !== "string" || code.length === 0 || code.length > 64) {
    return bad("missing code");
  }

  // reactionStage: 1~6 정수만 (STAGES id 범위)
  let reactionStage: number | undefined;
  if (body.reactionStage !== undefined) {
    const s = body.reactionStage;
    if (typeof s !== "number" || !Number.isInteger(s) || s < 1 || s > 6) {
      return bad("reactionStage out of range");
    }
    reactionStage = s;
  }

  // reactionNote: 공백뿐이면 없는 것으로 친다
  let reactionNote: string | undefined;
  if (body.reactionNote !== undefined) {
    if (typeof body.reactionNote !== "string") return bad("reactionNote must be string");
    const t = body.reactionNote.trim();
    if (t.length > NOTE_MAX) return bad("reactionNote too long");
    reactionNote = t.length > 0 ? t : undefined;
  }

  let unknownPick: string | undefined;
  if (body.unknownPick !== undefined) {
    if (typeof body.unknownPick !== "string") return bad("unknownPick must be string");
    const t = body.unknownPick.trim();
    if (t.length > PICK_MAX) return bad("unknownPick too long");
    unknownPick = t.length > 0 ? t : undefined;
  }

  if (reactionStage === undefined && reactionNote === undefined && unknownPick === undefined) {
    return bad("nothing to record");
  }

  try {
    await recordResultFeedback({ code, reactionStage, reactionNote, unknownPick });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[result-feedback] rpc failed:", err);
    return NextResponse.json({ error: "store failed" }, { status: 502 });
  }
}
