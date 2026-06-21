/**
 * 하단 sticky 카톡 CTA 카피 생성 (순수 함수)
 *
 * 본문 CTACard가 이미 약속한 수준('결과 화면을 보내면 단계별 1순위 진단')과
 * 톤을 일치시킨다. CTACard가 약속하지 않은 새 주장(예: '무료' 단정)은 도입하지 않는다.
 * 1인칭('제 …, 봐드릴게요')으로 대표 입장에서 부담 없이 누르게 한다.
 */

import { STAGES } from "./stage-meta";
import type { GapDiagnosis } from "./scoring";

export interface StickyCtaCopy {
  headline: string;
  button: string;
  subnote: string;
}

/** 알 수 없는 stageId 폴백 이름 */
const FALLBACK_STAGE_NAME = "가장 약한 단계";

function stageName(stageId: number): string {
  return STAGES.find((s) => s.id === stageId)?.name ?? FALLBACK_STAGE_NAME;
}

/**
 * sticky CTA 카피 생성.
 * - gap?.hasGap 이면 actualWorst 단계를 기준으로 카피를 분기('생각하신 곳보다 …').
 * - 그 외에는 전달받은 stageId(=worstStage) 기준.
 */
export function buildStickyCtaCopy(
  stageId: number,
  gap: GapDiagnosis | null
): StickyCtaCopy {
  const subnote = "결과 화면 그대로 보내주시면 됩니다 · 채팅으로만";

  if (gap?.hasGap) {
    const actualName = stageName(gap.actualWorst);
    return {
      headline: `생각하신 곳보다 '${actualName}'을 먼저 봐야 해요`,
      button: `제 '${actualName}' 빈틈, 카톡으로 봐드릴게요`,
      subnote,
    };
  }

  const name = stageName(stageId);
  return {
    headline: `'${name}' 단계, 어디부터 손봐야 할까요?`,
    button: `제 '${name}' 빈틈, 카톡으로 봐드릴게요`,
    subnote,
  };
}
