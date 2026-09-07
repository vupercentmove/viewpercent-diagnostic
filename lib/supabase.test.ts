/**
 * RPC 헬퍼가 PostgREST 규약(/rest/v1/rpc/<fn>, p_ 인자명)대로 부르는지 고정한다.
 * 실제 네트워크는 타지 않는다 — fetch를 스텁한다.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { markCtaClicked, recordResultFeedback } from "./supabase";

describe("supabase RPC 헬퍼", () => {
  const fetchMock = vi.fn();
  const saved = { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_ANON_KEY };

  beforeEach(() => {
    process.env.SUPABASE_URL = "https://x.supabase.co";
    process.env.SUPABASE_ANON_KEY = "anon-key";
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (saved.url) process.env.SUPABASE_URL = saved.url;
    else delete process.env.SUPABASE_URL;
    if (saved.key) process.env.SUPABASE_ANON_KEY = saved.key;
    else delete process.env.SUPABASE_ANON_KEY;
  });

  it("markCtaClicked: rpc/mark_cta_clicked에 p_code로, anon key 헤더로 보낸다", async () => {
    fetchMock.mockResolvedValue({ ok: true });
    await markCtaClicked("c-1");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://x.supabase.co/rest/v1/rpc/mark_cta_clicked");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ p_code: "c-1" });
    expect(init.headers.apikey).toBe("anon-key");
    expect(init.headers.Authorization).toBe("Bearer anon-key");
  });

  it("recordResultFeedback: 안 넘긴 필드는 null — RPC의 coalesce가 기존 값을 지킨다", async () => {
    fetchMock.mockResolvedValue({ ok: true });
    await recordResultFeedback({ code: "c-1", reactionStage: 3 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://x.supabase.co/rest/v1/rpc/record_result_feedback");
    expect(JSON.parse(init.body)).toEqual({
      p_code: "c-1",
      p_reaction_stage: 3,
      p_reaction_note: null,
      p_unknown_pick: null,
    });
  });

  it("응답이 ok가 아니면 함수명을 담아 throw", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404, text: async () => "no fn" });
    await expect(markCtaClicked("c")).rejects.toThrow(/mark_cta_clicked.*404/);
  });

  it("env가 없으면 네트워크를 타기 전에 throw", async () => {
    delete process.env.SUPABASE_URL;
    await expect(markCtaClicked("c")).rejects.toThrow(/환경변수/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
