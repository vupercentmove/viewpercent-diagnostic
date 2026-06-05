/** 적응형 심화 진단 문항 — 가장 약한 Stage를 3~5문항으로 파고듦 */

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
    text: "광고 외에, 고객이 우리를 찾아올 수 있는 경로를 의도적으로 만들고 있나요?",
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
    text: "경쟁 브랜드 5개와 나란히 놓았을 때, 우리만의 차별점이 눈에 보이나요?",
    answerType: "likert",
    subArea: "차별화",
  },
  {
    id: "d2d",
    stageId: 2,
    text: "첫 방문 고객이 '둘러보고 싶다'고 느낄 만한 동선 설계가 되어 있나요?",
    answerType: "likert",
    subArea: "동선 설계",
  },

  // ── Stage 3: 쇼핑의 시작 심화 ──
  {
    id: "d3a",
    stageId: 3,
    text: "상세페이지에서 '기능 나열'이 아닌 '고객 관점의 가치'로 설명하고 있나요?",
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
    text: "고객의 실제 후기를 상세페이지에 전략적으로 배치하고 있나요?",
    answerType: "likert",
    subArea: "사회적 증거",
  },
  {
    id: "d3e",
    stageId: 3,
    text: "상품 사진이 단순 촬영을 넘어 '이 옷을 입으면 이렇게 된다'는 스토리를 전달하나요?",
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
    text: "교환·반품 정책이 고객 입장에서 명확하고 안심되게 표시되어 있나요?",
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
    text: "단골 고객에게 '당신이 특별하다'는 경험(전용 혜택, 선공개 등)을 제공하고 있나요?",
    answerType: "likert",
    subArea: "VIP 경험",
  },
  {
    id: "d6d",
    stageId: 6,
    text: "고객의 구매 후기를 적극적으로 수집하고, 그 후기를 마케팅에 활용하고 있나요?",
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
