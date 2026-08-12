import { describe, it, expect } from "vitest";
import { findUngroundedMetrics } from "./numeric-guard";

describe("findUngroundedMetrics", () => {
  it("진단에 없는 퍼센트를 잡는다", () => {
    expect(findUngroundedMetrics("이탈률이 20퍼센트 정도 내려갈 거예요", [38, 62])).toEqual([
      "20퍼센트",
    ]);
  });

  it("% 기호도 잡는다", () => {
    expect(findUngroundedMetrics("전환율이 15% 오릅니다", [38])).toEqual(["15%"]);
  });

  it("'프로' 표기도 잡는다", () => {
    expect(findUngroundedMetrics("30프로 개선됩니다", [38])).toEqual(["30프로"]);
  });

  it("배수 표현도 잡는다", () => {
    expect(findUngroundedMetrics("매출이 2배 늘어요", [38])).toEqual(["2배"]);
  });

  it("제공된 점수를 인용한 수치는 통과시킨다", () => {
    expect(findUngroundedMetrics("구매결정이 38점으로 가장 낮아요", [38, 62])).toEqual([]);
    expect(findUngroundedMetrics("상위 38%에 해당해요", [38])).toEqual([]);
  });

  it("점수·단계 번호는 성과 수치가 아니므로 통과시킨다", () => {
    expect(findUngroundedMetrics("STAGE 3 구매결정이 38점입니다", [38])).toEqual([]);
  });

  it("프로그램·배송처럼 숫자 뒤 다른 단어는 오탐하지 않는다", () => {
    expect(findUngroundedMetrics("3프로젝트를 동시에 진행", [])).toEqual([]);
    expect(findUngroundedMetrics("2배송 지연이 있었어요", [])).toEqual([]);
  });

  it("수치가 없으면 빈 배열", () => {
    expect(findUngroundedMetrics("상세페이지 첫 문장을 먼저 손보세요", [])).toEqual([]);
  });

  it("여러 개를 모두 반환한다", () => {
    expect(findUngroundedMetrics("20% 오르고 3배 늘어요", [])).toEqual(["20%", "3배"]);
  });
});
