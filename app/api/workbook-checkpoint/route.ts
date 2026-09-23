import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { insertWorkbookCheckpointConversion } from "@/lib/supabase";
import { hasOnlyKeys, isPlainRecord } from "@/lib/api-validation";
import { readBoundedJson } from "@/lib/http-body";
import { allowRequest } from "@/lib/rate-limit";

export const runtime = "nodejs";

const POLICY = { namespace: "workbook-checkpoint", limit: 20, windowMs: 60_000 } as const;

export async function POST(request: Request) {
  const parsed = await readBoundedJson(request, 1_024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  if (!isPlainRecord(parsed.value) || !hasOnlyKeys(parsed.value, ["stageId"])) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  const stageId = parsed.value.stageId;
  if (stageId !== 3 && stageId !== 5) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  if (!(await allowRequest(request, POLICY))) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
  }

  try {
    await insertWorkbookCheckpointConversion({ event_id: randomUUID(), stage_id: stageId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[workbook-checkpoint] insert failed:", err);
    return NextResponse.json({ error: "store failed" }, { status: 502 });
  }
}
