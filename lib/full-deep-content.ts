export type StageExplainer = { why: string; goodLooksLike: string };

export const FULL_DEEP_EXPLAINER: Record<number, StageExplainer> = {
  1: {
    why: "이 단계는 '어떻게 알고 들어오는가'예요. 여기가 얕으면 광고비를 더 써도 같은 자리에서 새요.",
    goodLooksLike: "광고 말고도 검색·콘텐츠·후기로 찾아오는 길이 여러 개 열려 있는 상태예요.",
  },
  2: {
    why: "들어온 고객이 머무는 단계예요. 첫인상에서 '이 브랜드가 나를 안다'가 안 느껴지면 3초 안에 나가요.",
    goodLooksLike: "메인만 봐도 이 브랜드의 분위기와 결이 한 문장으로 읽히는 상태예요.",
  },
  3: {
    why: "상품 매력을 보여주되 '나한테 맞을까' 불안을 풀어주는 단계예요. 매력만 있고 불안이 남으면 안 사요.",
    goodLooksLike: "상세페이지가 체형·사이즈 걱정을 후기와 착용 정보로 미리 풀어주는 상태예요.",
  },
  4: {
    why: "관심이 구매 확신으로 넘어가는 단계예요. 여기서 막히면 장바구니까지 왔다가 결제 직전에 돌아가요.",
    goodLooksLike: "이탈 리마인드·사이즈 후기·간편결제로 결제 직전 불안이 낮은 상태예요.",
  },
  5: {
    why: "산 뒤 기다리는 단계예요. 감사와 안내가 형식적이면 첫 경험이 밋밋하게 남아요.",
    goodLooksLike: "주문 후 안내가 매번 조금씩 새롭고, 기다리는 시간이 기대로 바뀌는 상태예요.",
  },
  6: {
    why: "받고 난 뒤의 단계예요. 사람이 안 보이고 시스템처럼 느껴지면 재구매로 이어지기 어려워요.",
    goodLooksLike: "수령 후에도 브랜드와 교감했다고 느껴 다시 찾는 이유가 생기는 상태예요.",
  },
};

export function getExplainer(stageId: number): StageExplainer {
  return FULL_DEEP_EXPLAINER[stageId] ?? { why: "", goodLooksLike: "" };
}

export const VISION_QUESTION = {
  id: "vision",
  text: "매출이 지금보다 성장한다면, 가장 먼저 뭘 하고 싶으세요?",
  options: ["제품·촬영에 더 투자하기", "사람을 뽑아 손 덜 가게 하기", "내 시간 되찾기", "새 브랜드·라인 시작하기"],
} as const;

export type IcpSignals = {
  adSpendBand?: "under_300" | "300_1000" | "over_1000";
  contentOngoing?: boolean;
};

export const ICP_QUESTIONS = [
  {
    id: "icp_adspend",
    kind: "select" as const,
    text: "지금 광고비, 한 달에 대략 얼마 쓰고 계세요?",
    options: [
      { label: "월 300만원 미만", value: "under_300" as const },
      { label: "월 300만 ~ 1000만원", value: "300_1000" as const },
      { label: "월 1000만원 이상", value: "over_1000" as const },
    ],
  },
  {
    id: "icp_content",
    kind: "yn" as const,
    text: "영상·콘텐츠를 꾸준히(주 1회 이상) 만들고 계세요?",
  },
] as const;

export function computeIcpFlag(s: IcpSignals): boolean {
  return (
    (s.adSpendBand === "300_1000" || s.adSpendBand === "over_1000") &&
    s.contentOngoing === true
  );
}
