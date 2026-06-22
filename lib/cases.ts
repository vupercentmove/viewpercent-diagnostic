/**
 * 사례(Case Study) 데이터
 *
 * 진단 결과(최약 Stage·빈틈 패턴)에 매칭되어 결과 화면에 노출됩니다.
 * 대표님은 아래 CASES 배열에 사례를 추가하면 됩니다. 시드 1개를 참고하세요.
 *
 * 필드 가이드:
 * - id:        고유 식별자 (영문/숫자, 중복 금지) 예: "case-ad-to-detail"
 * - brandType: 익명 브랜드 유형. 실명 금지. 예: "에이블리 입점 30대 캐주얼 여성복"
 * - stageId:   이 사례가 해결한 '진짜 원인' Stage (1~6)
 * - gapPattern: (선택) "착각Stage->실제Stage" 형식. 예: "1->3"
 *              빈틈 진단과 정확히 매칭되면 "같은 착각을 했던 브랜드"로 강조됩니다.
 *              현재 빈틈 패턴: "1->{실제}" (광고탓 착각), "6->{실제}" (재구매 체념)
 * - symptom:   대표가 처음 느낀 증상/문제 (고객의 말투로)
 * - realCause: 진단으로 드러난 진짜 원인
 * - action:    무엇을 바꿨나
 * - result:    결과 (서술형)
 * - metric:    (선택) Before→After 수치 강조박스. label/before/after
 *              ⚠️ 표시광고법: 수치는 단일출처·실증자료(측정 기간·표본)가 있을 때만.
 *                 근거 없는 성과 수치는 부당광고 위험 → 없으면 비워 두고 서술형만 사용.
 * - priority:  (선택) 같은 매칭 조건에서 동률일 때 우선순위 (높을수록 먼저, 기본 0)
 */

export interface CaseStudy {
  id: string;
  brandType: string;
  stageId: number;
  gapPattern?: string;
  symptom: string;
  realCause: string;
  action: string;
  result: string;
  metric?: { label: string; before: string; after: string };
  priority?: number;
}

export const CASES: CaseStudy[] = [
  {
    id: "case-ad-to-detail",
    brandType: "에이블리 입점 30대 캐주얼 여성복",
    stageId: 3,
    gapPattern: "1->3",
    symptom: "광고비를 계속 올렸는데 매출이 그만큼 안 따라왔어요. 광고가 문제인 줄 알았죠.",
    realCause:
      "진단 결과 광고는 고객을 충분히 데려오고 있었고, 상세페이지(쇼핑의 시작)에서 '이 옷이 나한테 맞을까'라는 불안을 풀어주지 못해 이탈하고 있었습니다.",
    action:
      "상위 5개 상품 상세페이지에 체형별 착용샷과 실측 후기를 전략적으로 배치하고, 기능 나열을 고객 관점의 가치 설명으로 바꿨습니다.",
    result:
      "광고비를 더 쓰지 않고 같은 유입에서, 상세페이지를 손본 뒤 구매 전환의 흐름이 달라졌습니다.",
    // metric(수치 Before→After)은 단일출처·실증자료가 확보되기 전까지 비워 둔다.
    // 표시광고법: 근거 없는 성과 수치는 부당광고 위험. 측정 기간·표본이 확정되면 추가.
    priority: 0,
  },
];
