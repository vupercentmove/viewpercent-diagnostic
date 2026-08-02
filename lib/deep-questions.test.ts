import { describe, expect, it } from "vitest";
import { getDeepQuestionProgress } from "./deep-questions";

describe("deep question progress", () => {
  it("full 진단 문항의 전체 순번과 총 문항 수를 반환한다", () => {
    expect(getDeepQuestionProgress("d1a")).toEqual({ stepIndex: 0, totalSteps: 27 });
    expect(getDeepQuestionProgress("d2a")).toEqual({ stepIndex: 4, totalSteps: 27 });
    expect(getDeepQuestionProgress("d6e")).toEqual({ stepIndex: 26, totalSteps: 27 });
  });
});
