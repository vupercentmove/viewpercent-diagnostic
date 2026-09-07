/**
 * 저장 API가 결과 행 핸들(code)을 발급해 돌려주는지 고정한다.
 *
 * 2026-08-20 조사: mark_cta_clicked RPC가 2026-06-07부터 DB에 있었지만 앱이 code를
 * 만든 적이 없어 한 번도 호출되지 않았다. 이 code가 없으면 CTA 클릭도 결과 반응도
 * 어느 행에 붙일지 알 수 없다.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { insertDiagnosticResult } = vi.hoisted(() => ({ insertDiagnosticResult: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ insertDiagnosticResult }));

import { POST } from "./route";

const BODY = {
  stageScores: [{ stageId: 1, score: 50 }],
  overallScore: 50,
  weakestStage: 1,
};

function post(payload: unknown) {
  return POST(
    new Request("http://localhost/api/diagnostic-result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  );
}

describe("POST /api/diagnostic-result — code 발급", () => {
  beforeEach(() => {
    insertDiagnosticResult.mockReset();
    insertDiagnosticResult.mockResolvedValue(undefined);
  });

  it("저장한 행에 uuid code를 넣고, 같은 code를 응답으로 돌려준다", async () => {
    const res = await post(BODY);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.code).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(insertDiagnosticResult.mock.calls[0][0].code).toBe(data.code);
  });

  it("호출마다 code가 다르다", async () => {
    const a = await (await post(BODY)).json();
    const b = await (await post(BODY)).json();
    expect(a.code).not.toBe(b.code);
  });

  it("필수 필드가 없으면 400이고 insert하지 않는다 (기존 동작 유지)", async () => {
    expect((await post({ overallScore: 1 })).status).toBe(400);
    expect(insertDiagnosticResult).not.toHaveBeenCalled();
  });

  it("insert 실패 → 502, code 없음 (클라이언트는 code를 못 받고 CTA 추적만 빠진다)", async () => {
    insertDiagnosticResult.mockImplementation(() => {
      throw new Error("down");
    });
    const res = await post(BODY);
    expect(res.status).toBe(502);
    expect((await res.json()).code).toBeUndefined();
  });
});
