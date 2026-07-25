/**
 * 빠른 진단 10문항 — 단톡방 분석으로 검증된 카피
 *
 * ── 문항 작성 원칙 (2026-07-25 확정) ──
 * 1. 만족도·자각이 아니라 '경험과 행동'을 묻는다.
 *    (X) "~에 만족하시나요" "~라고 생각해 보신 적 있나요"
 *    (O) "최근 3개월 안에 ~한 적이 있나요" "지금 숫자로 확인할 수 있나요"
 * 2. 원하는 결론을 질문에 심지 않는다. 대표가 겪은 사실만 고르게 하고,
 *    해석은 결과 화면(ECHO_PHRASES·RESULT_LABELS)에서 한다.
 * 3. 확인 가능한 사실로 쓴다 — 답할 때 대표가 실제로 무언가를 떠올리거나
 *    열어볼 수 있어야 한다. '충분히/전략적으로/적극적으로' 같은 자기채점 부사 금지.
 *
 * ⚠️ id·answerType·stageId와 REVERSE_YN 방향은 스코어링 불변식이다.
 *    문구를 고칠 때 "예"가 부정 신호인 문항(q1a·q1b·q5a·q6b)의 방향이
 *    뒤집히지 않는지 반드시 확인할 것.
 */

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
    text: "최근 3개월 안에, 광고비를 늘린 달에 매출이 그만큼 늘지 않은 적이 있나요?",
    answerType: "yn",
  },
  {
    id: "q1b",
    stageId: 1,
    text: "지난달 광고 성과가 오르내린 이유를, 대표님이 설명하기 어려웠던 날이 있었나요?",
    answerType: "yn",
  },

  // Stage 2 — 체류 (1문항)
  {
    id: "q2a",
    stageId: 2,
    text: "주변에 \"우리 브랜드가 어떤 곳 같아?\"라고 물었을 때, 대표님이 의도한 답이 돌아오나요?",
    answerType: "likert",
  },

  // Stage 3 — 쇼핑의 시작 (2문항)
  {
    id: "q3a",
    stageId: 3,
    text: "최근 후기나 문의에서, \"예쁘다\" 말고 다른 이유로 샀다는 말을 본 적 있나요?",
    answerType: "yn",
  },
  {
    id: "q3b",
    stageId: 3,
    text: "고객이 CS나 DM으로 가장 자주 묻는 질문이, 상세페이지에 이미 답으로 적혀 있나요?",
    answerType: "likert",
  },

  // Stage 4 — 구매결정 (2문항)
  {
    id: "q4a",
    stageId: 4,
    text: "장바구니에 담고 결제하지 않는 고객 비율을, 지금 바로 열어서 확인할 수 있나요?",
    answerType: "yn",
  },
  {
    id: "q4b",
    stageId: 4,
    text: "가장 많이 팔리는 상품에, 사이즈나 체형을 언급한 후기가 5개 이상 있나요?",
    answerType: "yn",
  },

  // Stage 5 — 구매완료·기다림 (1문항)
  {
    id: "q5a",
    stageId: 5,
    text: "최근 한 시즌 안에, 잘 나가던 상품이 품절돼 판매를 멈춘 적이 있나요?",
    answerType: "yn",
  },

  // Stage 6 — 배송·수령완료 (2문항)
  {
    id: "q6a",
    stageId: 6,
    text: "첫 구매 고객 중 몇 퍼센트가 다시 왔는지, 지금 숫자로 말할 수 있나요?",
    answerType: "yn",
  },
  {
    id: "q6b",
    stageId: 6,
    text: "재구매율은 카테고리가 정하는 거라, 브랜드가 바꾸기는 어렵다고 보시나요?",
    answerType: "yn",
  },
];

/** 문항을 Stage별로 그룹핑 */
export function getQuestionsByStage(stageId: number): Question[] {
  return QUICK_QUESTIONS.filter((q) => q.stageId === stageId);
}
