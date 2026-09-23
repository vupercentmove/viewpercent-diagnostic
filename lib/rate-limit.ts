import { isIP } from "node:net";
import { buildSupabaseServerHeaders } from "./supabase-headers";

type Bucket = { count: number; resetAt: number };
type Store = Map<string, Bucket>;

const globalRateLimit = globalThis as typeof globalThis & { __vpRateLimitStore?: Store };
const store = globalRateLimit.__vpRateLimitStore ?? new Map<string, Bucket>();
globalRateLimit.__vpRateLimitStore = store;

export interface RateLimitPolicy {
  namespace: string;
  limit: number;
  windowMs: number;
}

function clientAddress(request: Request): string | null {
  if (process.env.NODE_ENV === "production") {
    if (process.env.VERCEL !== "1") return null;
    const vercelAddress = request.headers.get("x-vercel-forwarded-for")?.trim();
    if (!vercelAddress || vercelAddress.includes(",") || isIP(vercelAddress) === 0) return null;
    return vercelAddress;
  }

  // Explicitly test/development-only. Production never reads this caller-controlled header.
  const testIdentity = request.headers.get("x-test-client-identity")?.trim();
  if (testIdentity && /^[A-Za-z0-9._:-]{1,128}$/.test(testIdentity)) return `test:${testIdentity}`;
  return "local";
}

function allowLocal(key: string, policy: RateLimitPolicy, now: number): boolean {
  const current = store.get(key);
  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + policy.windowMs });
    return true;
  }
  if (current.count >= policy.limit) return false;
  current.count += 1;

  if (store.size > 5_000) {
    for (const [candidate, bucket] of store) {
      if (bucket.resetAt <= now) store.delete(candidate);
    }
    if (store.size > 5_000) return false;
  }
  return true;
}

async function hashKey(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function allowDistributed(rawKey: string, policy: RateLimitPolicy): Promise<boolean> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return false;
  const response = await fetch(`${url}/rest/v1/rpc/check_rate_limit`, {
    method: "POST",
    headers: buildSupabaseServerHeaders(key),
    body: JSON.stringify({
      p_key: await hashKey(rawKey),
      p_limit: policy.limit,
      p_window_seconds: Math.max(1, Math.ceil(policy.windowMs / 1_000)),
    }),
  });
  if (!response.ok) {
    console.error(`[rate-limit] Supabase RPC rejected status=${response.status}`);
    return false;
  }
  return (await response.json().catch(() => false)) === true;
}

/**
 * Production uses an atomic, service-role-only Supabase RPC so limits survive serverless instances.
 * Tests/development use the deterministic in-process implementation. Every error denies.
 */
export async function allowRequest(request: Request, policy: RateLimitPolicy, now = Date.now()): Promise<boolean> {
  try {
    if (!Number.isInteger(policy.limit) || policy.limit < 1 || policy.windowMs < 1) return false;
    const address = clientAddress(request);
    if (!address) return false;
    const rawKey = `${policy.namespace}:${address}`;
    if (process.env.NODE_ENV === "production") return await allowDistributed(rawKey, policy);
    return allowLocal(rawKey, policy, now);
  } catch {
    return false;
  }
}
