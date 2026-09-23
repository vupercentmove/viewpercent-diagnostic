/**
 * 6단계 진단 → 코치가 실제 상담에서 쓰는 매출 공식 언어.
 *
 * 배경(2026-09-24 실상담 대조): 첫 상담 5건 녹음 원문에서 진단 도구의 6단계는 한 번도
 * 쓰이지 않았다. 코치는 "매출의 3요소(방문자 수 × 전환율 × 객단가)"로 진단했다.
 * 두 틀은 모순이 아니지만 상담이 도구 결과를 이어받지 못하고 처음부터 다시 시작했다.
 * 약점 단계 카드에 이 한 줄을 붙여, 대표가 보내는 결과 링크를 연 상담이 같은 언어로
 * 바로 출발하게 한다.
 *
 * 매핑 근거 — vault `뷰퍼센트/08_세일즈머신/코칭-프로세스-정본.md` 프레임 표:
 *   - 매출 3요소 "방문자 수 곱하기 전환율 곱하기 객단가" → STAGE 1은 방문자 수,
 *     STAGE 2~4는 들어온 고객을 구매로 잇는 전환율
 *   - 매출 = 기존 + 신규 "매출은 기존 고객 플러스 신규 고객" → STAGE 5~6은 기존 고객
 *   - 객단가는 6단계 어느 하나에 또렷이 대응하지 않아 억지로 붙이지 않는다
 *
 * ⚠️ 표시용이다. 스코어링과 무관하고, 문구는 무브 승인본이다.
 */

export type RevenueLeverKey = "visitors" | "conversion" | "returning";

export interface RevenueLever {
  key: RevenueLeverKey;
  /** 칩에 쓰는 짧은 이름 */
  label: string;
  /** 카드에 붙는 한 문장 */
  line: string;
}

export const REVENUE_LEVERS: Record<RevenueLeverKey, RevenueLever> = {
  visitors: {
    key: "visitors",
    label: "방문자 수",
    line: "매출 공식(방문자 수 × 전환율 × 객단가)으로 보면, 이 구간은 방문자 수를 만드는 쪽이에요.",
  },
  conversion: {
    key: "conversion",
    label: "전환율",
    line: "매출 공식(방문자 수 × 전환율 × 객단가)으로 보면, 이 구간은 들어온 고객을 구매로 잇는 전환율 쪽이에요.",
  },
  returning: {
    key: "returning",
    label: "기존 고객",
    line: "매출은 기존 고객과 신규 고객의 합이에요. 이 구간은 한 번 산 고객이 다시 오는 기존 고객 쪽이에요.",
  },
};

const STAGE_TO_LEVER: Record<number, RevenueLeverKey> = {
  1: "visitors",
  2: "conversion",
  3: "conversion",
  4: "conversion",
  5: "returning",
  6: "returning",
};

/** 알 수 없는 단계면 null — 호출부는 렌더하지 않는다. */
export function getRevenueLever(stageId: number): RevenueLever | null {
  const key = STAGE_TO_LEVER[stageId];
  return key ? REVENUE_LEVERS[key] : null;
}
