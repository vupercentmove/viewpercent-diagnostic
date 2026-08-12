/**
 * quick 모드가 키 없음·API 오류에도 정적 폴백을 돌려주는지 고정한다.
 * (2026-08-12 이전에는 quick만 503으로 끝나 full과 경험이 갈렸다.)
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { POST } from "./route";

const BODY = {
  stageScores: [
    { stageId: 1, score: 72 },
    { stageId: 2, score: 55 },
    { stageId: 3, score: 38 },
  ],
  overallScore: 62,
  weakestStage: 3,
};

function post(payload: Record<string, unknown>) {
  return POST(
    new Request("http://localhost/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  );
}

describe("POST /api/analyze — 키 없음", () => {
  const savedKey = process.env.ANTHROPIC_API_KEY;
  const savedUrl = process.env.SUPABASE_URL;

  beforeEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.SUPABASE_URL; // 집계 insert 건너뛰기
  });

  afterEach(() => {
    if (savedKey) process.env.ANTHROPIC_API_KEY = savedKey;
    if (savedUrl) process.env.SUPABASE_URL = savedUrl;
  });

  it("quick도 200 + 폴백 코멘트를 돌려준다", async () => {
    const res = await post({ ...BODY, mode: "quick" });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.fallback).toBe(true);
    expect(data.reason).toBe("no_key");
    // 단계명은 lib/stage-meta.ts 정본을 따른다 (STAGE 3 = 쇼핑의 시작)
    expect(data.comment).toContain("쇼핑의 시작");
    expect(data.comment).toContain("38점");
  });

  it("full도 동일하게 폴백을 돌려준다", async () => {
    const res = await post({ ...BODY, mode: "full" });
    const data = await res.json();
    expect(data.fallback).toBe(true);
    expect(data.comment.split("\n")).toHaveLength(3);
  });

  it("폴백 문구에 느낌표·'무조건/꼭'이 없다", async () => {
    const quick = await (await post({ ...BODY, mode: "quick" })).json();
    const full = await (await post({ ...BODY, mode: "full" })).json();
    for (const text of [quick.comment, full.comment]) {
      expect(text).not.toMatch(/[!！]/);
      expect(text).not.toMatch(/무조건|꼭/);
    }
  });

  it("필수 필드가 없으면 400", async () => {
    const res = await post({ overallScore: 62 });
    expect(res.status).toBe(400);
  });
});
