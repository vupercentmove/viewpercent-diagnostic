import { beforeEach, describe, expect, it, vi } from "vitest";

const { insertWorkbookCheckpointConversion, insertDiagnosticResult, allowRequest } = vi.hoisted(() => ({
  insertWorkbookCheckpointConversion: vi.fn(),
  insertDiagnosticResult: vi.fn(),
  allowRequest: vi.fn(),
}));
vi.mock("@/lib/supabase", () => ({ insertWorkbookCheckpointConversion, insertDiagnosticResult }));
vi.mock("@/lib/rate-limit", () => ({ allowRequest }));

import { POST } from "./route";

function post(payload: unknown, ip = "198.51.100.70") {
  return POST(new Request("http://localhost/api/workbook-checkpoint", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-test-client-identity": ip },
    body: JSON.stringify(payload),
  }));
}

describe("POST /api/workbook-checkpoint", () => {
  beforeEach(() => {
    insertWorkbookCheckpointConversion.mockReset();
    insertDiagnosticResult.mockReset();
    insertWorkbookCheckpointConversion.mockResolvedValue(undefined);
    allowRequest.mockReset();
    allowRequest.mockResolvedValue(true);
  });

  it.each([3, 5] as const)("chapter %s CTA를 전용 전환 테이블에 저장한다", async (stageId) => {
    const res = await post({ stageId }, `198.51.100.${stageId}`);
    expect(res.status).toBe(200);
    expect(insertWorkbookCheckpointConversion).toHaveBeenCalledWith(expect.objectContaining({
      stage_id: stageId,
      event_id: expect.stringMatching(/^[0-9a-f-]{36}$/),
    }));
    expect(insertDiagnosticResult).not.toHaveBeenCalled();
  });

  it.each([{ stageId: 4 }, { stageId: 3, email: "private@example.com" }])(
    "허용되지 않은 체크포인트 요청은 저장하지 않는다",
    async (payload) => {
      expect((await post(payload, `203.0.113.${JSON.stringify(payload).length}`)).status).toBe(400);
      expect(insertWorkbookCheckpointConversion).not.toHaveBeenCalled();
      expect(insertDiagnosticResult).not.toHaveBeenCalled();
    }
  );

  it("제한보다 큰 body는 파싱 전에 413이고 저장하지 않는다", async () => {
    expect((await post({ stageId: 3, padding: "x".repeat(2_000) })).status).toBe(413);
    expect(insertWorkbookCheckpointConversion).not.toHaveBeenCalled();
  });

  it("rate limit을 넘으면 429이고 저장하지 않는다", async () => {
    allowRequest.mockResolvedValue(false);
    expect((await post({ stageId: 3 })).status).toBe(429);
    expect(insertWorkbookCheckpointConversion).not.toHaveBeenCalled();
  });

  it("Supabase 저장 실패는 502", async () => {
    insertWorkbookCheckpointConversion.mockRejectedValue(new Error("boom"));
    expect((await post({ stageId: 3 })).status).toBe(502);
  });
});
