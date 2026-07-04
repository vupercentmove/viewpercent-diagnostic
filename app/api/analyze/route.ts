/**
 * POST /api/analyze
 * 진단 결과 → Claude Haiku → AI 분석 코멘트 (150자 내외)
 */

import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

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
  hasGap?: boolean;
  perceivedWorst?: number;
  actualWorst?: number;
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY 미설정" }, { status: 503 });
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const { stageScores, overallScore, weakestStage, hasGap, perceivedWorst, actualWorst } = body;
  if (!stageScores?.length || typeof overallScore !== "number") {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const weakScore = stageScores.find((s) => s.stageId === weakestStage)?.score ?? 0;
  const scoreLines = stageScores
    .sort((a, b) => a.stageId - b.stageId)
    .map((s) => `  STAGE ${s.stageId} ${STAGE_NAMES[s.stageId]}: ${s.score}점`)
    .join("\n");

  const gapLine = hasGap
    ? `착각 패턴 있음 — STAGE ${perceivedWorst}(${STAGE_NAMES[perceivedWorst ?? 0]})이 약하다고 느끼지만 실제로는 STAGE ${actualWorst}(${STAGE_NAMES[actualWorst ?? 0]})이 더 약함`
    : "착각 패턴 없음";

  const prompt = `당신은 여성의류 이커머스 브랜드 퍼널 진단 전문가입니다.
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

  try {
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    });

    const comment =
      msg.content[0]?.type === "text" ? msg.content[0].text.trim() : "";

    return NextResponse.json({ comment });
  } catch (err) {
    console.error("[analyze] Claude API 오류:", err);
    return NextResponse.json({ error: "AI 분석 실패" }, { status: 502 });
  }
}
