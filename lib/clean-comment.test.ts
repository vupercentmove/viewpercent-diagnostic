import { describe, it, expect } from "vitest";
import { cleanComment } from "./clean-comment";

describe("cleanComment", () => {
  it("별표(**) 마커 제거", () => {
    expect(cleanComment("**되받기** 상품은 좋아요")).toBe("상품은 좋아요");
  });
  it("구조 라벨 + 구분자 제거", () => {
    expect(cleanComment("되받기: 지금 이렇게 하고 있죠")).toBe("지금 이렇게 하고 있죠");
    expect(cleanComment("인과 — 여기서 막혀요")).toBe("여기서 막혀요");
  });
  it("번호/불릿 앞머리 제거", () => {
    expect(cleanComment("1) 첫 문장")).toBe("첫 문장");
    expect(cleanComment("- 둘째 문장")).toBe("둘째 문장");
  });
  it("여러 줄: 순서 유지 + 빈 줄 제거 + 마커 제거", () => {
    expect(cleanComment("**되받기** A\n\n2) B\n트리거 — C")).toBe("A\nB\nC");
  });
  it("이미 깨끗한 문장은 그대로", () => {
    expect(cleanComment("상품 매력은 강점이에요.")).toBe("상품 매력은 강점이에요.");
  });
});
