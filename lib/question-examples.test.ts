import { describe, it, expect } from "vitest";
import { QUICK_QUESTIONS } from "./questions";
import { DEEP_QUESTIONS } from "./deep-questions";
import { QUESTION_EXAMPLE, getQuestionExample } from "./question-examples";

const ALL_IDS = [
  ...QUICK_QUESTIONS.map((q) => q.id),
  ...DEEP_QUESTIONS.map((q) => q.id),
];

describe("question-examples", () => {
  it("모든 문항에 예시가 있다 — 키 집합이 문항 id 집합과 정확히 같다", () => {
    expect(Object.keys(QUESTION_EXAMPLE).sort()).toEqual([...ALL_IDS].sort());
  });

  it("빈 문자열인 예시가 없다", () => {
    for (const [id, text] of Object.entries(QUESTION_EXAMPLE)) {
      expect(text.trim(), `${id}가 비어 있다`).not.toBe("");
    }
  });

  it("getQuestionExample: 없는 id는 빈 문자열", () => {
    expect(getQuestionExample("존재하지않는id")).toBe("");
  });

  it("getQuestionExample: 있는 id는 해당 예시", () => {
    expect(getQuestionExample("d4a")).toBe(QUESTION_EXAMPLE["d4a"]);
  });
});
