/**
 * POST /api/analyze
 * 진단 결과 → Claude Haiku → AI 분석 코멘트 (150자 내외)
 * mode==="full": 정밀 진단 3연 프롬프트 ([되받기]→[인과]→[트리거]) + full 전용 정적 폴백
 */

import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { STAGES } from "@/lib/stage-meta";
import { cleanComment } from "@/lib/clean-comment";

export const runtime = "nodejs";

const STAGE_NAMES: Record<number, string> = {
  1: "욕구·검색·방문",
  2: "정보탐색·비교",
  3: "구매결정",
  4: "장바구니·결제",
  5: "구매완료·기다림",
  6: "배송·수령완료",
};

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

function stageName(id: number): string {
  return STAGES.find((s) => s.id === id)?.name ?? `STAGE ${id}`;
}

/** full 전용 폴백: [되받기]→[인과]→[트리거] 3연, 8원칙 (무조건/꼭 금지) */
function buildFullFallback(weakestStage: number, weakScore: number): string {
  const n = stageName(weakestStage);
  return [
    `지금은 ${n} 단계에서 가장 많이 새고 있어요(${weakScore}점).`,
    `여기가 막히면 앞 단계에서 잘 데려온 고객이 마지막에 흩어져요.`,
    `${n} 한 곳만 먼저 손봐도 지금 트래픽 그대로 전환이 올라가요.`,
  ].join("\n");
}

/** 기존 quick 프롬프트 — 문구·로직 불변 */
function buildQuickPrompt(body: Body): string {
  const { stageScores, overallScore, weakestStage, hasGap, perceivedWorst, actualWorst } = body;
  const weakScore = stageScores.find((s) => s.stageId === weakestStage)?.score ?? 0;
  const scoreLines = stageScores
    .sort((a, b) => a.stageId - b.stageId)
    .map((s) => `  STAGE ${s.stageId} ${STAGE_NAMES[s.stageId]}: ${s.score}점`)
    .join("\n");

  const gapLine = hasGap
    ? `착각 패턴 있음 — STAGE ${perceivedWorst}(${STAGE_NAMES[perceivedWorst ?? 0]})이 약하다고 느끼지만 실제로는 STAGE ${actualWorst}(${STAGE_NAMES[actualWorst ?? 0]})이 더 약함`
    : "착각 패턴 없음";

  return `당신은 여성의류 이커머스 브랜드 퍼널 진단 전문가입니다.
아래 진단 결과를 보고, 대표에게 직접 말하듯 2문장으로 핵심 인사이트를 전달하세요.

진단 결과:
${scoreLines}
- 종합 점수: ${overallScore}점
- 가장 약한 단계: STAGE ${weakestStage} ${STAGE_NAMES[weakestStage]} (${weakScore}점)
- ${gapLine}

작성 규칙:
- 공감 또는 날카로운 관찰로 시작
- 가장 급한 1가지 개선점만 구체적으로 짚기
- 150자 이내, 존댓말
- 마케팅 문구 금지, 현장 전문가처럼`;
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

  // 2) apiKey 검사 — full은 폴백, quick은 기존 503 유지
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    if (mode === "full") {
      return NextResponse.json({ comment: buildFullFallback(weakestStage, weakScore), fallback: true });
    }
    return NextResponse.json({ error: "ANTHROPIC_API_KEY 미설정" }, { status: 503 });
  }

  const prompt =
    mode === "full"
      ? `당신은 여성의류 이커머스 퍼널 진단 코치입니다. 아래 결과를 보고, 대표에게 직접 말하듯 자연스러운 3문장으로 인사이트를 전하세요.
문장 순서: (1) 대표가 지금 하고 있는 것을 사실로 짚기 → (2) 그래서 어디가 막히는지 이유 → (3) 무엇 하나를 하면 효과가 어떻게 오르는지.
출력 형식(반드시): 라벨·머리말·번호("되받기"·"인과"·"트리거"·"1)" 등)를 절대 쓰지 말고, 별표(**)나 마크다운 없이 그냥 자연스러운 문장 3개만 쓰세요. 존댓말, '무조건/꼭' 금지, 마케팅 문구 금지, 각 문장 60자 이내.
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
    // full: AI가 라벨(**되받기** 등)·마크다운을 뱉어도 화면엔 자연스러운 문장만 나가도록 정리.
    //       정리 후 빈 문자열이면 정적 폴백으로 대체. quick은 기존 동작 그대로 유지.
    const comment =
      mode === "full"
        ? cleanComment(rawText) || buildFullFallback(weakestStage, weakScore)
        : rawText.trim();

    return NextResponse.json({ comment });
  } catch (err) {
    console.error("[analyze] Claude API 오류:", err);
    if (mode === "full") {
      return NextResponse.json({ comment: buildFullFallback(weakestStage, weakScore), fallback: true });
    }
    return NextResponse.json({ error: "AI 분석 실패" }, { status: 502 });
  }
}
