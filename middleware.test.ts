import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

const PASSWORD = "test-secret";

function req(path: string, cookie?: string) {
  const r = new NextRequest(new URL(`https://example.com${path}`));
  if (cookie) r.cookies.set("admin_auth", cookie);
  return r;
}

describe("admin middleware", () => {
  const original = process.env.ADMIN_PASSWORD;
  beforeEach(() => {
    process.env.ADMIN_PASSWORD = PASSWORD;
  });
  afterEach(() => {
    process.env.ADMIN_PASSWORD = original;
  });

  it("인증 없는 /api/admin/* 요청은 401", () => {
    for (const path of ["/api/admin/stats", "/api/admin/results?limit=30"]) {
      expect(middleware(req(path)).status, path).toBe(401);
    }
  });

  it("쿠키 값이 틀리면 401", () => {
    expect(middleware(req("/api/admin/stats", "wrong")).status).toBe(401);
  });

  it("로그인 라우트는 인증 없이 통과 (무한 루프 방지)", () => {
    expect(middleware(req("/api/admin/auth")).status).toBe(200);
    expect(middleware(req("/admin/login")).status).toBe(200);
  });

  it("올바른 쿠키면 통과", () => {
    expect(middleware(req("/api/admin/stats", PASSWORD)).status).toBe(200);
    expect(middleware(req("/admin/dashboard", PASSWORD)).status).toBe(200);
  });

  it("인증 없는 어드민 페이지는 로그인으로 리다이렉트", () => {
    const res = middleware(req("/admin/dashboard"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/admin/login");
  });

  it("ADMIN_PASSWORD 미설정이면 어떤 쿠키로도 통과 못 한다", () => {
    delete process.env.ADMIN_PASSWORD;
    expect(middleware(req("/api/admin/stats", "undefined")).status).toBe(401);
    expect(middleware(req("/api/admin/stats", "")).status).toBe(401);
  });
});
