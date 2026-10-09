import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";
import { createAdminSessionToken } from "@/lib/admin-session";

const PASSWORD = "test-secret";
const SESSION_SECRET = "0123456789abcdef0123456789abcdef";

function req(path: string, cookie?: string) {
  const request = new NextRequest(new URL(`https://example.com${path}`));
  if (cookie) request.cookies.set("admin_auth", cookie);
  return request;
}

describe("admin middleware", () => {
  const originalPassword = process.env.ADMIN_PASSWORD;
  const originalSessionSecret = process.env.ADMIN_SESSION_SECRET;

  beforeEach(() => {
    process.env.ADMIN_PASSWORD = PASSWORD;
    process.env.ADMIN_SESSION_SECRET = SESSION_SECRET;
  });
  afterEach(() => {
    if (originalPassword === undefined) delete process.env.ADMIN_PASSWORD;
    else process.env.ADMIN_PASSWORD = originalPassword;
    if (originalSessionSecret === undefined) delete process.env.ADMIN_SESSION_SECRET;
    else process.env.ADMIN_SESSION_SECRET = originalSessionSecret;
  });

  it("인증 없는 /api/admin/* 요청은 401", async () => {
    for (const path of ["/api/admin/stats", "/api/admin/results?limit=30"]) {
      expect((await middleware(req(path))).status, path).toBe(401);
    }
  });

  it("로그인 라우트는 인증 없이 통과한다", async () => {
    expect((await middleware(req("/api/admin/auth"))).status).toBe(200);
    expect((await middleware(req("/admin/login"))).status).toBe(200);
  });

  it("유효한 서명·만료 토큰만 통과한다", async () => {
    const token = await createAdminSessionToken({ secret: SESSION_SECRET });
    expect((await middleware(req("/api/admin/stats", token))).status).toBe(200);
    expect((await middleware(req("/admin/dashboard", token))).status).toBe(200);
  });

  it("이전 password-valued cookie는 더 이상 인증되지 않는다", async () => {
    expect((await middleware(req("/api/admin/stats", PASSWORD))).status).toBe(401);
  });

  it("변조되거나 만료된 토큰은 거부한다", async () => {
    const token = await createAdminSessionToken({ secret: SESSION_SECRET, now: 1, ttlMs: 1_000 });
    expect((await middleware(req("/api/admin/stats", `${token}x`))).status).toBe(401);
    expect((await middleware(req("/api/admin/stats", token))).status).toBe(401);
  });

  it("인증 없는 어드민 페이지는 로그인으로 리다이렉트한다", async () => {
    const res = await middleware(req("/admin/dashboard"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/admin/login");
  });

  it("세션 비밀키 미설정이면 어떤 쿠키로도 통과하지 못한다", async () => {
    delete process.env.ADMIN_SESSION_SECRET;
    expect((await middleware(req("/api/admin/stats", "anything"))).status).toBe(401);
  });
});
