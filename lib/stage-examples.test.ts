import { describe, it, expect } from "vitest";
import { STAGES } from "./stage-meta";
import { STAGE_EXAMPLE, getStageExample } from "./stage-examples";

describe("stage-examples", () => {
  it("6단계 전부에 예시가 있다", () => {
    expect(Object.keys(STAGE_EXAMPLE).map(Number).sort()).toEqual(
      STAGES.map((s) => s.id).sort()
    );
  });

  it("빈 문자열이 없다", () => {
    for (const [id, text] of Object.entries(STAGE_EXAMPLE)) {
      expect(text.trim(), `stage ${id}가 비어 있다`).not.toBe("");
    }
  });

  it("금지어·느낌표가 없다", () => {
    const BANNED = ["충분히", "전략적으로", "적극적으로", "의도적으로", "무조건", "꼭", "무료", "당신", "!"];
    for (const [id, text] of Object.entries(STAGE_EXAMPLE)) {
      for (const w of BANNED) {
        expect(text, `stage ${id}에 '${w}'가 있다`).not.toContain(w);
      }
    }
  });

  it("getStageExample: 없는 단계는 빈 문자열", () => {
    expect(getStageExample(0)).toBe("");
  });
});
