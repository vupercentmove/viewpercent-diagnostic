import { describe, it, expect } from "vitest";
import { getBenchmark, getSampleSize } from "@/lib/benchmark";

const SIX_STAGES = (scores: number[]) =>
  scores.map((score, i) => ({ stageId: i + 1, score }));

describe("getSampleSize (표시광고법 게이트)", () => {
  it("실표본 미집계 상태에서는 null (seed 모드)", () => {
    expect(getSampleSize()).toBeNull();
  });
});

describe("getBenchmark", () => {
  it("seed 모드: isSeed=true, sampleSize=null", () => {
    const r = getBenchmark(50, SIX_STAGES([50, 50, 50, 50, 50, 50]));
    expect(r.isSeed).toBe(true);
    expect(r.sampleSize).toBeNull();
  });

  it("높은 점수 → 상위 백분위가 작다(1~99 범위, 상한 클램프)", () => {
    const r = getBenchmark(95, SIX_STAGES([90, 90, 90, 90, 90, 90]));
    expect(r.overallTopPercent).toBeGreaterThanOrEqual(1);
    expect(r.overallTopPercent).toBeLessThanOrEqual(10);
  });

  it("낮은 점수 → 상위 백분위가 크다(하한 클램프)", () => {
    const r = getBenchmark(15, SIX_STAGES([20, 20, 20, 20, 20, 20]));
    expect(r.overallTopPercent).toBeGreaterThanOrEqual(85);
    expect(r.overallTopPercent).toBeLessThanOrEqual(99);
  });

  it("가장 약한 단계를 정확히 식별", () => {
    const r = getBenchmark(55, SIX_STAGES([70, 65, 30, 60, 58, 50]));
    expect(r.weakestStageId).toBe(3);
    expect(r.weakestStageName).toBeTruthy();
  });

  it("weakestStageAheadPercent는 5~95로 클램프", () => {
    const high = getBenchmark(99, SIX_STAGES([99, 99, 99, 99, 99, 99]));
    const low = getBenchmark(1, SIX_STAGES([1, 1, 1, 1, 1, 1]));
    for (const r of [high, low]) {
      expect(r.weakestStageAheadPercent).toBeGreaterThanOrEqual(5);
      expect(r.weakestStageAheadPercent).toBeLessThanOrEqual(95);
    }
  });

  it("weakestStageAheadPercent 방향 — 낮은 점수일수록 앞선 브랜드가 많다", () => {
    const low = getBenchmark(1, SIX_STAGES([1, 1, 1, 1, 1, 1]));
    const high = getBenchmark(99, SIX_STAGES([99, 99, 99, 99, 99, 99]));
    expect(low.weakestStageAheadPercent).toBeGreaterThanOrEqual(85);
    expect(high.weakestStageAheadPercent).toBeLessThanOrEqual(15);
  });

  it("overallTopPercent는 항상 정수", () => {
    const r = getBenchmark(63, SIX_STAGES([55, 48, 71, 62, 60, 44]));
    expect(Number.isInteger(r.overallTopPercent)).toBe(true);
  });
});
