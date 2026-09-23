import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { insertDiagnosticResult, insertWorkbookCheckpointConversion } from "./supabase";

const SAMPLE_RESULT = {
  code: "00000000-0000-4000-8000-000000000000",
  stage_scores: [1, 2, 3, 4, 5, 6].map((stageId) => ({ stageId, score: 50 })),
  overall_score: 50,
  weakest_stage: 1,
  result_type: "none",
  has_gap: false,
  completed: true,
  diagnostic_mode: "quick",
};

describe("server-only Supabase writes", () => {
  const fetchMock = vi.fn();
  const saved = {
    url: process.env.SUPABASE_URL,
    anon: process.env.SUPABASE_ANON_KEY,
    service: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };

  beforeEach(() => {
    process.env.SUPABASE_URL = "https://x.supabase.co";
    process.env.SUPABASE_ANON_KEY = "public-anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "server-service-role-key";
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
    ["diagnostic result", () => insertDiagnosticResult(SAMPLE_RESULT)],
    ["workbook checkpoint", () => insertWorkbookCheckpointConversion({ event_id: SAMPLE_RESULT.code, stage_id: 3 })],
  ])("uses the service-role credential for %s writes", async (_name, write) => {
    await write();
    const init = fetchMock.mock.calls[0][1];
    expect(init.headers.apikey).toBe("server-service-role-key");
    expect(init.headers.Authorization).toBe("Bearer server-service-role-key");
    expect(init.headers.apikey).not.toBe("public-anon-key");
  });

  it("fails closed before network access when the service-role credential is absent", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    await expect(insertDiagnosticResult(SAMPLE_RESULT)).rejects.toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
