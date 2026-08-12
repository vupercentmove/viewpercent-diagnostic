import { describe, it, expect } from "vitest";
import {
  resolveInflowSource,
  aggregateInflowSources,
  WIRING_TEST_REF,
} from "./inflow-source";

describe("resolveInflowSource", () => {
  it("ref가 있으면 ref를 쓴다", () => {
    expect(resolveInflowSource({ ref: "ig", utm_source: "instagram" })).toBe("ig");
  });

  it("ref가 없으면 utm_source로 내려간다", () => {
    expect(resolveInflowSource({ utm_source: "instagram" })).toBe("instagram");
  });

  it("공백뿐인 ref는 값이 없는 것으로 본다", () => {
    expect(resolveInflowSource({ ref: "   ", utm_source: "kakao" })).toBe("kakao");
  });

  it("둘 다 없으면 미상", () => {
    expect(resolveInflowSource({})).toBe("미상");
  });

  it("utm이 null이면 미상", () => {
    expect(resolveInflowSource(null)).toBe("미상");
  });
});

describe("aggregateInflowSources", () => {
  it("경로별 건수를 센다", () => {
    const rows = [
      { utm: { ref: "ig" } },
      { utm: { ref: "ig" } },
      { utm: { ref: "kakao" } },
    ];
    expect(aggregateInflowSources(rows)).toEqual([
      { source: "ig", count: 2 },
      { source: "kakao", count: 1 },
    ]);
  });

  it("utm 없는 건을 미상으로 남긴다 — 숨기지 않는다", () => {
    const rows = [{ utm: null }, { utm: null }, { utm: { ref: "ig" } }];
    expect(aggregateInflowSources(rows)).toEqual([
      { source: "미상", count: 2 },
      { source: "ig", count: 1 },
    ]);
  });

  it("배선 실증 레코드는 집계에서 뺀다", () => {
    const rows = [{ utm: { ref: WIRING_TEST_REF } }, { utm: { ref: "ig" } }];
    expect(aggregateInflowSources(rows)).toEqual([{ source: "ig", count: 1 }]);
  });

  it("건수가 같으면 이름 오름차순으로 정렬한다", () => {
    const rows = [{ utm: { ref: "kakao" } }, { utm: { ref: "ig" } }];
    expect(aggregateInflowSources(rows)).toEqual([
      { source: "ig", count: 1 },
      { source: "kakao", count: 1 },
    ]);
  });

  it("빈 목록은 빈 배열", () => {
    expect(aggregateInflowSources([])).toEqual([]);
  });
});
