/**
 * 정밀 진단 결과 — 판정 근거 되짚기
 *
 * 27문항을 답해도 결과 화면이 점수만 보여주면, 대표는 "내가 뭘 어떻게 답해서
 * 이 구간이 나왔는지" 추적할 수 없다. 카피 정본의 "경험 → 패턴 → 문제 재정의"
 * 순서에서 '경험' 단계가 비는 셈이다.
 *
 * 여기서는 해석을 붙이지 않고 **실제 응답이 어느 하위 영역이었는지만** 되짚는다.
 * 해석은 결과 화면의 다른 카드(설명·코멘트)가 맡는다.
 */

import { getDeepQuestionsByStage } from "./deep-questions";
import { isUnknown } from "./quiz-fallback";
import type { Answers } from "./scoring";

/** 근거로 되짚을 응답 임계값 — 이 점수 미만이 그 구간 점수를 끌어내린 응답이다. */
export const EVIDENCE_LOW_THRESHOLD = 50;

export interface StageEvidence {
  /** 점수를 끌어내린 응답의 하위 영역 (중복 제거, 문항 순서 유지) */
  low: string[];
  /** "잘 모르겠어요"로 아직 확인되지 않은 하위 영역 */
  unknown: string[];
}

/**
 * 한 Stage의 판정 근거를 하위 영역 이름으로 되짚는다.
 *
 * yn 문항은 0/100이라 "아니요"가 전부 low로 잡히고, likert는 0·25(1~2점)가
 * low로 잡힌다. 중간값(50)은 근거로 쓰지 않는다 — 어느 쪽으로도 읽히기 때문.
 *
 * ⚠️ 여기서는 `subAreaBreakdown`을 쓰지 않는다. 그쪽은 "모름 응답"과 "2연속
 * 모름 폴백으로 건너뛴 미응답"을 똑같이 unknown으로 묶는데, 이 카드는 대표가
 * 직접 답한 것만 되짚어야 한다. 본 적도 없는 문항을 "이렇게 답하셨어요"로
 * 보여주면 거짓 되비춤이 된다.
 */
export function buildStageEvidence(stageId: number, answers: Answers): StageEvidence {
  const low: string[] = [];
  const unknown: string[] = [];

  for (const q of getDeepQuestionsByStage(stageId)) {
    const v = answers[q.id];
    if (v === undefined) continue; // 건너뛴 문항 — 대표의 응답이 아니다
    const bucket = isUnknown(v) ? unknown : v < EVIDENCE_LOW_THRESHOLD ? low : null;
    if (bucket && !bucket.includes(q.subArea)) bucket.push(q.subArea);
  }

  return { low, unknown };
}

/** 되짚을 근거가 하나도 없으면 근거 블록 자체를 띄우지 않는다. */
export function hasEvidence(e: StageEvidence): boolean {
  return e.low.length > 0 || e.unknown.length > 0;
}
