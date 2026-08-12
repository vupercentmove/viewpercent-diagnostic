/**
 * 유입경로 집계 — diagnostic_results.utm에서 채널을 뽑아 완료 건수를 센다.
 *
 * 집계 키 우선순위는 ref → utm_source → "미상" 으로 고정한다.
 * 스펙: docs/superpowers/specs/2026-08-11-진단OS-지표-정직화-design.md
 */

/** 배선 실증용 레코드의 ref 값. DB에서 지우지 않고 집계에서만 제외한다. */
export const WIRING_TEST_REF = "wiring-test";

export interface InflowCount {
  source: string;
  count: number;
}

/** utm 객체 하나에서 집계 키를 뽑는다. */
export function resolveInflowSource(
  utm: Record<string, string> | null | undefined
): string {
  const ref = utm?.ref?.trim();
  if (ref) return ref;
  const source = utm?.utm_source?.trim();
  if (source) return source;
  return "미상";
}

/**
 * 완료 레코드를 유입경로별 건수로 집계한다.
 * 건수 내림차순, 같으면 이름 오름차순.
 */
export function aggregateInflowSources(
  rows: { utm?: Record<string, string> | null }[]
): InflowCount[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const source = resolveInflowSource(row.utm);
    if (source === WIRING_TEST_REF) continue;
    counts.set(source, (counts.get(source) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count || a.source.localeCompare(b.source));
}
