import { describe, it, expect } from "vitest";
import { buildStageEvidence, hasEvidence } from "./full-deep-evidence";
import { UNKNOWN_ANSWER } from "./quiz-fallback";

// Stage 4 문항: d4a 이탈 복구(yn) / d4b 전환 촉진(yn) / d4c 사이즈 불안(yn)
// d4d 결제 편의(yn) / d4e 안전감(likert)
describe("full-deep-evidence", () => {
  it("점수를 끌어내린 응답만 low로 되짚는다", () => {
    const e = buildStageEvidence(4, { d4a: 0, d4b: 100, d4c: 0, d4d: 100, d4e: 100 });
    expect(e.low).toEqual(["이탈 복구", "사이즈 불안"]);
    expect(e.unknown).toEqual([]);
  });

  it("모름은 low가 아니라 unknown으로 분리한다", () => {
    const e = buildStageEvidence(4, {
      d4a: UNKNOWN_ANSWER,
      d4b: 0,
      d4c: 100,
      d4d: 100,
      d4e: 100,
    });
    expect(e.low).toEqual(["전환 촉진"]);
    expect(e.unknown).toEqual(["이탈 복구"]);
  });

  it("likert 중간값(50)은 근거로 쓰지 않는다", () => {
    const e = buildStageEvidence(4, { d4a: 100, d4b: 100, d4c: 100, d4d: 100, d4e: 50 });
    expect(e.low).toEqual([]);
  });

  it("likert 1~2점(0·25)은 low로 잡는다", () => {
    expect(buildStageEvidence(4, { d4e: 25 }).low).toEqual(["안전감"]);
    expect(buildStageEvidence(4, { d4e: 0 }).low).toEqual(["안전감"]);
  });

  it("미응답 문항은 근거에 넣지 않는다", () => {
    // 폴백으로 건너뛴 문항은 answers에 아예 없다 — unknown(모름)과 구분돼야 한다
    const e = buildStageEvidence(4, { d4a: 0 });
    expect(e.low).toEqual(["이탈 복구"]);
    expect(e.unknown).toEqual([]);
  });

  it("hasEvidence: 되짚을 게 없으면 false", () => {
    expect(hasEvidence({ low: [], unknown: [] })).toBe(false);
    expect(hasEvidence({ low: ["이탈 복구"], unknown: [] })).toBe(true);
    expect(hasEvidence({ low: [], unknown: ["안전감"] })).toBe(true);
  });
});
