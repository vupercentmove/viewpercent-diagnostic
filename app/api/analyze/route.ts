/**
 * POST /api/analyze
 * 진단 결과 → Claude Haiku → AI 분석 코멘트 (150자 내외)
 * mode==="full": 정밀 진단 3연 프롬프트 ([되받기]→[인과]→[트리거])
 * 두 모드 모두 실패·수치 날조 시 모드별 정적 폴백으로 대체한다(응답에 fallback·reason 표시).
 */

import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { STAGES } from "@/lib/stage-meta";
import { resolveComment, type AiCommentPayload } from "@/lib/ai-fallback";
import { logAiCommentEvent } from "@/lib/supabase";

export const runtime = "nodejs";

interface Body {
  stageScores: { stageId: number; score: number }[];
  overallScore: number;
  weakestStage: number;
  mode?: "quick" | "full";
  vision?: string;
  hasGap?: boolean;
  perceivedWorst?: number;
  actualWorst?: number;
}

/**
 * 단계명은 lib/stage-meta.ts의 STAGES가 정본이다.
 * ⚠️ 이 파일에 별도 단계명 표를 두지 말 것 — 2026-08-12까지 로컬 STAGE_NAMES가
 *    STAGE 2·3·4를 정본과 다르게 담고 있어(3을 "구매결정"으로) 프롬프트가
 *    화면과 다른 단계명을 AI에게 알려주고 있었다.
 */
function stageName(id: number): string {
  return STAGES.find((s) => s.id === id)?.name ?? `STAGE ${id}`;
}

/** full 전용 폴백: [되받기]→[인과]→[트리거] 3연, 8원칙 (무조건/꼭 금지) */
function buildFullFallback(weakestStage: number, weakScore: number): string {
  const n = stageName(weakestStage);
  return [
    `지금은 ${n} 단계에서 가장 많이 새고 있어요(${weakScore}점).`,
    `여기만 통과되면 앞 단계에서 잘 데려온 고객이 끝까지 남아요.`,
    `${n} 한 곳만 먼저 손봐도 지금 트래픽 그대로 전환이 올라갈 여지가 가장 커요.`,
  ].join("\n");
}

/** quick 전용 폴백: 2문장, full과 같은 톤 규칙 (수치는 실측 점수만) */
function buildQuickFallback(weakestStage: number, weakScore: number): string {
  const n = stageName(weakestStage);
  return `지금 가장 먼저 볼 곳은 ${n} 단계예요(${weakScore}점). 여기 한 곳만 손봐도 지금 트래픽 그대로 전환이 올라갈 여지가 가장 커요.`;
}

/** 모드별 정적 폴백 선택 */
function buildFallback(mode: Body["mode"], weakestStage: number, weakScore: number): string {
  return mode === "full"
    ? buildFullFallback(weakestStage, weakScore)
    : buildQuickFallback(weakestStage, weakScore);
}

/** 기존 quick 프롬프트 — 문구 불변 */
function buildQuickPrompt(body: Body): string {
  const { stageScores, overallScore, weakestStage, hasGap, perceivedWorst, actualWorst } = body;
  const weakScore = stageScores.find((s) => s.stageId === weakestStage)?.score ?? 0;
  const scoreLines = stageScores
    .sort((a, b) => a.stageId - b.stageId)
    .map((s) => `  STAGE ${s.stageId} ${stageName(s.stageId)}: ${s.score}점`)
    .join("\n");

  const gapLine = hasGap
    ? `착각 패턴 있음 — STAGE ${perceivedWorst}(${stageName(perceivedWorst ?? 0)})이 약하다고 느끼지만 실제로는 STAGE ${actualWorst}(${stageName(actualWorst ?? 0)})이 더 약함`
    : "착각 패턴 없음";

  return `당신은 여성의류 이커머스 브랜드 퍼널 진단 전문가입니다.
아래 진단 결과를 보고, 대표에게 직접 말하듯 2문장으로 핵심 인사이트를 전달하세요.

진단 결과:
${scoreLines}
- 종합 점수: ${overallScore}점
- 가장 약한 단계: STAGE ${weakestStage} ${stageName(weakestStage)} (${weakScore}점)
- ${gapLine}

작성 규칙:
- 공감 또는 날카로운 관찰로 시작
- 가장 급한 1가지 개선점만 구체적으로 짚기
- 150자 이내, 존댓말
- 느낌표·'무조건/꼭' 금지, 부정 표현을 두 문장 연속 쓰지 않기
- 진단 결과에 없는 수치·퍼센트를 지어내지 않기 (제공된 점수 인용은 가능)
- 마케팅 문구 금지, 현장 전문가처럼`;
}

/** 응답을 그대로 돌려주면서 폴백 여부를 집계 테이블에 남긴다 */
async function respond(payload: AiCommentPayload, mode: Body["mode"]) {
  await logAiCommentEvent({
    mode: mode ?? "quick",
    fallback: payload.fallback === true,
    reason: payload.reason ?? null,
  });
  return NextResponse.json(payload);
}

export async function POST(request: Request) {
  // 1) body 먼저 파싱 (mode를 알아야 분기)
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const { stageScores, overallScore, weakestStage, mode, vision } = body;
  if (!stageScores?.length || typeof overallScore !== "number") {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const weakScore = stageScores.find((s) => s.stageId === weakestStage)?.score ?? 0;

  // AI가 인용해도 되는 수치 = 진단이 실제로 제공한 점수들
  const allowedNumbers = [...stageScores.map((s) => s.score), overallScore];

  // 2) apiKey 검사 — 두 모드 모두 정적 폴백 (에러 대신 읽을 수 있는 코멘트를 준다)
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return respond(
      { comment: buildFallback(mode, weakestStage, weakScore), fallback: true, reason: "no_key" },
      mode
    );
  }

  const prompt =
    mode === "full"
      ? `당신은 여성의류 이커머스 퍼널 진단 코치입니다. 아래 결과를 보고, 대표에게 직접 말하듯 자연스러운 3문장으로 인사이트를 전하세요.
문장 순서: (1) 대표가 지금 하고 있는 것을 사실로 짚기 → (2) 그래서 어디가 막히는지 이유 → (3) 무엇 하나를 하면 효과가 어떻게 오르는지.
출력 형식(반드시): 라벨·머리말·번호("되받기"·"인과"·"트리거"·"1)" 등)를 절대 쓰지 말고, 별표(**)나 마크다운 없이 그냥 자연스러운 문장 3개만 쓰세요. 존댓말, 느낌표·'무조건/꼭' 금지, 마케팅 문구 금지, 진단 결과에 없는 수치·퍼센트 지어내지 않기(제공된 점수 인용은 가능), 각 문장 60자 이내.
가장 약한 단계: STAGE ${weakestStage} ${stageName(weakestStage)} (${weakScore}점)${vision ? `\n대표의 바람: ${vision}` : ""}`
      : buildQuickPrompt(body);

  try {
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    });

    const rawText = msg.content[0]?.type === "text" ? msg.content[0].text : "";
    // AI가 라벨(**되받기** 등)·마크다운을 뱉어도 화면엔 자연스러운 문장만 나가도록 정리하고,
    // 정리 후 빈 문자열이거나 진단에 없는 성과 수치를 지어냈으면 정적 폴백으로 대체한다.
    return respond(
      resolveComment(rawText, buildFallback(mode, weakestStage, weakScore), allowedNumbers),
      mode
    );
  } catch (err) {
    console.error("[analyze] Claude API 오류:", err);
    return respond(
      { comment: buildFallback(mode, weakestStage, weakScore), fallback: true, reason: "api_error" },
      mode
    );
  }
}
