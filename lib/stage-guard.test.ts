import { describe, it, expect } from "vitest";
import { mentionsWrongStageOnly } from "./stage-guard";

// STAGES: 1 욕구·검색·방문 / 2 체류 / 3 쇼핑의 시작 / 4 구매결정
//         5 구매완료·기다림 / 6 배송·수령완료
describe("mentionsWrongStageOnly", () => {
  it("실제 관측 사례를 잡는다 — 최약이 STAGE 3인데 코멘트는 '구매 결정'을 지목", () => {
    // 2026-08-17 프로덕션 실측 문장. 정본은 '구매결정'인데 AI는 '구매 결정'으로 썼다.
    const observed =
      "지금 상품 페이지까지는 고객을 잘 데려오는데 실제 구매 결정 단계에서 이탈이 생기고 있네요.";
    expect(mentionsWrongStageOnly(observed, 3)).toBe(true);
  });

  it("최약 단계를 함께 말하면 다른 단계를 언급해도 통과", () => {
    const ok = "쇼핑의 시작에서 막히고 있어요. 체류까지는 잘 오고 있고요.";
    expect(mentionsWrongStageOnly(ok, 3)).toBe(false);
  });

  it("최약 단계만 말하면 통과", () => {
    expect(mentionsWrongStageOnly("쇼핑의 시작 단계가 지금 가장 얇아요.", 3)).toBe(false);
  });

  it("단계 이름을 하나도 안 쓰면 통과 — 지목 자체가 없으므로 어긋날 수 없다", () => {
    expect(mentionsWrongStageOnly("상세페이지에서 사이즈 불안을 먼저 풀어주세요.", 3)).toBe(false);
  });

  it("공백 변형을 흡수한다", () => {
    expect(mentionsWrongStageOnly("구매 완료·기다림이 문제예요.", 3)).toBe(true);
    expect(mentionsWrongStageOnly("쇼핑의  시작이 얇아요.", 3)).toBe(false);
  });

  it("최약 단계 id가 유효하지 않으면 판정하지 않는다", () => {
    expect(mentionsWrongStageOnly("구매결정이 문제예요.", 0)).toBe(false);
  });
});
