/**
 * 정체성 결과 라벨 (순수 함수 + 데이터)
 *
 * 진단 결과(최약 Stage·빈틈 패턴)에 매칭되어 결과 화면 히어로에
 * "정체성 배지 + 한 줄 부연(tagline)"으로 노출됩니다.
 * 대표님은 아래 RESULT_LABELS 표만 고치면 문구를 바꿀 수 있습니다.
 *
 * ── 작성 가이드 (비개발자용) ──
 * 필드:
 * - id:        고유 식별자 (영문/숫자, 중복 금지) 예: "label-s3"
 * - stageId:   이 라벨이 가리키는 '진짜 원인' Stage (1~6)
 * - gapPattern: (선택) "착각Stage->실제Stage" 형식. 예: "1->3"
 *              빈틈 진단과 정확히 매칭되면 baseline보다 먼저 이 라벨을 보여줍니다.
 *              현재 빈틈 패턴은 두 종류뿐입니다:
 *                "1->{실제}" (광고가 문제라고 느끼는 착각),
 *                "6->{실제}" (재구매가 원래 없다는 체념)
 * - label:     짧은 정체성 문구 (배지에 굵게 노출). 예: "매력은 충분, 전달만 남은 브랜드"
 * - tagline:   한 줄 부연 (배지 아래 회색 톤). 예: "상품의 힘이 고객에게 닿기 직전에 멈춰 있어요"
 * - priority:  (선택) 같은 매칭 조건에서 동률일 때 우선순위 (높을수록 먼저, 기본 0)
 *
 * ⚠️ 성장 프레임 필수:
 *   모든 라벨은 약점을 '성장 직전의 가능성'으로 표현해야 합니다.
 *   "실패/약점/문제/못함" 같은 낙인·단정 표현 금지.
 *   (X) "전환이 약한 브랜드"  →  (O) "매력은 충분, 전달만 남은 브랜드"
 *   (X) "재구매를 못 만드는 브랜드"  →  (O) "한 번의 만족, 다시 부를 차례인 브랜드"
 *
 * 추가 예시(복사해서 수정):
 *   { id: "label-s2-extra", stageId: 2,
 *     label: "첫인상은 좋아요, 머무를 이유만 더하면 되는 브랜드",
 *     tagline: "들어온 고객이 '나를 아는 곳'이라 느낄 한 끗이 남아 있어요" }
 *
 * ※ Stage 1~6 baseline(gapPattern 없는 라벨)은 각 Stage당 반드시 1개 이상
 *   유지해 주세요. 매칭 실패 시 최후 폴백으로 쓰입니다.
 */

import type { GapDiagnosis } from "./scoring";

export interface ResultLabel {
  id: string;
  stageId: number;
  gapPattern?: string;
  label: string;
  tagline: string;
  priority?: number;
}

export const RESULT_LABELS: ResultLabel[] = [
  // ── Stage 1~6 baseline (gapPattern 없음) ──
  {
    id: "label-s1",
    stageId: 1,
    label: "고객은 오고 있어요, 받을 준비만 남은 브랜드",
    tagline: "광고가 데려온 고객을 매출로 잇는 한 걸음 직전에 있어요",
  },
  {
    id: "label-s2",
    stageId: 2,
    label: "첫인상은 좋아요, 머무를 이유만 더하면 되는 브랜드",
    tagline: "들어온 고객이 '나를 아는 곳'이라 느낄 한 끗이 남아 있어요",
  },
  {
    id: "label-s3",
    stageId: 3,
    label: "상품은 준비됐어요, 남은 건 '나한테 맞을까'",
    tagline: "사이즈·핏이 궁금한 순간에 답이 보이면, 장바구니로 넘어가요",
  },
  {
    id: "label-s4",
    stageId: 4,
    label: "관심은 모였어요, 결정의 확신만 더하면 되는 브랜드",
    tagline: "사고 싶은 마음을 결제까지 잇는 안전장치가 남아 있어요",
  },
  {
    id: "label-s5",
    stageId: 5,
    label: "약속을 지키는 브랜드로 한 발 남은 브랜드",
    tagline: "구매 뒤의 경험까지 챙기면 신뢰가 쌓이기 시작해요",
  },
  {
    id: "label-s6",
    stageId: 6,
    label: "한 번의 만족, 다시 부를 차례인 브랜드",
    tagline: "첫 구매의 좋은 경험을 단골로 잇는 설계가 남아 있어요",
  },

  // ── 빈틈 패턴 라벨 (detectGap이 만들 수 있는 조합) ──
  // "1->{실제}" : 광고가 문제라고 느끼지만 실제 원인은 다른 Stage
  {
    id: "label-gap-1-3",
    stageId: 3,
    gapPattern: "1->3",
    label: "광고는 충분, 전환만 남은 브랜드",
    tagline: "유입은 이미 와 있어요. 상세페이지에서 닿기 직전에 멈출 뿐이에요",
    priority: 1,
  },
  {
    id: "label-gap-1-4",
    stageId: 4,
    gapPattern: "1->4",
    label: "광고는 충분, 결정의 확신만 남은 브랜드",
    tagline: "유입은 와 있어요. 결제 직전의 망설임만 풀면 되는 자리예요",
    priority: 1,
  },
  // "6->{실제}" : 재구매가 원래 없다는 체념이지만 실제 원인은 더 앞 단계
  {
    id: "label-gap-6-5",
    stageId: 5,
    gapPattern: "6->5",
    label: "재구매 이전, 첫 경험만 다듬으면 되는 브랜드",
    tagline: "단골이 안 생기는 게 아니라, 그 전 약속에서 한 끗이 남아 있어요",
    priority: 1,
  },
];

/** priority 내림차순, 동률이면 입력 배열 순서 유지(결정적) */
function pickTop(candidates: ResultLabel[]): ResultLabel | null {
  if (candidates.length === 0) return null;
  return candidates.reduce((best, c) =>
    (c.priority ?? 0) > (best.priority ?? 0) ? c : best
  );
}

/**
 * 라벨 매칭 우선순위 (case-match.ts 패턴 복제, 단 항상 non-null 보장):
 * 1. 빈틈 정확 일치 (gapPattern === "{perceived}->{actual}")
 * 2. 빈틈의 실제 원인(actualWorst) Stage baseline
 * 3. 빈틈 없으면 최약(worstStage) Stage baseline
 * 4. 최후 폴백: worstStage.stageId baseline (모든 Stage baseline 존재 전제)
 *
 * 모든 Stage 1~6 baseline이 RESULT_LABELS에 있으므로 항상 라벨을 반환한다.
 */
export function matchLabel(
  gap: GapDiagnosis | null,
  worstStage: { stageId: number },
  labels: ResultLabel[] = RESULT_LABELS
): ResultLabel {
  if (gap?.hasGap) {
    const pattern = `${gap.perceivedWorst}->${gap.actualWorst}`;
    const exact = pickTop(labels.filter((l) => l.gapPattern === pattern));
    if (exact) return exact;

    const byActual = pickTop(
      labels.filter((l) => l.stageId === gap.actualWorst && !l.gapPattern)
    );
    if (byActual) return byActual;
  }

  const byWorst = pickTop(
    labels.filter((l) => l.stageId === worstStage.stageId && !l.gapPattern)
  );
  if (byWorst) return byWorst;

  // 최후 폴백: 어떤 baseline도 못 찾으면(이론상 도달X) 첫 라벨이라도 반환
  return labels[0];
}
