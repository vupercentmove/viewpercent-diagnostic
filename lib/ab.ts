/**
 * 정밀 진단 pivotal 코치 한 줄 — 해시 기반 A/B
 *
 * localStorage에 저장된 방문자 id(vp_visitor_id)를 시드로 결정적 해시를 돌려
 * 방문자마다 안정적으로 같은 variant를 받는다. 서버 집계는 필요 없다 —
 * 클라이언트에서 즉시 판정하고 analytics 이벤트에 variant를 실어 보낸다.
 */

const VISITOR_ID_KEY = "vp_visitor_id";

/** seed 문자열의 charCode 합 % 2 로 A/B를 결정한다. 순수 함수 — 결정적. */
export function hashToVariant(seed: string): "A" | "B" {
  let sum = 0;
  for (let i = 0; i < seed.length; i++) {
    sum += seed.charCodeAt(i);
  }
  return sum % 2 === 0 ? "A" : "B";
}

/**
 * localStorage에서 방문자 id를 읽거나(없으면 생성해) hashToVariant에 넘긴다.
 * SSR/window 없음/스토리지 접근 실패 등 어떤 에러든 "A"로 안전하게 폴백한다.
 */
export function getFullDeepVariant(): "A" | "B" {
  try {
    if (typeof window === "undefined") return "A";
    let id = window.localStorage.getItem(VISITOR_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem(VISITOR_ID_KEY, id);
    }
    return hashToVariant(id);
  } catch {
    return "A";
  }
}
