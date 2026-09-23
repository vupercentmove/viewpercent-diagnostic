const TOKEN_VERSION = "v1";
const MIN_SECRET_BYTES = 32;
const MAX_TTL_MS = 7 * 24 * 60 * 60 * 1_000;

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
}

function decodeBase64Url(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) return null;
  try {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
    const binary = atob(padded);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return Uint8Array.from(bytes).buffer;
}

async function signingKey(secret: string): Promise<CryptoKey> {
  const bytes = new TextEncoder().encode(secret);
  if (bytes.byteLength < MIN_SECRET_BYTES) throw new Error("ADMIN_SESSION_SECRET must be at least 32 bytes");
  return crypto.subtle.importKey("raw", bytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function createAdminSessionToken(input: {
  secret: string;
  now?: number;
  ttlMs?: number;
  nonce?: Uint8Array;
}): Promise<string> {
  const now = input.now ?? Date.now();
  const ttlMs = input.ttlMs ?? MAX_TTL_MS;
  if (!Number.isFinite(now) || !Number.isInteger(ttlMs) || ttlMs < 1 || ttlMs > MAX_TTL_MS) {
    throw new Error("invalid admin session lifetime");
  }
  const nonce = input.nonce ?? crypto.getRandomValues(new Uint8Array(32));
  if (nonce.byteLength < 16) throw new Error("admin session nonce is too short");
  const unsigned = `${TOKEN_VERSION}.${Math.floor(now + ttlMs)}.${encodeBase64Url(nonce)}`;
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", await signingKey(input.secret), new TextEncoder().encode(unsigned)));
  return `${unsigned}.${encodeBase64Url(signature)}`;
}

export async function verifyAdminSessionToken(token: string | undefined, secret: string | undefined, now = Date.now()): Promise<boolean> {
  try {
    if (!token || !secret) return false;
    const parts = token.split(".");
    if (parts.length !== 4 || parts[0] !== TOKEN_VERSION) return false;
    const expiresAt = Number(parts[1]);
    if (!Number.isSafeInteger(expiresAt) || expiresAt <= now || expiresAt - now > MAX_TTL_MS) return false;
    const nonce = decodeBase64Url(parts[2]);
    const signature = decodeBase64Url(parts[3]);
    if (!nonce || nonce.byteLength < 16 || !signature || signature.byteLength !== 32) return false;
    const unsigned = parts.slice(0, 3).join(".");
    return crypto.subtle.verify(
      "HMAC",
      await signingKey(secret),
      toArrayBuffer(signature),
      new TextEncoder().encode(unsigned)
    );
  } catch {
    return false;
  }
}
