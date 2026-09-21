/** 응답만으로 만드는 역할 안내. 고객 행동의 실측·인과관계나 대표의 역량을 판정하지 않는다. */
import { QUICK_QUESTIONS, type Question } from './questions';
import { DEEP_QUESTIONS, type DeepQuestion } from './deep-questions';
import { calcAllStageScores, getWorstStage, REVERSE_YN, scoreToLikert, type Answers } from './scoring';
import { calcFullDeepStageScores, getFullWeakestStage } from './full-deep-scoring';
import { classifyFullResult } from './full-result-policy';
import { EVIDENCE_LOW_THRESHOLD } from './full-deep-evidence';
import { isUnknown } from './quiz-fallback';
import { STAGES } from './stage-meta';

export interface DecisionEvidence {
  questionId: string;
  stageId: number;
  question: string;
  area: string;
  answer: string;
  score: number;
}
export interface DecisionGuide {
  stageId: number | null;
  status: 'check' | 'maintain' | 'unmeasured';
  focus: string;
  evidence: DecisionEvidence[];
  unknown: DecisionEvidence[];
  pattern: string;
  aiTask: string;
  ownerTask: string;
  nextStep: string;
  ctaBridge: string;
}

const STAGE_WORK: Record<number, { source: string; ai: string; owner: string }> = {
  1: {
    source: '같은 기간의 소재별 클릭·상품 조회·장바구니 기록',
    ai: '소재별 반응을 표로 정리하고, 구매 이유별 광고 문구 초안을 만들 수 있어요.',
    owner: '어떤 고객의 유입을 늘릴지, 클릭 이후 어느 행동을 보고 예산을 조정할지 정하는 일이에요.',
  },
  2: {
    source: '첫 방문 고객의 메인 다음 클릭과 브랜드를 설명한 말',
    ai: '고객 표현을 묶고, 메인 첫 문장과 상품 안내 순서의 초안을 만들 수 있어요.',
    owner: '어떤 고객의 상황을 먼저 보여줄지, 다음 클릭으로 무엇을 확인할지 정하는 일이에요.',
  },
  3: {
    source: '주력 상품의 후기·문의와 상세페이지 첫 화면',
    ai: '구매 이유와 핏·소재 질문을 분류하고, 상세페이지 설명과 소재 초안을 만들 수 있어요.',
    owner: '실제 고객의 어떤 질문을 먼저 풀지, 그 답을 뒷받침할 사진·후기를 고르는 일이에요.',
  },
  4: {
    source: '장바구니 이후 행동과 배송·교환 문의, 실제 결제 화면',
    ai: '결제 전 질문을 묶고, 혜택·교환 안내와 리마인드 문구 초안을 만들 수 있어요.',
    owner: '할인·배송·사이즈 중 무엇부터 확인할지, 고객이 편하게 선택할 조건을 정하는 일이에요.',
  },
  5: {
    source: '주문·재고 기록과 고객에게 보낸 배송 안내',
    ai: '품절·배송 지연 기록을 정리하고, 상황별 안내와 감사 메시지 초안을 만들 수 있어요.',
    owner: '지킬 수 있는 배송 약속과 먼저 알릴 시점, 담당자와 대체 제안의 범위를 정하는 일이에요.',
  },
  6: {
    source: '첫 구매 상품·다음 주문 기록과 수령 후 후기',
    ai: '구매 이력과 후기를 묶고, 수령 후 안내·추천 메시지 초안을 만들 수 있어요.',
    owner: '누구에게 언제 다시 연락할지, 어떤 상품을 연결하고 재구매를 언제 확인할지 정하는 일이에요.',
  },
};

function readEvidence(questions: (Question | DeepQuestion)[], answers: Answers): DecisionEvidence[] {
  return questions.flatMap(q => {
    const score = answers[q.id];
    if (score === undefined) return []; // 생략한 문항을 모름 응답으로 만들지 않는다.
    const answer = isUnknown(score) ? '잘 모르겠어요'
      : q.answerType === 'likert' ? `${scoreToLikert(score)} / 5`
      : (REVERSE_YN.has(q.id) ? score === 0 : score === 100) ? '예' : '아니요';
    return [{ questionId: q.id, stageId: q.stageId, question: q.text,
      area: 'subArea' in q ? q.subArea : STAGES[q.stageId - 1].name, answer, score }];
  });
}

/** 동점 순서는 기존 점수 함수와 같다. quick의 추가 심화는 기존 최약 단계의 근거만 보강한다. */
export function buildDecisionGuide(mode: 'quick' | 'full', answers: Answers, deepAnswers: Answers = {}): DecisionGuide {
  const rows = readEvidence(mode === 'full' ? DEEP_QUESTIONS : QUICK_QUESTIONS, answers);
  const measured = rows.filter(row => !isUnknown(row.score));
  const weakest = mode === 'full' ? getFullWeakestStage(calcFullDeepStageScores(answers))
    : measured.length ? getWorstStage(calcAllStageScores(answers).filter(s => measured.some(r => r.stageId === s.stageId))) : null;
  const extra = mode === 'quick' ? readEvidence(DEEP_QUESTIONS.filter(q => q.stageId === weakest?.stageId), deepAnswers) : [];
  const unknown = [...rows, ...extra].filter(row => isUnknown(row.score));
  const stageId = weakest?.stageId ?? unknown[0]?.stageId ?? null;
  const stageName = stageId ? STAGES[stageId - 1].name : '고객 흐름';
  const candidates = [...extra, ...rows.filter(r => r.stageId === stageId)].filter(r => !isUnknown(r.score));
  const low = candidates.filter(r => r.score < EVIDENCE_LOW_THRESHOLD);
  const fullResultState = mode === 'full' ? classifyFullResult(calcFullDeepStageScores(answers)) : null;
  const status = !weakest ? 'unmeasured'
    : mode === 'full'
      ? fullResultState === 'maintain' || fullResultState === 'incomplete' ? 'maintain' : 'check'
      : weakest.score >= 70 && !low.length ? 'maintain' : 'check';
  const evidence = (low.length ? low : candidates).slice(0, 3);
  const focus = (low[0] ?? unknown.find(r => r.stageId === stageId))?.area ?? stageName;
  const work = stageId ? STAGE_WORK[stageId] : null;
  const pattern = status === 'unmeasured'
    ? '아직 확인된 답변이 없어 병목 판단을 보류해요. 모름은 운영이 잘못됐다는 뜻이 아니라, 함께 열어볼 근거의 출발점이에요.'
    : status === 'maintain'
      ? `응답으로 확인한 단계들은 양호 범위예요. '${stageName}'에서 유지할 기준을 정하고 실제 고객 행동과 비교해볼 수 있어요.`
      : low.length > 1
        ? `'${stageName}'에서 낮게 답한 항목들이 함께 보여요. 문구를 바꾸기 전에 이 항목들이 고객의 다음 행동과 어떻게 연결되는지 확인할 차례예요.`
        : `'${stageName}'가 응답 기준으로 먼저 볼 구간이에요. 한 답변만으로 원인을 정하지 않고, 고객이 다음 행동으로 넘어가는 기록과 비교해봐요.`;
  const nextStep = unknown.length
    ? `아직 확인 전인 '${unknown[0].area}'부터 담당자나 관리자 화면에서 확인해봐요. 확인된 내용과 '${focus}'의 실행 순서를 함께 정할 수 있어요.`
    : `'${focus}'에서 볼 고객 행동 하나와 바꿀 일 하나를 고르고, 담당자와 다음 확인 날짜를 정해요.`;
  return {
    stageId, status, focus, evidence, unknown, pattern,
    aiTask: work ? `'${focus}'에서는 ${work.source} 자료를 바탕으로 ${work.ai}` : '확인한 후기·문의·주문 기록이 모이면 분류와 문구 초안을 도울 수 있어요.',
    ownerTask: work ? `'${focus}'의 우선순위는 ${work.owner}` : '어떤 고객의 어떤 행동을 먼저 확인할지, 근거를 어디서 모을지 정하는 일이에요.',
    nextStep,
    ctaBridge: stageId ? `확인할 영역: '${focus}'. 이 결과를 출발점으로 함께 보고 싶다면 마케팅 문의를 남겨주세요.` : '확인할 자료부터 함께 정하고 싶다면, 이 결과로 마케팅 문의를 시작할 수 있어요.',
  };
}
