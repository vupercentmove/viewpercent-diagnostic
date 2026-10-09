import { describe, expect, it } from "vitest";
import { createAdminSessionToken, verifyAdminSessionToken } from "./admin-session";

const SECRET = "0123456789abcdef0123456789abcdef";
const NOW = 1_800_000_000_000;

const nonce = new Uint8Array(Array.from({ length: 32 }, (_, index) => index));

describe("admin session tokens", () => {
  it("랜덤 nonce와 만료시각에 서명한 토큰을 검증한다", async () => {
    const token = await createAdminSessionToken({ secret: SECRET, now: NOW, ttlMs: 60_000, nonce });
    expect(token).not.toContain("test-secret");
    expect(await verifyAdminSessionToken(token, SECRET, NOW + 59_999)).toBe(true);
  });

  it("변조·만료·비밀키 불일치는 모두 거부한다", async () => {
    const token = await createAdminSessionToken({ secret: SECRET, now: NOW, ttlMs: 60_000, nonce });
    expect(await verifyAdminSessionToken(`${token}x`, SECRET, NOW)).toBe(false);
    expect(await verifyAdminSessionToken(token, SECRET, NOW + 60_000)).toBe(false);
    expect(await verifyAdminSessionToken(token, `${SECRET}x`, NOW)).toBe(false);
  });

  it("짧은 세션 비밀키는 발급도 검증도 실패 폐쇄한다", async () => {
    await expect(createAdminSessionToken({ secret: "short", now: NOW, ttlMs: 60_000, nonce })).rejects.toThrow();
    expect(await verifyAdminSessionToken("v1.1.a.b", "short", NOW)).toBe(false);
  });
});
