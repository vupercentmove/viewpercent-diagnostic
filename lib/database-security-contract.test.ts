import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATIONS_DIR = resolve(process.cwd(), "supabase/migrations");
const migrationFiles = readdirSync(MIGRATIONS_DIR).filter((name) => name.endsWith(".sql")).sort();
const migrations = migrationFiles.map((name) => ({
  name,
  sql: readFileSync(resolve(MIGRATIONS_DIR, name), "utf8")
    .replace(/--.*$/gm, "")
    .replace(/\s+/g, " ")
    .toLowerCase(),
}));
const allSql = migrations.map(({ sql }) => sql).join(" ");

const WRITE_TABLES = [
  "public.ai_comment_events",
  "public.api_rate_limits",
  "public.diagnostic_results",
  "public.workbook_checkpoint_conversions",
] as const;
const MUTATION_RPCS = [
  "public.check_rate_limit(text, integer, integer)",
  "public.claim_diagnostic(text)",
  "public.mark_cta_clicked(text)",
  "public.record_result_feedback(text, smallint, text, text)",
] as const;
const REVIEWED_READ_RPCS = [
  "public.get_ai_comment_stats()",
  "public.get_diagnostic_stats()",
  "public.lookup_diagnostic(text)",
] as const;
const PUBLIC_ROLES = ["public", "anon", "authenticated"] as const;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function latestStatement(pattern: RegExp): { migration: string; statement: string; order: number } | null {
  let latest: { migration: string; statement: string; order: number } | null = null;
  for (const [migrationIndex, migration] of migrations.entries()) {
    for (const match of migration.sql.matchAll(pattern)) {
      latest = {
        migration: migration.name,
        statement: match[0],
        order: migrationIndex * 1_000_000 + (match.index ?? 0),
      };
    }
  }
  return latest;
}

describe("database mutation-surface inventory", () => {
  it("accounts for every write table and SECURITY DEFINER RPC in migration history", () => {
    const tables = [...allSql.matchAll(/create table if not exists (public\.)?([a-z0-9_]+)/g)]
      .map((match) => `public.${match[2]}`)
      .sort();
    const securityDefiners = [...allSql.matchAll(/create or replace function (?:public\.)?([a-z0-9_]+)\s*\([^)]*\)[\s\S]*?security definer[\s\S]*?(?:\$function\$|\$\$);?/g)]
      .map((match) => match[1]);

    expect([...new Set(tables)]).toEqual(WRITE_TABLES);
    expect([...new Set(securityDefiners)].sort()).toEqual([
      ...MUTATION_RPCS.map((signature) => signature.match(/public\.([a-z0-9_]+)/)?.[1]),
      ...REVIEWED_READ_RPCS.map((signature) => signature.match(/public\.([a-z0-9_]+)/)?.[1]),
    ].sort());
  });

  it("leaves no public write policy active", () => {
    for (const table of WRITE_TABLES) {
      const createdPolicies = migrations.flatMap(({ sql }) =>
        [...sql.matchAll(new RegExp(`create policy "([^"]+)" on ${escapeRegExp(table)} for (insert|update|delete) to ([^;]+)`, "g"))]
          .filter((match) => PUBLIC_ROLES.some((role) => match[3].split(",").map((value) => value.trim()).includes(role)))
          .map((match) => match[1])
      );
      for (const policy of createdPolicies) {
        const lastCreate = latestStatement(new RegExp(`create policy "${escapeRegExp(policy)}" on ${escapeRegExp(table)}[^;]*;`, "g"));
        const lastDrop = latestStatement(new RegExp(`drop policy if exists "${escapeRegExp(policy)}" on ${escapeRegExp(table)};`, "g"));
        expect(lastDrop?.migration, `${table} policy ${policy} must be dropped after its last creation`)
          .toBeTruthy();
        expect((lastDrop?.order ?? -1) > (lastCreate?.order ?? -1), `${table} policy ${policy} was recreated after its drop`)
          .toBe(true);
      }
    }
  });
});

describe("database server-only mutation contracts", () => {
  it("explicitly revokes INSERT/UPDATE/DELETE from public roles on every write table", () => {
    for (const table of WRITE_TABLES) {
      for (const role of PUBLIC_ROLES) {
        const revoke = latestStatement(new RegExp(`revoke (?:all|(?:insert|update|delete)(?:, (?:insert|update|delete))*) on (?:table )?${escapeRegExp(table)} from [^;]*\\b${role}\\b[^;]*;`, "g"));
        const grant = latestStatement(new RegExp(`grant (?:all|(?:insert|update|delete)(?:, (?:insert|update|delete))*) on (?:table )?${escapeRegExp(table)} to [^;]*\\b${role}\\b[^;]*;`, "g"));
        expect(revoke?.migration, `${table} must revoke writes from ${role}`).toBeTruthy();
        expect((grant?.order ?? -1) > (revoke?.order ?? -1), `${table} has a later write grant to ${role}`).toBe(false);
      }
      expect(latestStatement(new RegExp(`grant (?:all|(?:insert|update|delete)(?:, (?:insert|update|delete))*) on (?:table )?${escapeRegExp(table)} to service_role;`, "g"))?.migration)
        .toBeTruthy();
    }
  });

  it("revokes EXECUTE on every mutation RPC from public roles and grants only service_role", () => {
    for (const signature of MUTATION_RPCS) {
      for (const role of PUBLIC_ROLES) {
        const revoke = latestStatement(new RegExp(`revoke (?:all|execute) on function ${escapeRegExp(signature)} from [^;]*\\b${role}\\b[^;]*;`, "g"));
        const grant = latestStatement(new RegExp(`grant execute on function ${escapeRegExp(signature)} to [^;]*\\b${role}\\b[^;]*;`, "g"));
        expect(revoke?.migration, `${signature} must revoke EXECUTE from ${role}`).toBeTruthy();
        expect((grant?.order ?? -1) > (revoke?.order ?? -1), `${signature} has a later EXECUTE grant to ${role}`).toBe(false);
      }
      expect(latestStatement(new RegExp(`grant execute on function ${escapeRegExp(signature)} to service_role;`, "g"))?.migration)
        .toBeTruthy();
    }
  });

  it("preserves the explicitly reviewed read/capability RPC grants", () => {
    const reviewed = new Map<string, readonly string[]>([
      ["public.get_ai_comment_stats()", ["anon", "authenticated"]],
      ["public.get_diagnostic_stats()", ["anon"]],
      ["public.lookup_diagnostic(text)", ["anon"]],
    ]);
    expect([...reviewed.keys()]).toEqual(REVIEWED_READ_RPCS);

    for (const [signature, roles] of reviewed) {
      const optionalSchemaSignature = escapeRegExp(signature).replace(/^public\\\./, "(?:public\\.)?");
      for (const role of roles) {
        const grant = latestStatement(new RegExp(`grant execute on function ${optionalSchemaSignature} to [^;]*\\b${role}\\b[^;]*;`, "g"));
        const revoke = latestStatement(new RegExp(`revoke (?:all|execute) on function ${optionalSchemaSignature} from [^;]*\\b${role}\\b[^;]*;`, "g"));
        expect(grant?.migration, `${signature} must remain executable by ${role}`).toBeTruthy();
        expect((revoke?.order ?? -1) > (grant?.order ?? -1), `${signature} was later revoked from ${role}`).toBe(false);
      }
    }
  });
});
