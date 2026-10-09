import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createMessage, logAiCommentEvent } = vi.hoisted(() => ({
  createMessage: vi.fn(),
  logAiCommentEvent: vi.fn(),
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: createMessage };
  },
}));
vi.mock("@/lib/supabase", () => ({ logAiCommentEvent }));

import { POST } from "./route";

const STAGE_SCORES = [72, 55, 38, 80, 64, 90].map((score, index) => ({
  stageId: index + 1,
  score,
}));
const BODY = {
  mode: "quick",
  stageScores: STAGE_SCORES,
  overallScore: 67,
  weakestStage: 3,
};
let requestId = 0;

function post(payload: unknown, ip = `198.51.100.${++requestId}`) {
  return POST(
    new Request("http://localhost/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-test-client-identity": ip },
      body: typeof payload === "string" ? payload : JSON.stringify(payload),
    })
  );
}

describe("POST /api/analyze", () => {
  const savedKey = process.env.ANTHROPIC_API_KEY;
  const savedUrl = process.env.SUPABASE_URL;

  beforeEach(() => {
    requestId += 10;
    createMessage.mockReset();
    logAiCommentEvent.mockReset();
    createMessage.mockResolvedValue({ content: [{ type: "text", text: "쇼핑의 시작 단계가 먼저예요." }] });
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.SUPABASE_URL;
  });

  afterEach(() => {
    if (savedKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = savedKey;
    if (savedUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = savedUrl;
  });

  it("quick도 키가 없으면 200 + 폴백 코멘트를 돌려준다", async () => {
    const res = await post(BODY);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toMatchObject({ fallback: true, reason: "no_key" });
    expect(data.comment).toContain("쇼핑의 시작");
    expect(data.comment).toContain("38점");
  });

  it("full도 동일하게 폴백을 돌려준다", async () => {
    const res = await post({ ...BODY, mode: "full" });
    const data = await res.json();
    expect(data.fallback).toBe(true);
    expect(data.comment.split("\n")).toHaveLength(3);
  });

  it("server-only event write failure fails closed with 502", async () => {
    logAiCommentEvent.mockImplementation(() => {
      throw new Error("service role unavailable");
    });
    const res = await post(BODY);
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "store failed" });
  });

  it("폴백 문구에 느낌표·'무조건/꼭'이 없다", async () => {
    const quick = await (await post(BODY)).json();
    const full = await (await post({ ...BODY, mode: "full" })).json();
    for (const text of [quick.comment, full.comment]) {
      expect(text).not.toMatch(/[!！]/);
      expect(text).not.toMatch(/무조건|꼭/);
    }
  });

  it.each([
    ["잘못된 mode", { ...BODY, mode: "other" }],
    ["6단계 미만", { ...BODY, stageScores: STAGE_SCORES.slice(0, 5) }],
    ["중복 단계", { ...BODY, stageScores: [...STAGE_SCORES.slice(0, 5), { stageId: 5, score: 90 }] }],
    ["범위 밖 점수", { ...BODY, stageScores: STAGE_SCORES.map((s, i) => i === 0 ? { ...s, score: 101 } : s) }],
    ["최약 단계 불일치", { ...BODY, weakestStage: 1 }],
    ["과도한 vision", { ...BODY, mode: "full", vision: "가".repeat(501) }],
    ["알 수 없는 필드", { ...BODY, email: "private@example.com" }],
  ])("%s 요청은 모델 호출 전에 400", async (_name, payload) => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    const res = await post(payload);
    expect(res.status).toBe(400);
    expect(createMessage).not.toHaveBeenCalled();
  });

  it("제한보다 큰 body는 파싱 전에 413이고 모델을 호출하지 않는다", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    const res = await post(JSON.stringify({ ...BODY, padding: "x".repeat(20_000) }));
    expect(res.status).toBe(413);
    expect(createMessage).not.toHaveBeenCalled();
  });

  it("호출 한도를 넘으면 429이며 초과 요청은 Anthropic을 호출하지 않는다", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    const ip = "203.0.113.10";
    const responses = [];
    for (let i = 0; i < 6; i += 1) responses.push(await post(BODY, ip));
    expect(responses.slice(0, 5).every((res) => res.status === 200)).toBe(true);
    expect(responses[5].status).toBe(429);
    expect(createMessage).toHaveBeenCalledTimes(5);
  });
});
