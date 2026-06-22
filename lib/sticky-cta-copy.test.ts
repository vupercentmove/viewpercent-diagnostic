import { describe, it, expect } from "vitest";
import { buildStickyCtaCopy } from "@/lib/sticky-cta-copy";
import { STAGES } from "@/lib/stage-meta";
import type { GapDiagnosis } from "@/lib/scoring";

describe("buildStickyCtaCopy", () => {
  it("gap이 없으면 headline에 worstStage stageName이 반영된다", () => {
    for (const stage of STAGES) {
      const copy = buildStickyCtaCopy(stage.id, null);
      expect(copy.headline).toContain(stage.name);
    }
  });

  it("gap.hasGap이면 actualWorst stageName이 headline에 반영된다", () => {
    const gap: GapDiagnosis = {
      perceivedWorst: 1,
      actualWorst: 3,
      hasGap: true,
      message: "테스트 메시지",
    };
    const actualName = STAGES.find((s) => s.id === 3)!.name;
    const copy = buildStickyCtaCopy(1, gap);
    expect(copy.headline).toContain(actualName);
  });

  it("button은 항상 '이 빈틈, 카톡으로 봐드릴게요'", () => {
    const copy1 = buildStickyCtaCopy(1, null);
    expect(copy1.button).toBe("이 빈틈, 카톡으로 봐드릴게요");

    const gap: GapDiagnosis = { perceivedWorst: 1, actualWorst: 3, hasGap: true, message: "" };
    const copy2 = buildStickyCtaCopy(1, gap);
    expect(copy2.button).toBe("이 빈틈, 카톡으로 봐드릴게요");
  });

  it("gap.hasGap=false인 GapDiagnosis는 stageId 기준으로 동작한다", () => {
    const gap: GapDiagnosis = { perceivedWorst: 2, actualWorst: 2, hasGap: false, message: "" };
    const name2 = STAGES.find((s) => s.id === 2)!.name;
    const copy = buildStickyCtaCopy(2, gap);
    expect(copy.headline).toContain(name2);
  });

  it("알 수 없는 stageId는 폴백을 사용한다 (throw 없음)", () => {
    const copy = buildStickyCtaCopy(999, null);
    expect(copy.headline.length).toBeGreaterThan(0);
    expect(copy.button.length).toBeGreaterThan(0);
    expect(copy.subnote.length).toBeGreaterThan(0);
  });

  it("subnote는 '채팅으로만'을 포함한다 (영업전화 안심)", () => {
    const copy = buildStickyCtaCopy(1, null);
    expect(copy.subnote).toContain("채팅으로만");
  });
});
