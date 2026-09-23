import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const SERVER_BOUNDARIES = new Set([
  "lib/rate-limit.ts",
  "lib/supabase-admin.ts",
  "lib/supabase.ts",
]);

function productionSources(directory = ROOT): string[] {
  return readdirSync(directory).flatMap((name) => {
    if ([".git", ".next", "node_modules"].includes(name)) return [];
    const path = resolve(directory, name);
    if (statSync(path).isDirectory()) return productionSources(path);
    const repoPath = relative(ROOT, path).replaceAll("\\", "/");
    if (!/\.(?:ts|tsx)$/.test(repoPath) || /\.test\.(?:ts|tsx)$/.test(repoPath)) return [];
    return [repoPath];
  });
}

const sources = productionSources();
const sourceText = new Map(sources.map((path) => [path, readFileSync(resolve(ROOT, path), "utf8")]));

function resolveImport(importer: string, specifier: string): string | null {
  let target: string;
  if (specifier.startsWith("@/")) target = specifier.slice(2);
  else if (specifier.startsWith(".")) target = relative(ROOT, resolve(ROOT, dirname(importer), specifier)).replaceAll("\\", "/");
  else return null;

  for (const candidate of [target, `${target}.ts`, `${target}.tsx`, `${target}/index.ts`, `${target}/index.tsx`]) {
    if (sourceText.has(candidate)) return candidate;
  }
  return null;
}

function imports(path: string): string[] {
  const text = (sourceText.get(path) ?? "").replace(/^\s*import\s+type\s+.*$/gm, "");
  return [...text.matchAll(/(?:import|export)\s+(?:[^"']+?\s+from\s+)?["']([^"']+)["']/g)]
    .map((match) => resolveImport(path, match[1]))
    .filter((value): value is string => value !== null);
}

function reachableFrom(start: string): Set<string> {
  const visited = new Set<string>();
  const pending = [start];
  while (pending.length > 0) {
    const current = pending.pop();
    if (!current || visited.has(current)) continue;
    visited.add(current);
    pending.push(...imports(current));
  }
  return visited;
}

describe("production Supabase boundary inventory", () => {
  it("accounts for every production helper or route that references Supabase credentials/endpoints", () => {
    const accessFiles = sources.filter((path) => {
      const text = sourceText.get(path) ?? "";
      return /process\.env\.SUPABASE_(?:SERVICE_ROLE|ANON)_KEY/.test(text)
        || text.includes("/rest/v1/");
    });

    expect(accessFiles.sort()).toEqual([
      "app/api/admin/results/route.ts",
      "app/api/admin/stats/route.ts",
      "lib/rate-limit.ts",
      "lib/supabase-admin.ts",
      "lib/supabase.ts",
    ]);
  });

  it("accounts for every exported production mutation helper", () => {
    const mutationExports = ["lib/supabase.ts", "lib/rate-limit.ts"].flatMap((path) => {
      const text = sourceText.get(path) ?? "";
      return [...text.matchAll(/export async function ([A-Za-z0-9_]+)/g)].map((match) => `${path}:${match[1]}`);
    });

    expect(mutationExports.sort()).toEqual([
      "lib/rate-limit.ts:allowRequest",
      "lib/supabase.ts:insertDiagnosticResult",
      "lib/supabase.ts:insertWorkbookCheckpointConversion",
      "lib/supabase.ts:logAiCommentEvent",
      "lib/supabase.ts:markCtaClicked",
      "lib/supabase.ts:recordResultFeedback",
    ]);
  });

  it("has no client import path to service-role modules or credentials", () => {
    const clients = sources.filter((path) => /^\s*["']use client["'];/.test(sourceText.get(path) ?? ""));
    for (const client of clients) {
      const reachable = reachableFrom(client);
      expect([...reachable].filter((path) => SERVER_BOUNDARIES.has(path)), `${client} reaches a server credential boundary`)
        .toEqual([]);
      expect([...reachable].filter((path) => /process\.env\.SUPABASE_SERVICE_ROLE_KEY/.test(sourceText.get(path) ?? "")), `${client} reaches service-role key usage`)
        .toEqual([]);
    }
  });
});
