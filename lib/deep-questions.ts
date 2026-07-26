/**
 * 적응형 심화 진단 문항 — 가장 약한 Stage를 3~5문항으로 파고듦
 *
 * 문항 작성 원칙은 `lib/questions.ts` 상단과 동일하다.
 * 만족도·자각이 아니라 확인 가능한 경험과 행동을 묻고,
 * '충분히/전략적으로/적극적으로' 같은 자기채점 부사는 쓰지 않는다.
 *
 * ⚠️ 심화 문항은 전부 정방향("예"=긍정)이다. REVERSE_YN 로직이 없으므로
 *    문구를 고칠 때 "예"가 부정 신호가 되는 문장으로 바뀌지 않도록 주의할 것.
 */

import type { AnswerType } from "./questions";

export interface DeepQuestion {
  id: string;
  stageId: number;
  text: string;
  answerType: AnswerType;
  /** 심화 진단에서 이 문항이 파고드는 하위 영역 */
  subArea: string;
}

/** Stage별 심화 문항 (각 3~5문항) */
export const DEEP_QUESTIONS: DeepQuestion[] = [
  // ── Stage 1: 욕구·검색·방문 심화 ──
  {
    id: "d1a",
    stageId: 1,
    text: "광고를 통해 들어온 고객이 어디서 이탈하는지 흐름을 추적하고 있나요?",
    answerType: "yn",
    subArea: "유입 추적",
  },
  {
    id: "d1b",
    stageId: 1,
    text: "광고 소재별로 ROAS뿐 아니라 '이후 행동(체류, 장바구니, 구매)'까지 연결해서 보고 있나요?",
    answerType: "yn",
    subArea: "성과 연결",
  },
  {
    id: "d1c",
    stageId: 1,
    text: "자연 유입(검색, SNS)과 유료 유입의 비율을 알고 계신가요?",
    answerType: "yn",
    subArea: "채널 구조",
  },
  {
    id: "d1d",
    stageId: 1,
    text: "지난 3개월 안에, 광고가 아닌 경로(검색·후기·추천)로 들어온 주문을 따로 확인해본 적 있나요?",
    answerType: "likert",
    subArea: "유입 다각화",
  },

  // ── Stage 2: 체류 심화 ──
  {
    id: "d2a",
    stageId: 2,
    text: "메인 페이지에서 고객이 평균 몇 초 머무르는지 확인하고 있나요?",
    answerType: "yn",
    subArea: "체류 데이터",
  },
  {
    id: "d2b",
    stageId: 2,
    text: "우리 브랜드의 분위기(톤앤매너)를 한 문장으로 정리할 수 있나요?",
    answerType: "yn",
    subArea: "브랜드 정체성",
  },
  {
    id: "d2c",
    stageId: 2,
    text: "경쟁 브랜드 5개와 우리 메인 화면을 나란히 놓고 비교해본 적이 있나요?",
    answerType: "likert",
    subArea: "차별화",
  },
  {
    id: "d2d",
    stageId: 2,
    text: "첫 방문 고객이 메인 다음으로 어디를 누르는지, 데이터로 확인하고 계신가요?",
    answerType: "likert",
    subArea: "동선 설계",
  },

  // ── Stage 3: 쇼핑의 시작 심화 ──
  {
    id: "d3a",
    stageId: 3,
    text: "상세페이지 첫 화면에, 상품 스펙보다 '이걸 입으면 어떤 상황이 좋아지는지'가 먼저 나오나요?",
    answerType: "likert",
    subArea: "가치 전달",
  },
  {
    id: "d3b",
    stageId: 3,
    text: "고객이 '이 옷이 나한테 어울릴까' 걱정에 답하는 콘텐츠(착용샷, 체형별 추천 등)가 있나요?",
    answerType: "yn",
    subArea: "불안 해소",
  },
  {
    id: "d3c",
    stageId: 3,
    text: "상위 5개 상품의 상세페이지를 최근 한 달 안에 업데이트한 적 있나요?",
    answerType: "yn",
    subArea: "콘텐츠 관리",
  },
  {
    id: "d3d",
    stageId: 3,
    text: "후기를 상세페이지 어디에 넣을지 정해둔 기준이 있나요?",
    answerType: "likert",
    subArea: "사회적 증거",
  },
  {
    id: "d3e",
    stageId: 3,
    text: "상품 사진에 착용 상황(장소·시간·같이 입은 옷)이 드러나 있나요?",
    answerType: "likert",
    subArea: "비주얼 스토리",
  },

  // ── Stage 4: 구매결정 심화 ──
  {
    id: "d4a",
    stageId: 4,
    text: "장바구니 이탈 고객에게 리마인드(문자, 앱푸시, 리타겟팅 등)를 하고 있나요?",
    answerType: "yn",
    subArea: "이탈 복구",
  },
  {
    id: "d4b",
    stageId: 4,
    text: "첫 구매 혜택(쿠폰, 무배 등)이 결제 직전에 한 번 더 노출되나요?",
    answerType: "yn",
    subArea: "전환 촉진",
  },
  {
    id: "d4c",
    stageId: 4,
    text: "사이즈별·체형별 리뷰를 쉽게 필터링할 수 있게 되어 있나요?",
    answerType: "yn",
    subArea: "사이즈 불안",
  },
  {
    id: "d4d",
    stageId: 4,
    text: "결제 과정이 3단계 이내로 끝나나요? (회원가입 강요 없이)",
    answerType: "yn",
    subArea: "결제 편의",
  },
  {
    id: "d4e",
    stageId: 4,
    text: "교환·반품 조건을 상세페이지에서 스크롤을 많이 내리지 않고 찾을 수 있나요?",
    answerType: "likert",
    subArea: "안전감",
  },

  // ── Stage 5: 구매완료·기다림 심화 ──
  {
    id: "d5a",
    stageId: 5,
    text: "주문 확인 후 배송 시작까지 고객에게 중간 알림을 보내고 있나요?",
    answerType: "yn",
    subArea: "커뮤니케이션",
  },
  {
    id: "d5b",
    stageId: 5,
    text: "인기 상품의 재고 소진 시점을 예측하고, 사전 발주하는 체계가 있나요?",
    answerType: "yn",
    subArea: "재고 예측",
  },
  {
    id: "d5c",
    stageId: 5,
    text: "품절 상품에 대해 '입고 알림 신청' 또는 대체 상품 추천을 하고 있나요?",
    answerType: "yn",
    subArea: "품절 대응",
  },
  {
    id: "d5d",
    stageId: 5,
    text: "배송 지연이 발생했을 때, 고객에게 먼저 연락하는 프로세스가 있나요?",
    answerType: "yn",
    subArea: "위기 대응",
  },

  // ── Stage 6: 배송·수령완료 심화 ──
  {
    id: "d6a",
    stageId: 6,
    text: "첫 구매 후 7일·14일·30일 시점에 고객에게 다시 연락하는 흐름이 있나요?",
    answerType: "yn",
    subArea: "리텐션 설계",
  },
  {
    id: "d6b",
    stageId: 6,
    text: "재구매 고객과 신규 고객의 비율을 파악하고 있나요?",
    answerType: "yn",
    subArea: "데이터 파악",
  },
  {
    id: "d6c",
    stageId: 6,
    text: "재구매 고객만 받는 혜택이나 안내가 따로 있나요?",
    answerType: "likert",
    subArea: "VIP 경험",
  },
  {
    id: "d6d",
    stageId: 6,
    text: "받은 후기를 광고 소재나 상세페이지에 그대로 옮겨 쓴 적이 있나요?",
    answerType: "likert",
    subArea: "후기 활용",
  },
  {
    id: "d6e",
    stageId: 6,
    text: "이전 구매 이력을 기반으로 개인화된 상품을 추천하고 있나요?",
    answerType: "yn",
    subArea: "개인화",
  },
];

/** Stage별 심화 문항 가져오기 */
export function getDeepQuestionsByStage(stageId: number): DeepQuestion[] {
  return DEEP_QUESTIONS.filter((q) => q.stageId === stageId);
}

export function getDeepQuestionProgress(questionId: string): {
  stepIndex: number;
  totalSteps: number;
} {
  return {
    stepIndex: DEEP_QUESTIONS.findIndex((question) => question.id === questionId),
    totalSteps: DEEP_QUESTIONS.length,
  };
}
