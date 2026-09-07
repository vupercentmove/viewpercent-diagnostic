/**
 * 카톡 CTA 클릭 기록 라우트. code만 받아 RPC로 넘긴다.
 * 클라이언트는 fire-and-forget이라 실패해도 UX엔 영향이 없지만, 상태 코드는
 * 정직하게 낸다 — 어드민에서 "왜 0%지"를 다시 추적할 때 로그가 단서가 된다.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { markCtaClicked } = vi.hoisted(() => ({ markCtaClicked: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ markCtaClicked }));

import { POST } from "./route";

function post(payload: unknown) {
  return POST(
    new Request("http://localhost/api/cta-click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof payload === "string" ? payload : JSON.stringify(payload),
    })
  );
}

describe("POST /api/cta-click", () => {
  // ⚠️ reset만 하고 기본 구현을 두지 않으면, throw 구현을 넣는 테스트가 다른 파일과
  //    함께 돌 때 실패한다 — 테스트 위치와 무관하고 단독 실행은 통과한다(2026-08-25,
  //    변형 4종으로 고립: 라우트의 console.error·거부 방식·테스트 순서는 무관, reset-only
  //    만이 원인). vitest 내부 원인은 특정하지 못했다. resolved 기본값을 항상 둔다.
  beforeEach(() => {
    markCtaClicked.mockReset();
    markCtaClicked.mockResolvedValue(undefined);
  });

  it("code가 없거나 문자열이 아니면 400이고 DB를 건드리지 않는다", async () => {
    expect((await post({})).status).toBe(400);
    expect((await post({ code: 123 })).status).toBe(400);
    expect((await post({ code: "" })).status).toBe(400);
    expect(markCtaClicked).not.toHaveBeenCalled();
  });

  it("JSON이 아니면 400", async () => {
    expect((await post("not json")).status).toBe(400);
  });

  it("code를 그대로 RPC에 넘기고 200", async () => {
    markCtaClicked.mockResolvedValue(undefined);
    const res = await post({ code: "abc-123" });
    expect(res.status).toBe(200);
    expect(markCtaClicked).toHaveBeenCalledWith("abc-123");
  });

  it("RPC 실패는 502", async () => {
    // 동기 throw로 실패를 흉내낸다. 목이 거부 프로미스를 *돌려주면* vitest가 결과
    // 추적용 then을 붙이면서 파생 거부가 생기고, 그게 unhandled로 이 테스트에
    // 귀속된다(다른 파일과 함께 돌릴 때만 재현, 단독 실행은 통과). 라우트의 await는
    // 동기 throw도 같은 catch로 받는다.
    markCtaClicked.mockImplementation(() => {
      throw new Error("boom");
    });
    expect((await post({ code: "abc" })).status).toBe(502);
  });
});
