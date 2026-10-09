import { describe, expect, it } from "vitest";
import { buildSupabaseServerHeaders } from "./supabase-headers";

describe("Supabase server credential headers", () => {
  it("sends new secret keys only through apikey", () => {
    expect(buildSupabaseServerHeaders("sb_secret_example")).toEqual({
      "Content-Type": "application/json",
      apikey: "sb_secret_example",
    });
  });

  it("keeps Authorization Bearer for legacy service-role JWTs", () => {
    expect(buildSupabaseServerHeaders("eyJlegacy.jwt.value")).toEqual({
      "Content-Type": "application/json",
      apikey: "eyJlegacy.jwt.value",
      Authorization: "Bearer eyJlegacy.jwt.value",
    });
  });
});
