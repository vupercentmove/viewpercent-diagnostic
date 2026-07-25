/**
 * 동적 OG 이미지 — 결과 공유 링크가 카톡/슬랙/메신저에 붙을 때 보이는 미리보기 카드.
 *
 * GET /api/og?a=<encoded>  →  1200x630 PNG
 *
 * - 스코어링 불변: 디코더(decodeAnswers)와 기존 순수함수만 재사용, 점수 재정의 없음.
 * - 표시광고법: 사용자 본인의 진단 점수/라벨만 노출(외부 효능 주장 없음).
 * - Edge 런타임: satori는 ttf/otf만 지원 → Pretendard SemiBold OTF를 런타임 fetch(메모이즈).
 */

import { ImageResponse } from "next/og";
import { decodeAnswers } from "@/lib/url-state";
import { buildResultSummary } from "@/lib/result-summary";
import { getStrengthStages } from "@/lib/strength-stages";
import { STAGES } from "@/lib/stage-meta";

export const runtime = "edge";

const FONT_URL =
  "https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/public/static/Pretendard-SemiBold.otf";

// 같은 edge 인스턴스 안에서 폰트 재요청 방지. 실패한 Promise는 캐시하지 않는다
// (실패가 고착되면 isolate 전체가 영구히 깨진 카드를 반환하므로 다음 요청에서 재시도).
let fontPromise: Promise<ArrayBuffer> | null = null;
function loadFont(): Promise<ArrayBuffer> {
  if (!fontPromise) {
    fontPromise = fetch(FONT_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`font fetch failed: ${res.status}`);
        return res.arrayBuffer();
      })
      .catch((err) => {
        fontPromise = null; // 다음 요청에서 재시도 가능하도록 캐시 해제
        throw err;
      });
  }
  return fontPromise;
}

const NAVY = "#06091D";
const BLUE = "#2A5AE6";
const BLUE_LIGHT = "#5A8CFF";

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=604800, stale-while-revalidate=86400",
};

export async function GET(req: Request) {
  const encoded = new URL(req.url).searchParams.get("a") ?? "";
  const answers = decodeAnswers(encoded);

  // 폰트 fetch 실패 시 500 대신 영문 폴백 카드를 반환한다 — 카카오 스크래퍼가
  // 500을 받으면 미리보기가 통째로 깨지므로, 한글 글리프를 포기하더라도 유효 PNG를 준다.
  let font: ArrayBuffer | null = null;
  try {
    font = await loadFont();
  } catch {
    font = null;
  }

  if (!font) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "80px",
            background: NAVY,
          }}
        >
          <div style={{ display: "flex", color: BLUE_LIGHT, fontSize: 30, marginBottom: 24 }}>
            VUPERCENT · Shopping Flow Diagnostic
          </div>
          <div style={{ display: "flex", color: "#fff", fontSize: 56, lineHeight: 1.3 }}>
            Find where your revenue leaks — before spending more on ads.
          </div>
        </div>
      ),
      { width: 1200, height: 630, fonts: [], headers: CACHE_HEADERS }
    );
  }

  const fontConfig = [
    { name: "Pretendard", data: font, weight: 600 as const, style: "normal" as const },
  ];

  // 디코딩 실패 → 브랜드 기본 카드
  if (!answers) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "80px",
            background: NAVY,
            fontFamily: "Pretendard",
          }}
        >
          <div style={{ display: "flex", color: BLUE_LIGHT, fontSize: 28, marginBottom: 24 }}>
            VUPERCENT · 쇼핑 플로우 진단
          </div>
          <div style={{ display: "flex", color: "#fff", fontSize: 60, lineHeight: 1.3 }}>
            광고비를 더 쓰기 전에,{"\n"}고객이 어디서 돌아서는지부터.
          </div>
        </div>
      ),
      { width: 1200, height: 630, fonts: fontConfig, headers: CACHE_HEADERS }
    );
  }

  const { stageScores, overall, worst, label } = buildResultSummary(answers);
  const strengths = getStrengthStages(stageScores, worst.stageId);
  const worstName = STAGES.find((s) => s.id === worst.stageId)?.name ?? "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "72px 80px",
          background: NAVY,
          fontFamily: "Pretendard",
        }}
      >
        {/* 헤더 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            color: BLUE_LIGHT,
            fontSize: 26,
            letterSpacing: 2,
          }}
        >
          VUPERCENT · 쇼핑 플로우 진단 결과
        </div>

        {/* 정체성 라벨 */}
        <div
          style={{
            display: "flex",
            color: "#fff",
            fontSize: 62,
            lineHeight: 1.25,
            marginTop: 40,
            maxWidth: 1000,
          }}
        >
          {label.label}
        </div>

        {/* 부연 */}
        <div
          style={{
            display: "flex",
            color: "rgba(255,255,255,0.6)",
            fontSize: 30,
            lineHeight: 1.4,
            marginTop: 24,
            maxWidth: 980,
          }}
        >
          {label.tagline}
        </div>

        {/* 하단: 점수 + 취약/강점 칩 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginTop: "auto",
            gap: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              background: BLUE,
              borderRadius: 16,
              padding: "16px 28px",
              color: "#fff",
              fontSize: 32,
            }}
          >
            <span style={{ display: "flex", fontSize: 44, marginRight: 10 }}>{overall}</span>
            점
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "rgba(248,113,113,0.15)",
              border: "2px solid rgba(248,113,113,0.5)",
              borderRadius: 16,
              padding: "16px 26px",
              color: "#FCA5A5",
              fontSize: 28,
            }}
          >
            가장 약한 단계 · {worstName}
          </div>
          {strengths[0] && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "rgba(34,197,94,0.12)",
                border: "2px solid rgba(34,197,94,0.4)",
                borderRadius: 16,
                padding: "16px 26px",
                color: "#86EFAC",
                fontSize: 28,
              }}
            >
              강점 · {strengths[0].name}
            </div>
          )}
        </div>

        {/* 풋터 */}
        <div
          style={{
            display: "flex",
            color: "rgba(255,255,255,0.35)",
            fontSize: 24,
            marginTop: 36,
          }}
        >
          나도 진단해보기 → vupercent.com
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: fontConfig,
      headers: {
        "Cache-Control": "public, max-age=604800, stale-while-revalidate=86400",
      },
    }
  );
}
