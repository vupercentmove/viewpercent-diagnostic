/**
 * 결과 화면 반응 기록 라우트.
 * 두 카드(의외였던 단계 / 모름 중 먼저 볼 것)가 같은 라우트를 쓴다 — 넘긴 필드만
 * RPC로 가고, 안 넘긴 필드는 RPC 쪽 coalesce가 기존 값을 지킨다.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { recordResultFeedback } = vi.hoisted(() => ({ recordResultFeedback: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ recordResultFeedback }));

import { POST } from "./route";

function post(payload: unknown) {
  return POST(
    new Request("http://localhost/api/result-feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof payload === "string" ? payload : JSON.stringify(payload),
    })
  );
}

describe("POST /api/result-feedback — 입력 검증", () => {
  beforeEach(() => recordResultFeedback.mockReset());

  it("code 없음 → 400", async () => {
    expect((await post({ reactionStage: 3 })).status).toBe(400);
    expect((await post({ code: "", reactionStage: 3 })).status).toBe(400);
    expect(recordResultFeedback).not.toHaveBeenCalled();
  });

  it("기록할 필드가 하나도 없으면 400", async () => {
    expect((await post({ code: "c" })).status).toBe(400);
    expect(recordResultFeedback).not.toHaveBeenCalled();
  });

  it("reactionStage는 1~6 정수만 — 0·7·문자열은 400", async () => {
    expect((await post({ code: "c", reactionStage: 0 })).status).toBe(400);
    expect((await post({ code: "c", reactionStage: 7 })).status).toBe(400);
    expect((await post({ code: "c", reactionStage: "3" })).status).toBe(400);
    expect((await post({ code: "c", reactionStage: 2.5 })).status).toBe(400);
    expect(recordResultFeedback).not.toHaveBeenCalled();
  });

  it("reactionNote 200자 초과 → 400", async () => {
    expect((await post({ code: "c", reactionStage: 1, reactionNote: "가".repeat(201) })).status).toBe(400);
  });

  it("unknownPick 80자 초과 → 400", async () => {
    expect((await post({ code: "c", unknownPick: "가".repeat(81) })).status).toBe(400);
  });

  it("JSON이 아니면 400", async () => {
    expect((await post("nope")).status).toBe(400);
  });
});

describe("POST /api/result-feedback — 정상 경로", () => {
  beforeEach(() => {
    recordResultFeedback.mockReset();
    recordResultFeedback.mockResolvedValue(undefined);
  });

  it("단계만 보내면 단계만 RPC로 간다", async () => {
    const res = await post({ code: "c-1", reactionStage: 3 });
    expect(res.status).toBe(200);
    expect(recordResultFeedback).toHaveBeenCalledWith({
      code: "c-1",
      reactionStage: 3,
      reactionNote: undefined,
      unknownPick: undefined,
    });
  });

  it("한 줄은 앞뒤 공백을 잘라서 넘긴다", async () => {
    await post({ code: "c-1", reactionStage: 2, reactionNote: "  배송 알림이요  " });
    expect(recordResultFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ reactionNote: "배송 알림이요" })
    );
  });

  it("공백뿐인 한 줄은 안 보낸 것으로 친다", async () => {
    await post({ code: "c-1", reactionStage: 2, reactionNote: "   " });
    expect(recordResultFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ reactionNote: undefined })
    );
  });

  it("unknownPick만 보내면 그것만 간다 — 다른 필드는 undefined라 기존 값이 지켜진다", async () => {
    await post({ code: "c-1", unknownPick: "차별화" });
    expect(recordResultFeedback).toHaveBeenCalledWith({
      code: "c-1",
      reactionStage: undefined,
      reactionNote: undefined,
      unknownPick: "차별화",
    });
  });

  it("RPC 실패는 502", async () => {
    recordResultFeedback.mockImplementation(() => {
      throw new Error("no fn");
    });
    expect((await post({ code: "c", reactionStage: 1 })).status).toBe(502);
  });
});
