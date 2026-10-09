export function buildSupabaseServerHeaders(key: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: key,
  };

  // Supabase secret keys are not JWTs and must not be sent as Bearer tokens.
  // Legacy service_role JWTs still require the Authorization header.
  if (!key.startsWith("sb_secret_")) {
    headers.Authorization = `Bearer ${key}`;
  }

  return headers;
}
