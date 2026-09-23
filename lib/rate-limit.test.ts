import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { allowRequest } from "./rate-limit";

const POLICY = { namespace: "test-route", limit: 3, windowMs: 60_000 } as const;

function request(ip = "203.0.113.10") {
  return new Request("https://example.test/api", { headers: { "x-vercel-forwarded-for": ip } });
}

describe("distributed rate limiting", () => {
  const fetchMock = vi.fn();
  const saved = {
    url: process.env.SUPABASE_URL,
    anon: process.env.SUPABASE_ANON_KEY,
    service: process.env.SUPABASE_SERVICE_ROLE_KEY,
    vercel: process.env.VERCEL,
  };

  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.SUPABASE_URL = "https://x.supabase.co";
    process.env.SUPABASE_ANON_KEY = "public-anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "sb_secret_server-test";
    process.env.VERCEL = "1";
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: true, json: async () => true });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    for (const [name, value] of Object.entries({
      SUPABASE_URL: saved.url,
      SUPABASE_ANON_KEY: saved.anon,
      SUPABASE_SERVICE_ROLE_KEY: saved.service,
      VERCEL: saved.vercel,
    })) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });

  it("uses only the server credential for the atomic RPC", async () => {
    expect(await allowRequest(request(), POLICY)).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://x.supabase.co/rest/v1/rpc/check_rate_limit");
    expect(init.headers.apikey).toBe("sb_secret_server-test");
    expect(init.headers.Authorization).toBeUndefined();
    expect(init.headers.apikey).not.toBe("public-anon-key");
    expect(JSON.parse(init.body)).toEqual({
      p_key: expect.stringMatching(/^[0-9a-f]{64}$/),
      p_limit: 3,
      p_window_seconds: 60,
    });
  });

  it("fails closed before network access without the server credential", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(await allowRequest(request(), POLICY)).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("logs only the response status when the distributed RPC rejects the credential", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    process.env.SUPABASE_URL = "https://url-sentinel.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "sb_secret_service-key-sentinel";
    const sensitiveRequest = new Request("https://request-sentinel.example/api", {
      headers: {
        "x-vercel-forwarded-for": "203.0.113.222",
        "x-request-sentinel": "header-sentinel",
      },
    });
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: "Invalid API key", suppliedKey: "provider-body-sentinel" }),
    });

    expect(await allowRequest(sensitiveRequest, POLICY)).toBe(false);
    expect(errorSpy.mock.calls).toEqual([["[rate-limit] Supabase RPC rejected status=401"]]);
    const serializedCalls = JSON.stringify(errorSpy.mock.calls);
    for (const forbidden of [
      "url-sentinel",
      "request-sentinel",
      "203.0.113.222",
      "header-sentinel",
      "service-key-sentinel",
      "Invalid API key",
      "provider-body-sentinel",
      "x-vercel-forwarded-for",
      "apikey",
    ]) {
      expect(serializedCalls).not.toContain(forbidden);
    }
  });

  it.each([
    ["missing", new Request("https://example.test/api")],
    ["malformed", request("not-an-ip")],
    ["multiple values", request("203.0.113.10, 198.51.100.2")],
  ])("fails closed on %s Vercel client identity", async (_name, malformedRequest) => {
    expect(await allowRequest(malformedRequest, POLICY)).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses x-vercel-forwarded-for and ignores caller-spoofable forwarding headers", async () => {
    const first = new Request("https://example.test/api", { headers: {
      "x-vercel-forwarded-for": "203.0.113.10",
      "x-real-ip": "192.0.2.1",
      "x-forwarded-for": "192.0.2.2",
    } });
    const second = new Request("https://example.test/api", { headers: {
      "x-vercel-forwarded-for": "203.0.113.10",
      "x-real-ip": "198.51.100.1",
      "x-forwarded-for": "198.51.100.2",
    } });
    await allowRequest(first, POLICY);
    await allowRequest(second, POLICY);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).p_key)
      .toBe(JSON.parse(fetchMock.mock.calls[1][1].body).p_key);
  });

  it("never accepts the isolated development identity header in production", async () => {
    const spoof = new Request("https://example.test/api", { headers: { "x-test-client-identity": "test-1" } });
    expect(await allowRequest(spoof, POLICY)).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps increment/reset atomic and deletes only a bounded batch of expired buckets", () => {
    const sql = readFileSync(
      resolve(process.cwd(), "supabase/migrations/20260922000001_add_api_rate_limits.sql"),
      "utf8"
    ).replace(/--.*$/gm, " ").replace(/\s+/g, " ").toLowerCase();

    expect(sql).toMatch(/insert into public\.api_rate_limits[\s\S]*on conflict \(bucket_key\) do update/);
    expect(sql).toMatch(/returning request_count <= p_limit into allowed/);
    expect(sql).toMatch(/delete from public\.api_rate_limits where bucket_key in \( select bucket_key from public\.api_rate_limits where window_started_at < [\s\S]* limit 100 \)/);
  });

  it("rechecks expiration on the current tuple before cleanup deletion", () => {
    const migrationsDir = resolve(process.cwd(), "supabase/migrations");
    const sql = readdirSync(migrationsDir)
      .filter((name) => name.endsWith(".sql"))
      .sort()
      .map((name) => readFileSync(resolve(migrationsDir, name), "utf8"))
      .join("\n")
      .replace(/--.*$/gm, " ")
      .replace(/\s+/g, " ")
      .toLowerCase();
    const definitions = [...sql.matchAll(/create or replace function public\.check_rate_limit\([\s\S]*?\$\$;/g)];
    const latest = definitions.at(-1)?.[0] ?? "";

    expect(latest).toMatch(/delete from public\.api_rate_limits as current using expired/);
    expect(latest).toMatch(/current\.bucket_key = expired\.bucket_key and current\.window_started_at < observed_at - interval '1 day'/);
  });
});

describe("development identity isolation", () => {
  it("allows an explicit test identity only outside production", async () => {
    vi.stubEnv("NODE_ENV", "test");
    const policy = { namespace: `local-${Date.now()}`, limit: 1, windowMs: 60_000 };
    const localRequest = new Request("http://localhost/api", { headers: { "x-test-client-identity": "case-a" } });
    expect(await allowRequest(localRequest, policy, 1_000)).toBe(true);
    expect(await allowRequest(localRequest, policy, 1_001)).toBe(false);
    vi.unstubAllEnvs();
  });
});
