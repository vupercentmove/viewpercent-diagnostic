import { describe, it, expect } from "vitest";
import { matchCase } from "@/lib/case-match";
import type { CaseStudy } from "@/lib/cases";
import type { GapDiagnosis } from "@/lib/scoring";

const gapCase: CaseStudy = {
  id: "gap", brandType: "B", stageId: 3, gapPattern: "1->3",
  symptom: "s", realCause: "r", action: "a", result: "res",
};
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
    const r = matchCase(gap(1, 3), { stageId: 3 }, [gapCase, stage3Case]);
    expect(r?.id).toBe("gap");
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
});
