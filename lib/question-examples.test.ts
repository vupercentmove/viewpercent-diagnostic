import { describe, it, expect } from "vitest";
import { QUICK_QUESTIONS } from "./questions";
import { DEEP_QUESTIONS } from "./deep-questions";
import { QUESTION_EXAMPLE, getQuestionExample } from "./question-examples";
import { BANNED_WORDS, PERFORMANCE_PROMISE_PATTERN } from "./copy-canon";

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

  it("카피 정본 금지어가 없다", () => {
    for (const [id, text] of Object.entries(QUESTION_EXAMPLE)) {
      for (const word of BANNED_WORDS) {
        expect(text, `${id}에 '${word}'가 있다`).not.toContain(word);
      }
    }
  });

  it("느낌표를 쓰지 않는다", () => {
    for (const [id, text] of Object.entries(QUESTION_EXAMPLE)) {
      expect(text, `${id}에 느낌표가 있다`).not.toContain("!");
    }
  });

  it("성과를 약속하지 않는다", () => {
    for (const [id, text] of Object.entries(QUESTION_EXAMPLE)) {
      expect(text, `${id}가 성과를 약속한다`).not.toMatch(PERFORMANCE_PROMISE_PATTERN);
    }
  });
});
