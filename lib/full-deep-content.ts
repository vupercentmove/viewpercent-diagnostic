export type StageExplainer = { why: string; goodLooksLike: string };

export const FULL_DEEP_EXPLAINER: Record<number, StageExplainer> = {
  1: {
    why: "고객이 '왜, 어디서' 알고 들어오는지예요. 여기가 얕으면 광고비가 일한 만큼 쌓이지 않아요 — 데려오는 힘과 받아낼 준비를 같이 만들면, 같은 광고비도 훨씬 가볍게 돕니다.",
    goodLooksLike: "광고 하나에만 기대지 않고 검색·콘텐츠·후기로도 스스로 찾아오는 길이 여러 개 열려 있는 상태예요.",
  },
  2: {
    why: "들어온 고객이 '머무를 이유'를 느끼는 단계예요. 첫인상에서 '이 브랜드가 나를 아는구나'가 안 오면, 좋은 상품도 못 보고 3초에 나가요.",
    goodLooksLike: "메인만 봐도 브랜드 결이 한 문장으로 읽히고, '나 같은 사람을 위한 곳'이라는 느낌이 드는 상태예요.",
  },
  3: {
    why: "매력을 보여주는 동시에 '나한테 맞을까' 하는 두려움을 미리 없애주는 단계예요. 매력만 있고 불안이 남으면, 좋아하면서도 안 사요.",
    goodLooksLike: "체형·사이즈 걱정을 상세페이지가 후기·착용 정보로 '묻기도 전에' 풀어주는 상태예요.",
  },
  4: {
    why: "관심이 '사야겠다'는 확신으로 넘어가는 단계예요. 여기서 막히면 장바구니까지 왔다가 결제 직전에 마음을 접어요.",
    goodLooksLike: "결제가 쉽고·편하고·안전해서, 망설이던 손이 자연스럽게 결제로 가는 상태예요.",
  },
  5: {
    why: "사고 나서 물건을 기다리는 그 시간의 단계예요. 안내·감사가 '늘 같은 문구'면 첫 경험이 밋밋하게 식어요.",
    goodLooksLike: "주문 후 안내에 사람 온기가 묻어 있고, 기다림이 오히려 기대로 바뀌는 상태예요.",
  },
  6: {
    why: "받고 난 뒤의 단계예요. 응대가 시스템처럼 느껴지고 브랜드의 '사람'이 안 보이면, 두 번째 구매로 못 이어져요.",
    goodLooksLike: "수령 뒤에도 '이 브랜드랑 통했다'는 느낌이 남아서, 다시 찾을 이유가 생기는 상태예요.",
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

/** pivotal 단계 완료 직후 코치 한 줄 (variant A에서만). 답변 무관 고정, 8원칙 통과. */
export const STAGE_COACH_LINE: Record<number, string> = {
  2: "이걸 여쭌 건 — 대표님이 '상품'을 고민하실 때 정작 매출은 '3초 안에 나가는' 이 구간에서 새거든요. 여기가 풀리면 같은 유입에서 더 팔려요.",
  6: "재구매를 여쭤본 이유는 — 새 고객은 매번 처음부터 설득해야 하지만, 한 번 산 고객은 이미 우리를 알아요. 브랜드가 진짜 쌓이는 지점이 여기예요.",
};
export const ICP_COACH_LINE = "이 두 개는 대표님을 거르려는 게 아니라, 지금 단계에 맞는 얘기를 드리려고요. 이미 광고·콘텐츠 돌리시는 분이면 바로 구조 얘기로 들어갈 수 있거든요.";
