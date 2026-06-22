"use client";

import { useEffect, useRef, useState } from "react";
import {
  trackShareCardOpen,
  trackShareCardSave,
  trackShareCardShare,
  trackShareUrlCopy,
} from "@/lib/analytics";
import { buildShareUrl } from "@/lib/url-state";
import type { ResultLabel } from "@/lib/result-labels";
import type { Answers } from "@/lib/scoring";
import { STAGES } from "@/lib/stage-meta";

interface ShareCardButtonProps {
  stageScores: { stageId: number; score: number }[];
  overallScore: number;
  label: ResultLabel;
  worstStageId: number;
  answers: Answers;
}

const W = 1080;
const H = 1920;

/**
 * 폰트 로딩을 모듈 임포트 시점에 미리 시작한다.
 * navigator.share/canShare는 사용자 제스처 컨텍스트(user activation)를 요구하는데,
 * 클릭 핸들러 안에서 await가 걸리면(특히 폰트 로딩) iOS Safari에서 activation이 소멸한다.
 * 따라서 폰트 대기와 canvas 렌더는 버튼 클릭 전(useEffect)에 끝내 둔다.
 */
const fontsReady: Promise<void> =
  typeof document !== "undefined" && document.fonts?.ready
    ? document.fonts.ready.then(() => undefined).catch(() => undefined)
    : Promise.resolve();

export default function ShareCardButton({
  stageScores,
  overallScore,
  label,
  worstStageId,
  answers,
}: ShareCardButtonProps) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  // 사전 렌더 산출물 — 클릭 시 await 없이 즉시 공유/저장에 사용
  const dataUrlRef = useRef<string | null>(null);
  const fileRef = useRef<File | null>(null);

  // 마운트(및 결과 변경) 시 폰트 준비 후 카드를 미리 렌더해 둔다
  useEffect(() => {
    let cancelled = false;
    fontsReady.then(async () => {
      if (cancelled) return;
      const canvas = renderCardCanvas({ stageScores, overallScore, label, worstStageId });
      const dataUrl = canvas.toDataURL("image/png");
      dataUrlRef.current = dataUrl;
      try {
        const blob = await (await fetch(dataUrl)).blob();
        if (!cancelled) {
          fileRef.current = new File([blob], "vupercent-result.png", { type: "image/png" });
        }
      } catch {
        /* File 준비 실패 — 다운로드 폴백은 dataUrl로 가능 */
      }
    });
    return () => {
      cancelled = true;
    };
  }, [stageScores, overallScore, label, worstStageId]);

  function downloadFromDataUrl(dataUrl: string) {
    trackShareCardSave();
    const link = document.createElement("a");
    link.download = "vupercent-result.png";
    link.href = dataUrl;
    link.click();
  }

  // 동기 핸들러 — 첫 await 전에 navigator.share를 호출해 제스처 컨텍스트를 보존
  function handleShareCard() {
    trackShareCardOpen();
    const file = fileRef.current;
    let dataUrl = dataUrlRef.current;

    if (file && typeof navigator !== "undefined" && navigator.canShare && navigator.share) {
      const shareUrl = buildShareUrl(answers);
      const withUrl = { files: [file], title: "쇼핑 플로우 진단 결과", text: label.label, url: shareUrl };
      // url을 못 싣는 환경(iOS는 files+url 동시 공유 시 url을 버림)에서는 text에 링크를 넣어 보존
      const filesOnly = {
        files: [file],
        title: "쇼핑 플로우 진단 결과",
        text: `${label.label}\n${shareUrl}`,
      };
      const onShareFail = () => {
        if (dataUrl) downloadFromDataUrl(dataUrl);
      };
      if (navigator.canShare(withUrl)) {
        trackShareCardShare();
        navigator.share(withUrl).catch(onShareFail); // await 안 함 — 제스처 컨텍스트 유지
        return;
      }
      if (navigator.canShare(filesOnly)) {
        trackShareCardShare();
        navigator.share(filesOnly).catch(onShareFail);
        return;
      }
    }

    // 공유 불가 → 다운로드. 아직 사전 렌더 전이면 지금 동기 렌더.
    if (!dataUrl) {
      dataUrl = renderCardCanvas({ stageScores, overallScore, label, worstStageId }).toDataURL(
        "image/png"
      );
      dataUrlRef.current = dataUrl;
    }
    downloadFromDataUrl(dataUrl);
  }

  function legacyCopy(text: string): boolean {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }

  async function handleCopyLink() {
    const url = buildShareUrl(answers);
    setCopyFailed(false);
    try {
      await navigator.clipboard.writeText(url);
      trackShareUrlCopy("result");
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // 카카오 인앱 브라우저 등 clipboard 거부 → execCommand 폴백
      if (legacyCopy(url)) {
        trackShareUrlCopy("result");
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
      } else {
        setCopyFailed(true);
      }
    }
  }

  return (
    <div className="mb-4 flex flex-col gap-2">
      <button
        onClick={handleShareCard}
        className="w-full flex items-center justify-center gap-2 bg-vp-navy border border-vp-blue/40 hover:border-vp-blue text-vp-blue-light text-[14px] font-medium py-3.5 rounded-[12px] transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
        결과 카드 저장 · 공유
      </button>

      <button
        onClick={handleCopyLink}
        className="w-full text-center text-gray-500 hover:text-gray-700 text-[12.5px] py-3.5 transition-colors"
      >
        <span role="status" aria-live="polite" aria-atomic="true">
          {copied
            ? "✓ 결과 링크가 복사됐어요"
            : copyFailed
            ? "복사가 안 됐어요 — 주소창의 링크를 직접 복사해주세요"
            : "결과 링크 복사하기 (카톡·DM에 붙여넣기)"}
        </span>
      </button>
    </div>
  );
}

/* ── 순수 Canvas 렌더 (동기) ── */

interface CardData {
  stageScores: { stageId: number; score: number }[];
  overallScore: number;
  label: ResultLabel;
  worstStageId: number;
}

/** 9:16 결과 카드를 Canvas에 그려 반환한다 (DPR 2x). 폰트는 호출 전 로드되어 있어야 한다. */
function renderCardCanvas({ stageScores, overallScore, label, worstStageId }: CardData): HTMLCanvasElement {
  const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2);
  const canvas = document.createElement("canvas");
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);

  ctx.fillStyle = "#06091D";
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#5A8CFF";
  ctx.font = "bold 36px Pretendard, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("VUPERCENT", W / 2, 120);

  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "28px Pretendard, -apple-system, sans-serif";
  ctx.fillText("쇼핑 플로우 진단 결과", W / 2, 170);

  const cx = W / 2;
  const cy = 360;
  const r = 130;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = "#2A5AE6";
  ctx.lineWidth = 8;
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 96px Pretendard, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${overallScore}`, cx, cy - 14);

  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "30px Pretendard, -apple-system, sans-serif";
  ctx.fillText("점", cx, cy + 60);
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = "#5A8CFF";
  ctx.font = "bold 40px Pretendard, -apple-system, sans-serif";
  ctx.textAlign = "center";
  const labelBottom = wrapText(ctx, label.label, W / 2, 560, W - 120, 54);

  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "30px Pretendard, -apple-system, sans-serif";
  wrapText(ctx, label.tagline, W / 2, labelBottom + 56, W - 160, 44);

  drawRadar(ctx, stageScores, W / 2, 1010, 250);

  const listTop = 1360;
  stageScores.forEach(({ stageId, score }, i) => {
    const stage = STAGES.find((s) => s.id === stageId)!;
    const y = listTop + i * 78;
    const barW = 420;
    const isWorst = stageId === worstStageId;

    ctx.fillStyle = isWorst ? "#F87171" : "rgba(255,255,255,0.7)";
    ctx.font = "28px Pretendard, -apple-system, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(stage.name, 120, y);

    ctx.fillStyle = isWorst ? "#F87171" : "#ffffff";
    ctx.font = "bold 28px Pretendard, -apple-system, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`${score}`, W - 120, y);

    roundRect(ctx, 120, y + 10, barW, 14, 7);
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.fill();
    roundRect(ctx, 120, y + 10, (barW * score) / 100, 14, 7);
    ctx.fillStyle = isWorst ? "#EF4444" : "#2A5AE6";
    ctx.fill();
  });

  ctx.fillStyle = "rgba(255,255,255,0.32)";
  ctx.font = "28px Pretendard, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("나도 진단해보기 → vupercent.com", W / 2, H - 80);

  return canvas;
}

/** 멀티라인 텍스트 — 마지막 줄의 y좌표 반환 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
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
  return currentY;
}

/** roundRect 폴리필 겸용 (구형 사파리 대비) */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number
) {
  const rr = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/**
 * Canvas 2D로 레이더 차트를 직접 그린다.
 * RadarChart.tsx(Recharts)와 시각적으로 같은 결과를 목표로 하지만, toDataURL() PNG
 * 생성은 라이브 DOM 없이 오프스크린 Canvas에서 실행되므로 Recharts를 재사용할 수 없다.
 * 두 구현을 하나로 합치려 하지 말 것.
 */
function drawRadar(
  ctx: CanvasRenderingContext2D,
  scores: { stageId: number; score: number }[],
  cx: number,
  cy: number,
  radius: number
) {
  const n = 6;
  const angleOffset = -Math.PI / 2;

  for (let level = 1; level <= 4; level++) {
    const rr = (radius * level) / 4;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const angle = angleOffset + (i * 2 * Math.PI) / n;
      const px = cx + rr * Math.cos(angle);
      const py = cy + rr * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "22px Pretendard, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 0; i < n; i++) {
    const angle = angleOffset + (i * 2 * Math.PI) / n;
    const labelR = radius + 46;
    const px = cx + labelR * Math.cos(angle);
    const py = cy + labelR * Math.sin(angle);
    ctx.fillText(STAGES[i].name, px, py);
  }
  ctx.textBaseline = "alphabetic";

  ctx.beginPath();
  scores.forEach(({ score }, i) => {
    const rr = (radius * score) / 100;
    const angle = angleOffset + (i * 2 * Math.PI) / n;
    const px = cx + rr * Math.cos(angle);
    const py = cy + rr * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
  ctx.fillStyle = "rgba(42,90,230,0.3)";
  ctx.fill();
  ctx.strokeStyle = "#2A5AE6";
  ctx.lineWidth = 3;
  ctx.stroke();

  scores.forEach(({ score }, i) => {
    const rr = (radius * score) / 100;
    const angle = angleOffset + (i * 2 * Math.PI) / n;
    const px = cx + rr * Math.cos(angle);
    const py = cy + rr * Math.sin(angle);
    ctx.beginPath();
    ctx.arc(px, py, 8, 0, Math.PI * 2);
    ctx.fillStyle = "#2A5AE6";
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();
  });
}
