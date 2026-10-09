import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  insertDiagnosticResult,
  insertWorkbookCheckpointConversion,
  logAiCommentEvent,
  markCtaClicked,
  recordResultFeedback,
} from "./supabase";

describe("server-only Supabase mutation RPC helpers", () => {
  const fetchMock = vi.fn();
  const saved = {
    url: process.env.SUPABASE_URL,
    anon: process.env.SUPABASE_ANON_KEY,
    service: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };

  beforeEach(() => {
    process.env.SUPABASE_URL = "https://x.supabase.co";
    process.env.SUPABASE_ANON_KEY = "public-anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "sb_secret_server-test";
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    for (const [name, value] of Object.entries({
      SUPABASE_URL: saved.url,
      SUPABASE_ANON_KEY: saved.anon,
      SUPABASE_SERVICE_ROLE_KEY: saved.service,
    })) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });

  it.each([
    ["mark_cta_clicked", () => markCtaClicked("c-1")],
    ["record_result_feedback", () => recordResultFeedback({ code: "c-1", reactionStage: 3 })],
  ])("uses only the service-role credential for %s", async (_name, mutate) => {
    await mutate();
    const init = fetchMock.mock.calls[0][1];
    expect(init.headers.apikey).toBe("sb_secret_server-test");
    expect(init.headers.Authorization).toBeUndefined();
    expect(init.headers.apikey).not.toBe("public-anon-key");
  });

  it("markCtaClicked sends the exact RPC payload", async () => {
    await markCtaClicked("c-1");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://x.supabase.co/rest/v1/rpc/mark_cta_clicked");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ p_code: "c-1" });
  });

  it("recordResultFeedback sends absent fields as null for RPC coalesce", async () => {
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

  it("logs AI comment events with the service-role credential", async () => {
    await logAiCommentEvent({ mode: "quick", fallback: false });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://x.supabase.co/rest/v1/ai_comment_events");
    expect(init.headers.apikey).toBe("sb_secret_server-test");
    expect(init.headers.Authorization).toBeUndefined();
  });

  it("inserts diagnostic results with a new secret key and no Bearer header", async () => {
    await insertDiagnosticResult({
      stage_scores: [{ stageId: 1, score: 100 }],
      overall_score: 100,
      weakest_stage: 1,
      result_type: "none",
      has_gap: false,
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://x.supabase.co/rest/v1/diagnostic_results");
    expect(init.headers.apikey).toBe("sb_secret_server-test");
    expect(init.headers.Authorization).toBeUndefined();
  });

  it("inserts workbook checkpoints with a new secret key and no Bearer header", async () => {
    await insertWorkbookCheckpointConversion({ event_id: "event-1", stage_id: 3 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://x.supabase.co/rest/v1/workbook_checkpoint_conversions");
    expect(init.headers.apikey).toBe("sb_secret_server-test");
    expect(init.headers.Authorization).toBeUndefined();
  });

  it("fails closed before network access when the service-role credential is absent", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    await expect(markCtaClicked("c")).rejects.toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
    await expect(logAiCommentEvent({ mode: "quick", fallback: false })).rejects.toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws with the mutation name when Supabase rejects the request", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404, text: async () => "no fn" });
    await expect(markCtaClicked("c")).rejects.toThrow(/mark_cta_clicked.*404/);
    await expect(logAiCommentEvent({ mode: "quick", fallback: false })).rejects.toThrow(/ai_comment_events.*404/);
  });
});
