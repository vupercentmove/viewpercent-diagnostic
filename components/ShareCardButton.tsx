"use client";

import { useRef, useState } from "react";
import { track } from "@vercel/analytics";
import type { ResultLabel } from "@/lib/result-labels";
import { STAGES } from "@/lib/stage-meta";

interface ShareCardButtonProps {
  stageScores: { stageId: number; score: number }[];
  overallScore: number;
  label: ResultLabel;
  worstStageId: number;
}

/** 9:16 SVG 카드를 canvas에 그려 PNG로 저장/공유 */
export default function ShareCardButton({
  stageScores,
  overallScore,
  label,
  worstStageId,
}: ShareCardButtonProps) {
  const [loading, setLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const W = 1080;
  const H = 1920;

  async function renderToCanvas(): Promise<HTMLCanvasElement> {
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;

    // 배경
    ctx.fillStyle = "#06091D";
    ctx.fillRect(0, 0, W, H);

    // 상단 브랜드
    ctx.fillStyle = "#5A8CFF";
    ctx.font = "bold 36px -apple-system, 'Pretendard', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("VUPERCENT", W / 2, 120);

    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "28px -apple-system, 'Pretendard', sans-serif";
    ctx.fillText("쇼핑 플로우 진단 결과", W / 2, 170);

    // 전체 점수 원형
    const cx = W / 2;
    const cy = 360;
    const r = 130;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = "#2A5AE6";
    ctx.lineWidth = 8;
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 96px -apple-system, 'Pretendard', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${overallScore}`, cx, cy - 14);

    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "30px -apple-system, 'Pretendard', sans-serif";
    ctx.fillText("점", cx, cy + 60);

    ctx.textBaseline = "alphabetic";

    // 정체성 라벨
    ctx.fillStyle = "#5A8CFF";
    ctx.font = "bold 38px -apple-system, 'Pretendard', sans-serif";
    ctx.textAlign = "center";
    wrapText(ctx, label.label, W / 2, 570, W - 120, 52);

    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = "30px -apple-system, 'Pretendard', sans-serif";
    wrapText(ctx, label.tagline, W / 2, 660, W - 160, 44);

    // 레이더 차트 (육각형 + 점수 막대)
    drawRadar(ctx, stageScores, W / 2, 980, 260);

    // Stage 점수 리스트
    const listTop = 1340;
    stageScores.forEach(({ stageId, score }, i) => {
      const stage = STAGES.find((s) => s.id === stageId)!;
      const y = listTop + i * 80;
      const barW = 420;

      // Stage 이름
      ctx.fillStyle = stageId === worstStageId ? "#F87171" : "rgba(255,255,255,0.7)";
      ctx.font = "28px -apple-system, 'Pretendard', sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(stage.name, 120, y);

      // 점수
      ctx.fillStyle = stageId === worstStageId ? "#F87171" : "#ffffff";
      ctx.font = "bold 28px -apple-system, 'Pretendard', sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`${score}`, W - 120, y);

      // 바 배경
      ctx.fillStyle = "rgba(255,255,255,0.1)";
      ctx.beginPath();
      ctx.roundRect(120, y + 10, barW, 14, 7);
      ctx.fill();

      // 바 채우기
      ctx.fillStyle = stageId === worstStageId ? "#EF4444" : "#2A5AE6";
      ctx.beginPath();
      ctx.roundRect(120, y + 10, (barW * score) / 100, 14, 7);
      ctx.fill();
    });

    // 하단 CTA
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.font = "28px -apple-system, 'Pretendard', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("나도 진단해보기 → vupercent.com", W / 2, H - 80);

    return canvas;
  }

  async function handleShare() {
    setLoading(true);
    track("share_card_open");
    try {
      const canvas = await renderToCanvas();

      if (navigator.share && navigator.canShare) {
        canvas.toBlob(async (blob) => {
          if (!blob) return;
          const file = new File([blob], "vupercent-result.png", { type: "image/png" });
          if (navigator.canShare({ files: [file] })) {
            track("share_card_share");
            await navigator.share({
              files: [file],
              title: "쇼핑 플로우 진단 결과",
              text: label.label,
            });
          } else {
            downloadCanvas(canvas);
          }
        }, "image/png");
      } else {
        downloadCanvas(canvas);
      }
    } finally {
      setLoading(false);
    }
  }

  function downloadCanvas(canvas: HTMLCanvasElement) {
    track("share_card_save");
    const link = document.createElement("a");
    link.download = "vupercent-result.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <div className="mb-4">
      <button
        onClick={handleShare}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-vp-navy border border-vp-blue/40 hover:border-vp-blue text-vp-blue-light text-[14px] font-medium py-3.5 rounded-[12px] transition-colors disabled:opacity-50"
      >
        {loading ? (
          <span className="text-[13px]">카드 생성 중…</span>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
              <polyline points="16 6 12 2 8 6"/>
              <line x1="12" y1="2" x2="12" y2="15"/>
            </svg>
            결과 공유하기 (인스타 카드 저장)
          </>
        )}
      </button>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

/** 멀티라인 텍스트 렌더링 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(" ");
  let line = "";
  let currentY = y;

  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      line = word;
      currentY += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, currentY);
}

/** 레이더 차트 (6각형) */
function drawRadar(
  ctx: CanvasRenderingContext2D,
  scores: { stageId: number; score: number }[],
  cx: number,
  cy: number,
  radius: number
) {
  const n = 6;
  const angleOffset = -Math.PI / 2;

  // 그리드
  for (let level = 1; level <= 4; level++) {
    const r = (radius * level) / 4;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const angle = angleOffset + (i * 2 * Math.PI) / n;
      const px = cx + r * Math.cos(angle);
      const py = cy + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // 축 라벨
  const stages = STAGES;
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "22px -apple-system, 'Pretendard', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 0; i < n; i++) {
    const angle = angleOffset + (i * 2 * Math.PI) / n;
    const labelR = radius + 46;
    const px = cx + labelR * Math.cos(angle);
    const py = cy + labelR * Math.sin(angle);
    ctx.fillText(stages[i].name, px, py);
  }
  ctx.textBaseline = "alphabetic";

  // 점수 영역
  ctx.beginPath();
  scores.forEach(({ score }, i) => {
    const r = (radius * score) / 100;
    const angle = angleOffset + (i * 2 * Math.PI) / n;
    const px = cx + r * Math.cos(angle);
    const py = cy + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
  ctx.fillStyle = "rgba(42,90,230,0.3)";
  ctx.fill();
  ctx.strokeStyle = "#2A5AE6";
  ctx.lineWidth = 3;
  ctx.stroke();

  // 점
  scores.forEach(({ score }, i) => {
    const r = (radius * score) / 100;
    const angle = angleOffset + (i * 2 * Math.PI) / n;
    const px = cx + r * Math.cos(angle);
    const py = cy + r * Math.sin(angle);
    ctx.beginPath();
    ctx.arc(px, py, 8, 0, Math.PI * 2);
    ctx.fillStyle = "#2A5AE6";
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();
  });
}
