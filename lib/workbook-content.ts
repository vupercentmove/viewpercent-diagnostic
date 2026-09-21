import { STAGES } from "@/lib/stage-meta";

export interface WorkbookChapter {
  stageId: number;
  title: string;
  purpose: string;
  checkPoints: string[];
  aiRole: string;
  ownerDecision: string;
  output: string;
}

/**
 * 최초 샘플의 "개념 → 바로 실습 → 결과물" 흐름을 자사몰 고객 여정에 맞게 번역한 정본.
 * 질문은 기존 점수 계약을 유지하고, 이 데이터는 질문 전에 판단 기준을 제공한다.
 */
export const WORKBOOK_CHAPTERS: WorkbookChapter[] = [
  {
    stageId: 1,
    title: "고객이 찾아오는 길",
    purpose: "광고 성과 하나가 아니라 고객이 어디서 발견하고 어떤 행동으로 이어지는지 봅니다.",
    checkPoints: ["유입 경로를 나눠 보는가", "광고 뒤의 행동까지 연결하는가"],
    aiRole: "채널별 수치와 변화를 한 표로 정리할 수 있어요.",
    ownerDecision: "어떤 고객과 유입 경로를 먼저 키울지 정해야 해요.",
    output: "먼저 확인할 유입 경로 1개",
  },
  {
    stageId: 2,
    title: "들어온 고객이 머무는 이유",
    purpose: "첫 화면에서 고객이 ‘나를 위한 브랜드’라고 느끼고 다음 행동으로 가는지 봅니다.",
    checkPoints: ["첫 방문자의 체류를 확인하는가", "브랜드의 차이를 한 문장으로 말할 수 있는가"],
    aiRole: "페이지 문구와 경쟁사 차이를 비교해 초안을 만들 수 있어요.",
    ownerDecision: "누구에게 어떤 브랜드로 기억될지 선택해야 해요.",
    output: "고객에게 남길 첫인상 1문장",
  },
  {
    stageId: 3,
    title: "상품을 고르기 시작하는 순간",
    purpose: "상품의 매력을 보여주면서 핏·소재·활용 장면에 대한 두려움을 줄이는지 봅니다.",
    checkPoints: ["입었을 때의 변화를 설명하는가", "후기와 착용 정보가 불안을 줄이는가"],
    aiRole: "후기·문의에서 구매 이유와 불안 표현을 묶을 수 있어요.",
    ownerDecision: "이번에 가장 먼저 설명할 상품 가치와 고객 불안을 정해야 해요.",
    output: "상세페이지에서 먼저 답할 불안 1개",
  },
  {
    stageId: 4,
    title: "결제를 결정하는 조건",
    purpose: "혜택을 더 주는 것보다 비교·결제·교환이 쉽고 안전하게 느껴지는지 봅니다.",
    checkPoints: ["고객이 자신에게 맞는 선택을 할 수 있는가", "혜택과 교환 조건을 쉽게 찾는가"],
    aiRole: "이탈 지점과 반복 질문을 정리해 개선 후보를 만들 수 있어요.",
    ownerDecision: "전환을 위해 무엇을 단순하게 만들지 정해야 해요.",
    output: "결제 전 없앨 망설임 1개",
  },
  {
    stageId: 5,
    title: "결제 후 기다리는 경험",
    purpose: "결제가 끝난 뒤에도 진행 상황과 감사가 전해지고, 지연 시 먼저 약속을 다시 잡는지 봅니다.",
    checkPoints: ["주문 후 진행 상황을 안내하는가", "품절·지연을 고객이 묻기 전에 알리는가"],
    aiRole: "주문·배송 알림 문구와 반복 CS를 정리할 수 있어요.",
    ownerDecision: "고객에게 지킬 약속과 먼저 알릴 기준을 정해야 해요.",
    output: "기다림에서 지킬 약속 1개",
  },
  {
    stageId: 6,
    title: "수령 후 다시 찾는 관계",
    purpose: "후기·문의·재구매 행동을 다음 상품과 경험에 반영해 한 번의 구매를 관계로 잇는지 봅니다.",
    checkPoints: ["첫 구매 이후 행동을 확인하는가", "고객의 말을 운영 변경에 반영하는가"],
    aiRole: "후기와 문의를 주제별로 묶고 다음 행동 후보를 만들 수 있어요.",
    ownerDecision: "어떤 고객과 관계를 이어갈지, 이번 주 바꿀 한 가지를 정해야 해요.",
    output: "이번 주 실행하고 다시 확인할 일 1개",
  },
];

export function getWorkbookChapter(stageId: number): WorkbookChapter {
  const chapter = WORKBOOK_CHAPTERS.find((item) => item.stageId === stageId);
  if (!chapter) throw new Error(`Unknown workbook chapter: ${stageId}`);
  return chapter;
}

export const WORKBOOK_TOTAL_QUESTIONS = 27;

export const WORKBOOK_JOURNEY = WORKBOOK_CHAPTERS.map((chapter) => ({
  ...chapter,
  stageName: STAGES.find((stage) => stage.id === chapter.stageId)?.name ?? "",
}));
