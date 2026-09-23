import { describe, it, expect } from "vitest";
import { STAGES } from "./stage-meta";
import { getRevenueLever, REVENUE_LEVERS } from "./revenue-lever";

/**
 * 6단계 → 코치가 실제 상담에서 쓰는 매출 공식 언어.
 * 근거: vault `뷰퍼센트/08_세일즈머신/코칭-프로세스-정본.md` 프레임 표,
 *       `뷰퍼센트/02_브랜드진단도구/실상담 대조 검증 … 2026-09-24.md` (6단계 사용 0/5).
 */
describe("revenue-lever — 단계별 매출 공식 매핑", () => {
  it("6단계 전부에 레버가 있다", () => {
    for (const s of STAGES) expect(getRevenueLever(s.id), `STAGE ${s.id}`).not.toBeNull();
  });

  it("매핑: 1=방문자 / 2·3·4=전환율 / 5·6=기존 고객", () => {
    expect(getRevenueLever(1)!.key).toBe("visitors");
    for (const id of [2, 3, 4]) expect(getRevenueLever(id)!.key).toBe("conversion");
    for (const id of [5, 6]) expect(getRevenueLever(id)!.key).toBe("returning");
  });

  it("알 수 없는 단계는 null — 호출부는 렌더하지 않는다", () => {
    expect(getRevenueLever(0)).toBeNull();
    expect(getRevenueLever(7)).toBeNull();
  });

  it("문구가 카피 정본을 지킨다 — 금지어·느낌표·명령형·성과 약속 없음", () => {
    const BANNED = ["충분히", "전략적으로", "적극적으로", "의도적으로", "무조건", "꼭", "무료", "당신", "!"];
    for (const lever of Object.values(REVENUE_LEVERS)) {
      for (const text of [lever.label, lever.line]) {
        for (const w of BANNED) expect(text, `'${w}' in ${lever.key}`).not.toContain(w);
        expect(text, `명령형 in ${lever.key}`).not.toMatch(/하세요|해보세요/);
        expect(text, `성과 약속 in ${lever.key}`).not.toMatch(/더 팔|오릅니다|늘어납니다/);
      }
    }
  });

  it("비유 체계를 섞지 않는다 — 원인 문장에 '새다'를 쓰지 않는다", () => {
    for (const lever of Object.values(REVENUE_LEVERS)) {
      expect(lever.line, lever.key).not.toMatch(/새[는고다]/);
    }
  });
});
