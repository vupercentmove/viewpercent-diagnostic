import { describe, it, expect } from "vitest";
import { resolveComment, resolveFullComment } from "./ai-fallback";

const FALLBACK = "지금은 구매결정 단계에서 가장 많이 새고 있어요.";

describe("resolveFullComment", () => {
  it("정리 후 내용이 남으면 폴백 표시 없이 그대로 반환한다", () => {
    expect(resolveFullComment("대표님은 지금 잘 하고 계세요.", FALLBACK)).toEqual({
      comment: "대표님은 지금 잘 하고 계세요.",
    });
  });

  it("마크다운·라벨을 벗기고 남은 문장을 반환한다", () => {
    expect(resolveFullComment("**되받기** 상품은 좋아요", FALLBACK)).toEqual({
      comment: "상품은 좋아요",
    });
  });

  it("라벨만 있어 정리 후 빈 문자열이면 폴백으로 대체하고 이유를 남긴다", () => {
    expect(resolveFullComment("**되받기**\n**인과**\n**트리거**", FALLBACK)).toEqual({
      comment: FALLBACK,
      fallback: true,
      reason: "empty_after_clean",
    });
  });

  it("빈 응답도 폴백으로 대체한다", () => {
    expect(resolveFullComment("", FALLBACK)).toEqual({
      comment: FALLBACK,
      fallback: true,
      reason: "empty_after_clean",
    });
  });

  it("공백뿐인 응답도 폴백으로 대체한다", () => {
    expect(resolveFullComment("   \n  \n ", FALLBACK).reason).toBe("empty_after_clean");
  });
});

describe("resolveComment — 수치 가드", () => {
  it("진단에 없는 성과 수치를 지어내면 폴백으로 대체한다", () => {
    expect(
      resolveComment("이 방법을 쓰면 이탈률이 20퍼센트 내려가요", FALLBACK, [38, 62])
    ).toEqual({
      comment: FALLBACK,
      fallback: true,
      reason: "ungrounded_number",
    });
  });

  it("제공된 점수를 인용한 수치는 그대로 통과시킨다", () => {
    expect(resolveComment("구매결정이 38점으로 가장 낮아요", FALLBACK, [38, 62])).toEqual({
      comment: "구매결정이 38점으로 가장 낮아요",
    });
  });

  it("빈 응답은 수치 가드보다 empty_after_clean이 우선한다", () => {
    expect(resolveComment("", FALLBACK, [38]).reason).toBe("empty_after_clean");
  });

  it("allowedNumbers를 안 넘기면 모든 성과 수치를 근거 없음으로 본다", () => {
    expect(resolveComment("전환이 10% 올라요", FALLBACK).reason).toBe("ungrounded_number");
  });

  // 2026-08-17 프로덕션 실측: 최약이 STAGE 3인데 코멘트는 STAGE 4(90점)를 지목했다.
  // 헤로와 코멘트가 한 화면에서 다른 단계를 말해 결과 신뢰도를 깎았다.
  it("최약 단계가 아닌 다른 단계만 지목하면 wrong_stage로 폴백한다", () => {
    const observed =
      "지금 상품 페이지까지는 고객을 잘 데려오는데 실제 구매 결정 단계에서 이탈이 생기고 있네요.";
    expect(resolveComment(observed, FALLBACK, [], 3)).toEqual({
      comment: FALLBACK,
      fallback: true,
      reason: "wrong_stage",
    });
  });

  it("최약 단계를 함께 말하면 다른 단계를 언급해도 통과한다", () => {
    const ok = "쇼핑의 시작에서 막혀요. 구매결정까지는 잘 오고 있어요.";
    expect(resolveComment(ok, FALLBACK, [], 3)).toEqual({ comment: ok });
  });

  it("weakestStage를 안 넘기면 단계 가드를 적용하지 않는다 (기존 호출부 호환)", () => {
    const observed = "실제 구매 결정 단계에서 이탈이 생기고 있네요.";
    expect(resolveComment(observed, FALLBACK).comment).toBe(observed);
  });
});
