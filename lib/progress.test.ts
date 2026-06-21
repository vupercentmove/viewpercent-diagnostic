import { describe, it, expect } from "vitest";
import {
  progressPercent,
  hasCrossedHalf,
  achievementLabel,
} from "@/lib/progress";

describe("progressPercent", () => {
  it("answered/total 백분율을 반올림한다", () => {
    expect(progressPercent(5, 10)).toBe(50);
    expect(progressPercent(0, 10)).toBe(0);
    expect(progressPercent(10, 10)).toBe(100);
  });

  it("total이 0 이하면 0", () => {
    expect(progressPercent(3, 0)).toBe(0);
    expect(progressPercent(3, -1)).toBe(0);
  });
});

describe("hasCrossedHalf", () => {
  it("절반 미만에서 절반 이상으로 넘어가면 true", () => {
    expect(hasCrossedHalf(4, 5, 10)).toBe(true);
  });

  it("이미 절반을 넘은 상태에서 더 진행하면 false", () => {
    expect(hasCrossedHalf(5, 6, 10)).toBe(false);
  });

  it("되돌아가는 경우 false", () => {
    expect(hasCrossedHalf(6, 4, 10)).toBe(false);
  });

  it("0에서 절반으로 점프해도 true", () => {
    expect(hasCrossedHalf(0, 5, 10)).toBe(true);
  });
});

describe("achievementLabel", () => {
  it("0개면 시작 라벨", () => {
    expect(achievementLabel(0, 10)).toBe("시작해볼게요");
  });

  it("0 초과 절반 미만이면 진행 라벨", () => {
    expect(achievementLabel(3, 10)).toBe("차곡차곡 쌓이는 중");
  });

  it("절반 이상이면 마무리 라벨", () => {
    expect(achievementLabel(5, 10)).toBe("거의 다 왔어요");
    expect(achievementLabel(10, 10)).toBe("거의 다 왔어요");
  });
});
