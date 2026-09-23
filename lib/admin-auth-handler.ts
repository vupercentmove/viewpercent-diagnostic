import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminSessionToken } from "./admin-session";
import { hasOnlyKeys, isPlainRecord } from "./api-validation";
import { readBoundedJson } from "./http-body";
import { allowRequest } from "./rate-limit";

const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const LOGIN_POLICY = { namespace: "admin-login", limit: 5, windowMs: 15 * 60_000 } as const;

type Dependencies = {
  sleep: (milliseconds: number) => Promise<unknown>;
  now: () => number;
  nonce: () => Uint8Array;
  isProduction: boolean;
};

function sameSecret(candidate: string, expected: string): boolean {
  const candidateDigest = createHash("sha256").update(candidate, "utf8").digest();
  const expectedDigest = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(candidateDigest, expectedDigest);
}

export function createAdminAuthHandlers(overrides: Partial<Dependencies> = {}) {
  const dependencies: Dependencies = {
    sleep: (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
    now: () => Date.now(),
    nonce: () => crypto.getRandomValues(new Uint8Array(32)),
    isProduction: process.env.NODE_ENV === "production",
    ...overrides,
  };

  async function POST(request: Request) {
    const parsed = await readBoundedJson(request, 4_096);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    if (!isPlainRecord(parsed.value) || !hasOnlyKeys(parsed.value, ["password"]) || typeof parsed.value.password !== "string" || parsed.value.password.length > 256) {
      return NextResponse.json({ error: "invalid request" }, { status: 400 });
    }
    if (!(await allowRequest(request, LOGIN_POLICY, dependencies.now()))) {
      return NextResponse.json({ error: "로그인 시도가 너무 많습니다." }, { status: 429 });
    }

    const expectedPassword = process.env.ADMIN_PASSWORD;
    const sessionSecret = process.env.ADMIN_SESSION_SECRET;
    if (!expectedPassword || !sessionSecret) {
      return NextResponse.json({ error: "관리자 인증 설정이 없습니다." }, { status: 503 });
    }

    if (!sameSecret(parsed.value.password, expectedPassword)) {
      await dependencies.sleep(250);
      return NextResponse.json({ error: "비밀번호가 틀렸습니다." }, { status: 401 });
    }

    let token: string;
    try {
      token = await createAdminSessionToken({
        secret: sessionSecret,
        now: dependencies.now(),
        ttlMs: SESSION_TTL_SECONDS * 1_000,
        nonce: dependencies.nonce(),
      });
    } catch {
      return NextResponse.json({ error: "관리자 인증 설정이 올바르지 않습니다." }, { status: 503 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set("admin_auth", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: dependencies.isProduction,
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
    });
    return response;
  }

  async function DELETE() {
    const response = NextResponse.json({ ok: true });
    response.cookies.set("admin_auth", "", {
      httpOnly: true,
      sameSite: "lax",
      secure: dependencies.isProduction,
      path: "/",
      maxAge: 0,
    });
    return response;
  }

  return { POST, DELETE };
}
