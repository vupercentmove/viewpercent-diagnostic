# 사례 매칭 (Case Matching) — 설계

**작성일:** 2026-06-07
**범위:** 진단 결과 화면에 "당신과 같은 진단을 받은 브랜드"의 풀스토리 사례를 매칭해 노출
**목표:** 결과의 설득력 강화 → 카카오톡 상담 전환율 상승

## 맥락

진단도구 고도화는 4개 독립 하위 프로젝트로 분해됨: **A. 사례 매칭 / B. 진단 정밀도 / C. 리드·전환 / D. 어드민(제외)**. 진행 순서는 A → B → C. 본 스펙은 **A**만 다룬다.

진단은 현재 `(최약 Stage, 빈틈 패턴, 점수)`를 산출한다. 사례는 진단 결과만으로 매칭한다(추가 사용자 입력 없음). 어드민 없이 정적 데이터 파일로 시작한다(접근법 2).

## 데이터 모델 — `lib/cases.ts`

대표가 사례를 추가하는 단일 파일. 파일 상단 주석에 필드 설명 + 예시 시드 1개 포함.

```ts
export interface CaseStudy {
  id: string;
  brandType: string;     // 익명 브랜드 유형, 예: "에이블리 입점 30대 캐주얼 여성복"
  stageId: number;       // 이 사례가 해결한 '진짜 원인' Stage (1~6)
  gapPattern?: string;   // 선택: "1->3" (착각한 Stage → 실제 Stage)
  symptom: string;       // 최초 증상 (대표가 느낀 문제)
  realCause: string;     // 진단으로 드러난 진짜 원인
  action: string;        // 무엇을 했나
  result: string;        // 결과 (서술)
  metric?: { label: string; before: string; after: string }; // 선택: Before→After 강조 수치
  priority?: number;     // 선택: 동률 시 정렬 (높을수록 우선, 기본 0)
}

export const CASES: CaseStudy[] = [ /* 시드 1개 + 대표가 추가 */ ];
```

## 매칭 로직 — `lib/case-match.ts` (순수 함수)

```ts
matchCase(gap: GapDiagnosis | null, worstStage: { stageId: number }): CaseStudy | null
```

우선순위:

1. **빈틈 정확 일치** — `gap?.hasGap`이면 `gapPattern === "{perceivedWorst}->{actualWorst}"` 인 사례
2. **실제 Stage 폴백** — 빈틈은 있으나 1)에 매칭 없으면 `stageId === gap.actualWorst`
3. **최약 Stage 일치** — 빈틈 없으면 `stageId === worstStage.stageId`
4. **동률 정렬** — `priority` 내림차순, 그래도 동률이면 배열 첫 번째 (결정적, `Math.random` 미사용)
5. **무매칭** — `null` 반환 → 카드 자체를 렌더하지 않음 (안전 폴백)

## UI — `components/CaseStudyCard.tsx`

Props: `case: CaseStudy`, `matchedByGap: boolean`

- **배지**: 빈틈 매칭이면 "같은 착각을 했던 브랜드", 아니면 "같은 진단을 받은 브랜드"
- **본문 흐름**: `brandType` → 증상(인용 스타일) → 진짜 원인 → 조치 → 결과
- **수치 강조박스**: `metric` 있으면 `label` + `before → after` 박스로 강조
- **소프트 CTA**: 카드 하단 "우리 브랜드도 이렇게 될 수 있을까요? →" → 카카오톡 채널(`http://pf.kakao.com/_xbunxen`). 노출 시 `case_view`, 클릭 시 `case_cta_click` 트래킹
- 기존 디자인 토큰(`vp-navy`/`vp-blue`/태그색), 모바일 퍼스트(max-w ~430px)

## 결과 화면 연결 — `app/page.tsx`

- `PriorityCard`(1순위 개선점) **바로 뒤**에 삽입. `result`/`deep-result` 두 phase 모두 동일 위치
- `const matchedCase = matchCase(gap, worstStage)` (useMemo). `null`이면 미표시
- `matchedByGap = !!(gap?.hasGap && matchedCase?.gapPattern)`

## 트래킹 — `lib/analytics.ts`

- `trackCaseView(caseId, stageId, matchedByGap)` → `case_view`
- `trackCaseCtaClick(caseId)` → `case_cta_click`

## 테스트

매칭 로직은 순수 함수 → 유닛 테스트:

- 빈틈 정확 일치 (gapPattern 매칭)
- 빈틈 있으나 gapPattern 무 → 실제 Stage 폴백
- 빈틈 없이 최약 Stage 일치
- 동률 시 priority 우선
- 무매칭 → null

`npx tsc --noEmit` 타입 통과, `npm run build` 성공.

## 비범위 (이번 제외)

- 어드민/DB(Supabase) — D 단계로 연기
- 브랜드 프로필 기반 매칭 — 진단 결과만 사용
- 사례 복수 노출/슬라이더 — 우선 best 1개

## 향후 (B/C 연계)

- B(진단 정밀도): 빈틈 패턴이 늘어나면 `gapPattern` 종류 확장
- C(리드·전환): 사례 카드 CTA를 개인화 리포트/연락처 수집과 연결
- 사례가 수십 개로 늘면 접근법 3(Supabase)로 마이그레이션 검토
