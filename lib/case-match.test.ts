import { describe, it, expect } from "vitest";
import { matchCase, isGapMatch } from "@/lib/case-match";
import type { CaseStudy } from "@/lib/cases";
import type { GapDiagnosis } from "@/lib/scoring";

const stage3Case: CaseStudy = {
  id: "s3", brandType: "B", stageId: 3,
  symptom: "s", realCause: "r", action: "a", result: "res",
};
const stage2Low: CaseStudy = {
  id: "s2-low", brandType: "B", stageId: 2, priority: 0,
  symptom: "s", realCause: "r", action: "a", result: "res",
};
const stage2High: CaseStudy = {
  id: "s2-high", brandType: "B", stageId: 2, priority: 5,
  symptom: "s", realCause: "r", action: "a", result: "res",
};

const gap = (perceived: number, actual: number): GapDiagnosis => ({
  perceivedWorst: perceived, actualWorst: actual, hasGap: true, message: "m",
});

describe("matchCase", () => {
  it("빈틈 정확 일치: gapPattern이 맞는 사례를 고른다", () => {
    // gapCaseAlt has gapPattern "1->3" but stageId 4 (≠ actualWorst 3),
    // so only the gapPattern path can select it over the stage-3 fallback.
    const gapCaseAlt: CaseStudy = {
      id: "gap-alt", brandType: "B", stageId: 4, gapPattern: "1->3",
      symptom: "s", realCause: "r", action: "a", result: "res",
    };
    const r = matchCase(gap(1, 3), { stageId: 3 }, [stage3Case, gapCaseAlt]);
    expect(r?.id).toBe("gap-alt");
  });

  it("빈틈 있으나 gapPattern 사례 없음 → 실제 Stage로 폴백", () => {
    const r = matchCase(gap(1, 3), { stageId: 3 }, [stage3Case]);
    expect(r?.id).toBe("s3");
  });

  it("빈틈 없음 → 최약 Stage 일치 사례", () => {
    const r = matchCase(null, { stageId: 3 }, [stage3Case, stage2Low]);
    expect(r?.id).toBe("s3");
  });

  it("동률이면 priority가 높은 사례", () => {
    const r = matchCase(null, { stageId: 2 }, [stage2Low, stage2High]);
    expect(r?.id).toBe("s2-high");
  });

  it("매칭 없으면 null", () => {
    const r = matchCase(null, { stageId: 5 }, [stage3Case, stage2Low]);
    expect(r).toBeNull();
  });

  it("동률 + seedInput 없음 → 항상 배열의 첫 후보(결정적)", () => {
    const a: CaseStudy = {
      id: "tie-a", brandType: "B", stageId: 6,
      symptom: "s", realCause: "r", action: "a", result: "res",
    };
    const b: CaseStudy = {
      id: "tie-b", brandType: "B", stageId: 6,
      symptom: "s", realCause: "r", action: "a", result: "res",
    };
    const r1 = matchCase(null, { stageId: 6 }, [a, b]);
    const r2 = matchCase(null, { stageId: 6 }, [a, b]);
    expect(r1?.id).toBe("tie-a");
    expect(r2?.id).toBe("tie-a");
  });

  it("동률 + seedInput 동일 → 항상 같은 사례(같은 응답이면 같은 결과, hydration-safe)", () => {
    const a: CaseStudy = {
      id: "tie-a", brandType: "B", stageId: 6,
      symptom: "s", realCause: "r", action: "a", result: "res",
    };
    const b: CaseStudy = {
      id: "tie-b", brandType: "B", stageId: 6,
      symptom: "s", realCause: "r", action: "a", result: "res",
    };
    const seed = JSON.stringify({ q1: "yes", q2: "no" });
    const r1 = matchCase(null, { stageId: 6 }, [a, b], seed);
    const r2 = matchCase(null, { stageId: 6 }, [a, b], seed);
    expect(r1?.id).toBe(r2?.id);
  });

  it("동률 + seedInput 다름 → 서로 다른 사례가 나올 수 있다(둘 다 존재하는 후보 중 하나)", () => {
    const a: CaseStudy = {
      id: "tie-a", brandType: "B", stageId: 6,
      symptom: "s", realCause: "r", action: "a", result: "res",
    };
    const b: CaseStudy = {
      id: "tie-b", brandType: "B", stageId: 6,
      symptom: "s", realCause: "r", action: "a", result: "res",
    };
    const ids = new Set(
      Array.from({ length: 20 }, (_, i) =>
        matchCase(null, { stageId: 6 }, [a, b], `seed-${i}`)?.id
      )
    );
    // 후보가 2개뿐이므로 20개 시드로 돌리면 둘 다 최소 한 번은 나와야 한다
    expect(ids.has("tie-a")).toBe(true);
    expect(ids.has("tie-b")).toBe(true);
    // 나온 값은 항상 두 후보 중 하나
    Array.from(ids).forEach((id) => {
      expect(["tie-a", "tie-b"]).toContain(id);
    });
  });

  it("priority가 다르면 seedInput이 있어도 priority가 우선(동률일 때만 seed 적용)", () => {
    const r = matchCase(null, { stageId: 2 }, [stage2Low, stage2High], "any-seed");
    expect(r?.id).toBe("s2-high");
  });
});

describe("isGapMatch", () => {
  it("gap이 있고 매칭 사례의 gapPattern이 빈틈 패턴과 일치하면 true", () => {
    const matched: CaseStudy = {
      id: "g", brandType: "B", stageId: 3, gapPattern: "1->3",
      symptom: "s", realCause: "r", action: "a", result: "res",
    };
    expect(isGapMatch(gap(1, 3), matched)).toBe(true);
  });

  it("gap이 없으면 false", () => {
    const matched: CaseStudy = {
      id: "g", brandType: "B", stageId: 3, gapPattern: "1->3",
      symptom: "s", realCause: "r", action: "a", result: "res",
    };
    expect(isGapMatch(null, matched)).toBe(false);
  });

  it("매칭 사례에 gapPattern이 없으면 false", () => {
    const matched: CaseStudy = {
      id: "g", brandType: "B", stageId: 3,
      symptom: "s", realCause: "r", action: "a", result: "res",
    };
    expect(isGapMatch(gap(1, 3), matched)).toBe(false);
  });

  it("gapPattern이 빈틈 패턴과 다르면 false", () => {
    const matched: CaseStudy = {
      id: "g", brandType: "B", stageId: 3, gapPattern: "1->2",
      symptom: "s", realCause: "r", action: "a", result: "res",
    };
    expect(isGapMatch(gap(1, 3), matched)).toBe(false);
  });
});
