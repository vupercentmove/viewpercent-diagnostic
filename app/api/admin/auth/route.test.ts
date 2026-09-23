import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { verifyAdminSessionToken } from "@/lib/admin-session";
import { createAdminAuthHandlers } from "@/lib/admin-auth-handler";

const PASSWORD = "test-secret";
const SESSION_SECRET = "0123456789abcdef0123456789abcdef";
const NOW = 1_800_000_000_000;
const NONCE = new Uint8Array(Array.from({ length: 32 }, (_, index) => index));

function request(password: unknown, ip: string) {
  return new Request("https://example.com/api/admin/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-test-client-identity": ip },
    body: JSON.stringify({ password }),
  });
}

describe("POST /api/admin/auth", () => {
  const originalPassword = process.env.ADMIN_PASSWORD;
  const originalSecret = process.env.ADMIN_SESSION_SECRET;

  beforeEach(() => {
    process.env.ADMIN_PASSWORD = PASSWORD;
    process.env.ADMIN_SESSION_SECRET = SESSION_SECRET;
  });
  afterEach(() => {
    if (originalPassword === undefined) delete process.env.ADMIN_PASSWORD;
    else process.env.ADMIN_PASSWORD = originalPassword;
    if (originalSecret === undefined) delete process.env.ADMIN_SESSION_SECRET;
    else process.env.ADMIN_SESSION_SECRET = originalSecret;
  });

  it("성공 시 password가 아닌 서명·만료 세션을 보안 쿠키로 발급한다", async () => {
    const sleep = vi.fn();
    const { POST } = createAdminAuthHandlers({ sleep, now: () => NOW, nonce: () => NONCE, isProduction: true });
    const res = await POST(request(PASSWORD, "198.51.100.81"));
    expect(res.status).toBe(200);
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("admin_auth=");
    expect(cookie).not.toContain(`admin_auth=${PASSWORD}`);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).toMatch(/Secure/i);
    expect(cookie).toMatch(/Max-Age=604800/i);
    const token = cookie.match(/admin_auth=([^;]+)/)?.[1];
    expect(await verifyAdminSessionToken(token, SESSION_SECRET, NOW)).toBe(true);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("실패는 주입 가능한 지연 뒤 401을 반환한다", async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const { POST } = createAdminAuthHandlers({ sleep, now: () => NOW, nonce: () => NONCE, isProduction: false });
    const res = await POST(request("wrong", "198.51.100.82"));
    expect(res.status).toBe(401);
    expect(sleep).toHaveBeenCalledWith(250);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("로그인 시도 한도를 넘으면 429로 실패 폐쇄한다", async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const { POST } = createAdminAuthHandlers({ sleep, now: () => NOW, nonce: () => NONCE, isProduction: false });
    const responses = [];
    for (let index = 0; index < 6; index += 1) {
      responses.push(await POST(request("wrong", "203.0.113.82")));
    }
    expect(responses.slice(0, 5).every((res) => res.status === 401)).toBe(true);
    expect(responses[5].status).toBe(429);
    expect(sleep).toHaveBeenCalledTimes(5);
  });

  it("세션 비밀키가 없으면 비밀번호가 맞아도 쿠키를 발급하지 않는다", async () => {
    delete process.env.ADMIN_SESSION_SECRET;
    const { POST } = createAdminAuthHandlers({ sleep: vi.fn(), now: () => NOW, nonce: () => NONCE, isProduction: false });
    const res = await POST(request(PASSWORD, "198.51.100.83"));
    expect(res.status).toBe(503);
    expect(res.headers.get("set-cookie")).toBeNull();
  });
});
