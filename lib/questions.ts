/** 빠른 진단 10문항 — 단톡방 분석으로 검증된 카피 */

export type AnswerType = "yn" | "likert";

export interface Question {
  id: string;
  stageId: number;
  text: string;
  answerType: AnswerType;
  /** yn: yes=100, no=0 / likert: 1~5 → 0,25,50,75,100 */
}

export const QUICK_QUESTIONS: Question[] = [
  // Stage 1 — 욕구·검색·방문 (2문항)
  {
    id: "q1a",
    stageId: 1,
    text: "광고비는 올렸는데, 매출은 그만큼 안 따라온 적 있나요?",
    answerType: "yn",
  },
  {
    id: "q1b",
    stageId: 1,
    text: "광고 성과가 하루하루 들쭉날쭉한 편인가요?",
    answerType: "yn",
  },

  // Stage 2 — 체류 (1문항)
  {
    id: "q2a",
    stageId: 2,
    text: "고객이 우리 브랜드를 처음 봤을 때, \"여기 뭔가 다르다\"고 느낄 수 있나요?",
    answerType: "likert",
  },

  // Stage 3 — 쇼핑의 시작 (2문항)
  {
    id: "q3a",
    stageId: 3,
    text: "고객이 우리 옷을 사는 이유가 \"예쁘니까\"를 넘어서는 게 있나요?",
    answerType: "yn",
  },
  {
    id: "q3b",
    stageId: 3,
    text: "\"이거 나한테 맞을까?\" 하는 고객의 걱정을 상세페이지에서 충분히 풀어주고 있나요?",
    answerType: "likert",
  },

  // Stage 4 — 구매결정 (2문항)
  {
    id: "q4a",
    stageId: 4,
    text: "장바구니에 담아놓고 결제 안 하는 고객이 얼마나 되는지 알고 계신가요?",
    answerType: "yn",
  },
  {
    id: "q4b",
    stageId: 4,
    text: "\"내 사이즈 후기가 없네\" 하고 나가는 고객이 있을 수 있다고 생각해 보신 적 있나요?",
    answerType: "yn",
  },

  // Stage 5 — 구매완료·기다림 (1문항)
  {
    id: "q5a",
    stageId: 5,
    text: "잘 나가는 상품이 품절돼서 매출을 놓친 적 있나요?",
    answerType: "yn",
  },

  // Stage 6 — 배송·수령완료 (2문항)
  {
    id: "q6a",
    stageId: 6,
    text: "한 번 산 고객이 한 달 안에 다시 오는지 확인해 보신 적 있나요?",
    answerType: "yn",
  },
  {
    id: "q6b",
    stageId: 6,
    text: "\"우리 카테고리는 원래 재구매가 없어\" 하고 넘기신 적 있나요?",
    answerType: "yn",
  },
];

/** 문항을 Stage별로 그룹핑 */
export function getQuestionsByStage(stageId: number): Question[] {
  return QUICK_QUESTIONS.filter((q) => q.stageId === stageId);
}
