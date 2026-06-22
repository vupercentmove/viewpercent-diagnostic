import { describe, it, expect } from "vitest";
import { getStrengthStages } from "./strength-stages";

function makeScores(entries: [number, number][]) {
  return entries.map(([stageId, score]) => ({ stageId, score }));
}

describe("getStrengthStages", () => {
  it("최악 Stage는 제외됨", () => {
    const scores = makeScores([
      [1, 30],
      [2, 80],
      [3, 75],
      [4, 90],
      [5, 60],
      [6, 45],
    ]);
    const result = getStrengthStages(scores, 1); // worst=1
    expect(result.map((s) => s.stageId)).not.toContain(1);
  });

  it("good 태그(70+) 기준 최대 2개 반환", () => {
    const scores = makeScores([
      [1, 30],
      [2, 85],
      [3, 90],
      [4, 72],
      [5, 50],
      [6, 40],
    ]);
    const result = getStrengthStages(scores, 1);
    expect(result.length).toBe(2);
    result.forEach((s) => expect(s.score).toBeGreaterThanOrEqual(70));
  });

  it("good 없으면 최약 제외 상위 2개 반환", () => {
    const scores = makeScores([
      [1, 20],
      [2, 55],
      [3, 60],
      [4, 45],
      [5, 35],
      [6, 30],
    ]);
    const result = getStrengthStages(scores, 1);
    expect(result.length).toBe(2);
    expect(result[0].stageId).toBe(3); // 60점 1위
    expect(result[1].stageId).toBe(2); // 55점 2위
  });

  it("점수 내림차순 정렬", () => {
    const scores = makeScores([
      [1, 20],
      [2, 70],
      [3, 85],
      [4, 72],
      [5, 90],
      [6, 60],
    ]);
    const result = getStrengthStages(scores, 1);
    expect(result[0].score).toBeGreaterThanOrEqual(result[1].score);
  });

  it("message 필드가 항상 존재함", () => {
    const scores = makeScores([
      [1, 20],
      [2, 80],
      [3, 75],
      [4, 90],
      [5, 60],
      [6, 45],
    ]);
    const result = getStrengthStages(scores, 1);
    result.forEach((s) => {
      expect(typeof s.message).toBe("string");
      expect(s.message.length).toBeGreaterThan(0);
    });
  });
});
