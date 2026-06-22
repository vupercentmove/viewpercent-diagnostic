import { describe, it, expect } from "vitest";
import { matchLabel, RESULT_LABELS, type ResultLabel } from "@/lib/result-labels";
import type { GapDiagnosis } from "@/lib/scoring";

const gap = (perceived: number, actual: number): GapDiagnosis => ({
  perceivedWorst: perceived,
  actualWorst: actual,
  hasGap: true,
  message: "m",
});

describe("matchLabel", () => {
  it("빈틈 정확 일치: gapPattern이 맞는 라벨을 고른다", () => {
    // gapPattern "1->4" 라벨이 actualWorst(4) baseline과 다른 라벨임을 보장하기 위해
    // 픽스처로 패턴 라벨이 actualWorst stage가 아닌 stageId를 갖게 한다.
    const labels: ResultLabel[] = [
      { id: "s4-base", stageId: 4, label: "L4", tagline: "t4" },
      { id: "gap-1-4", stageId: 1, gapPattern: "1->4", label: "G", tagline: "tg" },
    ];
    const r = matchLabel(gap(1, 4), { stageId: 4 }, labels);
    expect(r.id).toBe("gap-1-4");
  });

  it("빈틈 있으나 gapPattern 라벨 없음 → 실제(actualWorst) Stage baseline으로 폴백", () => {
    const labels: ResultLabel[] = [
      { id: "s4-base", stageId: 4, label: "L4", tagline: "t4" },
      { id: "s3-base", stageId: 3, label: "L3", tagline: "t3" },
    ];
    const r = matchLabel(gap(1, 4), { stageId: 3 }, labels);
    expect(r.id).toBe("s4-base");
  });

  it("빈틈 없음 → worstStage baseline", () => {
    const labels: ResultLabel[] = [
      { id: "s4-base", stageId: 4, label: "L4", tagline: "t4" },
      { id: "s3-base", stageId: 3, label: "L3", tagline: "t3" },
    ];
    const r = matchLabel(null, { stageId: 3 }, labels);
    expect(r.id).toBe("s3-base");
  });

  it("동률이면 priority가 높은 라벨", () => {
    const labels: ResultLabel[] = [
      { id: "s2-low", stageId: 2, label: "L", tagline: "t", priority: 0 },
      { id: "s2-high", stageId: 2, label: "L", tagline: "t", priority: 5 },
    ];
    const r = matchLabel(null, { stageId: 2 }, labels);
    expect(r.id).toBe("s2-high");
  });

  it("실제 데이터의 6개 Stage 전부에서 non-null 라벨을 반환한다", () => {
    for (let stageId = 1; stageId <= 6; stageId++) {
      const r = matchLabel(null, { stageId });
      expect(r).not.toBeNull();
      expect(r.label.length).toBeGreaterThan(0);
      expect(r.stageId).toBeGreaterThanOrEqual(0);
    }
  });

  it("결정적: 같은 입력에 항상 같은 라벨", () => {
    const a = matchLabel(gap(1, 3), { stageId: 3 });
    const b = matchLabel(gap(1, 3), { stageId: 3 });
    expect(a.id).toBe(b.id);
  });
});

describe("RESULT_LABELS 데이터 무결성", () => {
  it("Stage 1~6 baseline(gapPattern 없음)이 각각 최소 1개 존재한다", () => {
    for (let stageId = 1; stageId <= 6; stageId++) {
      const baseline = RESULT_LABELS.filter(
        (l) => l.stageId === stageId && !l.gapPattern
      );
      expect(baseline.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("id가 중복되지 않는다", () => {
    const ids = RESULT_LABELS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
