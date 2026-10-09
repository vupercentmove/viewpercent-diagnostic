/**
 * Supabase 진단 결과 저장 헬퍼 (서버사이드 전용)
 *
 * @supabase/supabase-js 의존성 없이 PostgREST REST 엔드포인트에 직접 fetch.
 * 보호된 write는 service-role credential로만 수행한다. anon key는 공개 키이므로
 * 진단 결과·체크포인트·rate-limit 같은 서버 검증 경계에 사용하면 안 된다.
 */

import { buildSupabaseServerHeaders } from "./supabase-headers";

export interface DiagnosticResultRow {
  stage_scores: { stageId: number; score: number }[];
  overall_score: number;
  weakest_stage: number;
  result_type: string;
  has_gap: boolean;
  deep_stage_id?: number | null;
  quick_answers?: Record<string, number> | null;
  deep_answers?: Record<string, number> | null;
  utm?: Record<string, string> | null;
  completed?: boolean;
  /** 진단 모드 — "quick"(기본, 기존 10문항) | "full"(정밀 풀 심화) */
  diagnostic_mode?: string;
  /** 정밀 모드 비전 문항 응답(자유서술) */
  vision_answer?: string | null;
  /** 정밀 모드 "모름" 응답 영역 목록 */
  unknown_areas?: unknown | null;
  /** 정밀 모드 ICP(이상적 고객) 판정 플래그 */
  icp_flag?: boolean | null;
  /**
   * 이 행을 나중에 가리킬 핸들 — 저장 API가 발급해 클라이언트에 돌려준다.
   * CTA 클릭·결과 반응은 이 code로 행을 찾아 갱신한다(RPC, security definer).
   */
  code?: string;
}

/** 진단 결과 1건을 diagnostic_results 테이블에 insert. 실패 시 throw. */
export async function insertDiagnosticResult(
  row: DiagnosticResultRow
): Promise<void> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수가 없습니다.");
  }

  const res = await fetch(`${url}/rest/v1/diagnostic_results`, {
    method: "POST",
    headers: { ...buildSupabaseServerHeaders(key), Prefer: "return=minimal" },
    body: JSON.stringify(row),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Supabase insert 실패 (${res.status}): ${detail}`);
  }
}

export interface WorkbookCheckpointConversionRow {
  event_id: string;
  stage_id: 3 | 5;
}

/** 워크북 중간 CTA 전환을 최종 진단 결과와 분리해 저장한다. */
export async function insertWorkbookCheckpointConversion(
  row: WorkbookCheckpointConversionRow
): Promise<void> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수가 없습니다.");
  }

  const res = await fetch(`${url}/rest/v1/workbook_checkpoint_conversions`, {
    method: "POST",
    headers: { ...buildSupabaseServerHeaders(key), Prefer: "return=minimal" },
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Supabase checkpoint insert 실패 (${res.status}): ${detail}`);
  }
}

/** AI 코멘트 응답 1건 기록 (폴백률 집계용). 서버 credential이 없거나 저장 실패 시 throw. */
export async function logAiCommentEvent(event: {
  mode: string;
  fallback: boolean;
  reason?: string | null;
}): Promise<void> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수가 없습니다.");
  }

  const res = await fetch(`${url}/rest/v1/ai_comment_events`, {
    method: "POST",
    headers: { ...buildSupabaseServerHeaders(key), Prefer: "return=minimal" },
    body: JSON.stringify({
      mode: event.mode,
      fallback: event.fallback,
      reason: event.reason ?? null,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Supabase ai_comment_events insert 실패 (${res.status}): ${detail}`);
  }
}

/** Mutation RPC 호출 공통 — service-role credential만 사용한다. 실패 시 throw. */
async function callRpc(fn: string, args: Record<string, unknown>): Promise<void> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수가 없습니다.");
  }

  const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: buildSupabaseServerHeaders(key),
    body: JSON.stringify(args),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Supabase rpc ${fn} 실패 (${res.status}): ${detail}`);
  }
}

/**
 * 카톡 CTA 클릭 표시 — diagnostic_results.cta_clicked = true.
 *
 * 함수 자체는 2026-06-07부터 DB에 있었는데 앱이 code를 만든 적이 없어 한 번도
 * 호출되지 않았다(어드민 CTA 전환율이 영원히 0%였던 이유). code는 저장 API가 발급한다.
 */
export async function markCtaClicked(code: string): Promise<void> {
  await callRpc("mark_cta_clicked", { p_code: code });
}

/**
 * 결과 화면 반응 기록 — 넘긴 필드만 갱신한다(null은 기존 값 유지, RPC 쪽 coalesce).
 * 두 카드(의외였던 단계 / 모름 중 먼저 볼 것)가 따로 보내도 서로 덮어쓰지 않는다.
 */
export async function recordResultFeedback(input: {
  code: string;
  reactionStage?: number;
  reactionNote?: string;
  unknownPick?: string;
}): Promise<void> {
  await callRpc("record_result_feedback", {
    p_code: input.code,
    p_reaction_stage: input.reactionStage ?? null,
    p_reaction_note: input.reactionNote ?? null,
    p_unknown_pick: input.unknownPick ?? null,
  });
}
