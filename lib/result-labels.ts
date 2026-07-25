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
 *   (X) "전환이 약한 브랜드"  →  (O) "상품은 준비됐어요, 남은 건 '나한테 맞을까'"
 *   (X) "재구매를 못 만드는 브랜드"  →  (O) "재구매가 없는 게 아니라, 기억될 장면이 아직 없어요"
 *
 * ⚠️ 문장 구조 (2026-07-25 확정 — 통념 뒤집기):
 *   label   = "A가 아니라 B" 대조 프레임. 대표가 스스로 짚었을 원인(A)을 부정하고 진짜 자리(B)를 준다.
 *   tagline = "~인 줄 알았는데, 실은 ~였어요" 통념 뒤집기. 뒤에는 추상이 아니라 구체적 장면을 둔다.
 *   말투는 두괄식·차분, 느낌표 없음, 여러 명이 아니라 한 명에게 말하듯.
 *
 * 추가 예시(복사해서 수정):
 *   { id: "label-s2-extra", stageId: 2,
 *     label: "더 올리는 게 아니라, 알아보게 하는 차례",
 *     tagline: "콘텐츠가 부족한 줄 알았는데, 실은 '나를 아는 곳'이라 느낄 한 문장이 없었어요" }
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
    label: "데려오는 건 되고 있어요, 받아내는 게 남았어요",
    tagline: "광고비가 모자란 줄 알았는데, 실은 들어온 고객이 첫 화면에서 되돌아 나가고 있었어요",
  },
  {
    id: "label-s2",
    stageId: 2,
    label: "더 올리는 게 아니라, 알아보게 하는 차례",
    tagline: "콘텐츠가 부족한 줄 알았는데, 실은 '나를 아는 곳'이라 느낄 한 문장이 없었어요",
  },
  {
    id: "label-s3",
    stageId: 3,
    label: "상품은 준비됐어요, 남은 건 '나한테 맞을까'",
    tagline: "상품이 약한 줄 알았는데, 실은 사이즈·핏 질문에 답이 안 보였을 뿐이에요",
  },
  {
    id: "label-s4",
    stageId: 4,
    label: "가격이 아니라, 결제 직전 1분에서 갈려요",
    tagline: "비싸서 안 사는 줄 알았는데, 실은 배송비와 교환 조건을 확인하러 나갔다 안 돌아온 거예요",
  },
  {
    id: "label-s5",
    stageId: 5,
    label: "구매는 끝이 아니라, 기다림의 시작",
    tagline: "결제되면 끝인 줄 알았는데, 실은 기다리는 며칠이 다음 주문을 정하고 있었어요",
  },
  {
    id: "label-s6",
    stageId: 6,
    label: "재구매가 없는 게 아니라, 기억될 장면이 아직 없어요",
    tagline: "카테고리 탓인 줄 알았는데, 실은 받은 뒤 오는 말이 늘 같은 문구였어요",
  },

  // ── 빈틈 패턴 라벨 (detectGap이 만들 수 있는 조합) ──
  // "1->{실제}" : 광고가 문제라고 느끼지만 실제 원인은 다른 Stage
  {
    id: "label-gap-1-3",
    stageId: 3,
    gapPattern: "1->3",
    label: "광고 탓이 아니라, 상세페이지에서 멈춘 거예요",
    tagline: "유입은 이미 와 있어요. 닿기 직전에 멈출 뿐이에요",
    priority: 1,
  },
  {
    id: "label-gap-1-4",
    stageId: 4,
    gapPattern: "1->4",
    label: "광고 탓이 아니라, 결제 직전에서 멈춘 거예요",
    tagline: "고객은 다 왔어요. 마지막 1분의 망설임만 남았어요",
    priority: 1,
  },
  // "6->{실제}" : 재구매가 원래 없다는 체념이지만 실제 원인은 더 앞 단계
  {
    id: "label-gap-6-5",
    stageId: 5,
    gapPattern: "6->5",
    label: "재구매가 아니라, 그 전 약속에서 갈렸어요",
    tagline: "단골이 안 생기는 게 아니라, 기다리는 동안 연락이 끊겼을 뿐이에요",
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
