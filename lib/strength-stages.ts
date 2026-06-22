/**
 * 강점 Stage 선택 로직
 *
 * 결과 화면에서 최약 Stage만 집중하면 사용자가 위축됨.
 * 잘하는 Stage 1~2개를 짧게 인정해주어 이탈 방지 + 공유 동기 부여.
 */

import { STAGES } from "./stage-meta";

export interface StrengthStage {
  stageId: number;
  name: string;
  score: number;
  message: string;
}

/** Stage별 강점 인정 메시지 */
const STRENGTH_MESSAGES: Record<number, string> = {
  1: "방문 유입 구조가 탄탄하게 잡혀 있어요.",
  2: "브랜드 첫인상이 고객을 붙잡고 있어요.",
  3: "상품의 매력이 고객에게 잘 닿고 있어요.",
  4: "구매 결정 환경이 잘 갖춰져 있어요.",
  5: "구매 후 약속을 잘 지키고 있어요.",
  6: "재구매 구조가 작동하고 있어요.",
};

/**
 * 상위 1~2개 강점 Stage 반환
 *
 * 기준: 점수 70 이상(good 태그) + 최약 Stage 제외
 * 없으면 최약 제외 상위 2개 (점수 내림차순)
 */
export function getStrengthStages(
  stageScores: { stageId: number; score: number }[],
  worstStageId: number
): StrengthStage[] {
  const candidates = stageScores
    .filter((s) => s.stageId !== worstStageId)
    .sort((a, b) => b.score - a.score);

  const goodOnes = candidates.filter((s) => s.score >= 70).slice(0, 2);
  const selected = goodOnes.length > 0 ? goodOnes : candidates.slice(0, 2);

  return selected.map((s) => {
    const stage = STAGES.find((st) => st.id === s.stageId)!;
    return {
      stageId: s.stageId,
      name: stage.name,
      score: s.score,
      message: STRENGTH_MESSAGES[s.stageId] ?? `${stage.name} 단계가 양호해요.`,
    };
  });
}
