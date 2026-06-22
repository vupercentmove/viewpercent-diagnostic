# 사례 매칭 (Case Matching) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 진단 결과(최약 Stage·빈틈 패턴)에 맞는 풀스토리 브랜드 사례를 1순위 개선점 뒤에 매칭 노출해 카카오톡 전환을 높인다.

**Architecture:** 정적 데이터 파일(`lib/cases.ts`)에 사례를 저장하고, 순수 함수(`lib/case-match.ts`)가 빈틈 패턴 → 실제 Stage → 최약 Stage 순으로 best 1개를 고른다. `CaseStudyCard` 컴포넌트가 풀스토리 + 수치 강조박스 + 소프트 카카오 CTA를 렌더하고, `app/page.tsx`의 `result`/`deep-result` 두 phase에 삽입한다. 어드민/DB 없음.

**Tech Stack:** Next.js 14, TypeScript(strict), Tailwind, Vercel Analytics, vitest(신규 — 순수 함수 테스트용)

---

## File Structure

- `vitest.config.ts` (생성) — vitest 설정 + `@/*` alias
- `package.json` (수정) — vitest devDep + `test` 스크립트
- `lib/cases.ts` (생성) — `CaseStudy` 타입 + `CASES` 배열 + 시드 1개 + 작성 가이드 주석
- `lib/case-match.ts` (생성) — `matchCase()` 순수 함수
- `lib/case-match.test.ts` (생성) — 매칭 로직 유닛 테스트
- `lib/analytics.ts` (수정) — `trackCaseView`, `trackCaseCtaClick`
- `components/CaseStudyCard.tsx` (생성) — 사례 카드 UI
- `app/page.tsx` (수정) — 두 phase에 카드 삽입 + useMemo 매칭

---

### Task 1: vitest 테스트 인프라 추가

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`

- [ ] **Step 1: vitest 설치**

Run:
```bash
npm install -D vitest
```
Expected: `package.json`의 devDependencies에 `vitest` 추가, 설치 성공

- [ ] **Step 2: vitest 설정 생성 (`@/*` alias 매핑)**

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
```

- [ ] **Step 3: test 스크립트 추가**

`package.json`의 `scripts`에 다음 한 줄 추가 (`lint` 줄 뒤):
```json
    "test": "vitest run",
```
결과적으로 scripts는 dev/build/start/lint/test 5개가 된다.

- [ ] **Step 4: 빈 테스트로 러너 동작 확인**

Run:
```bash
npm test
```
Expected: "No test files found" 또는 통과 (아직 테스트 파일 없음) — 에러 없이 vitest가 실행되면 성공

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: vitest 테스트 인프라 추가"
```

---

### Task 2: 사례 데이터 모델 + 시드 (`lib/cases.ts`)

**Files:**
- Create: `lib/cases.ts`

- [ ] **Step 1: 타입 + 시드 + 작성 가이드 작성**

Create `lib/cases.ts`:
```ts
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
      "광고비를 더 쓰지 않고도 같은 유입에서 구매로 이어지는 비율이 눈에 띄게 올랐습니다.",
    metric: { label: "상세→구매 전환율", before: "1.8%", after: "3.1%" },
    priority: 0,
  },
];
```

- [ ] **Step 2: 타입 체크**

Run:
```bash
npx tsc --noEmit
```
Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
git add lib/cases.ts
git commit -m "feat: 사례 데이터 모델 + 시드 사례"
```

---

### Task 3: 매칭 로직 (TDD) (`lib/case-match.ts`)

**Files:**
- Create: `lib/case-match.test.ts`
- Create: `lib/case-match.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

Create `lib/case-match.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { matchCase } from "@/lib/case-match";
import type { CaseStudy } from "@/lib/cases";
import type { GapDiagnosis } from "@/lib/scoring";

const gapCase: CaseStudy = {
  id: "gap", brandType: "B", stageId: 3, gapPattern: "1->3",
  symptom: "s", realCause: "r", action: "a", result: "res",
};
const stage3Case: CaseStudy = {
  id: "s3", brandType: "B", stageId: 3,
  symptom: "s", realCause: "r", action: "a", result: "res",
};
const stage2Low: CaseStudy = {
  id: "s2-low", brandType: "B", stageId: 2, priority: 0,
  symptom: "s", realCause: "r", action: "a", result: "res",
};
const stage2High: CaseStudy = {
  id: "s2-high", brandType: "B", stageId: 2, priority: 5,
  symptom: "s", realCause: "r", action: "a", result: "res",
};

const gap = (perceived: number, actual: number): GapDiagnosis => ({
  perceivedWorst: perceived, actualWorst: actual, hasGap: true, message: "m",
});

describe("matchCase", () => {
  it("빈틈 정확 일치: gapPattern이 맞는 사례를 고른다", () => {
    const r = matchCase(gap(1, 3), { stageId: 3 }, [gapCase, stage3Case]);
    expect(r?.id).toBe("gap");
  });

  it("빈틈 있으나 gapPattern 사례 없음 → 실제 Stage로 폴백", () => {
    const r = matchCase(gap(1, 3), { stageId: 3 }, [stage3Case]);
    expect(r?.id).toBe("s3");
  });

  it("빈틈 없음 → 최약 Stage 일치 사례", () => {
    const r = matchCase(null, { stageId: 3 }, [stage3Case, stage2Low]);
    expect(r?.id).toBe("s3");
  });

  it("동률이면 priority가 높은 사례", () => {
    const r = matchCase(null, { stageId: 2 }, [stage2Low, stage2High]);
    expect(r?.id).toBe("s2-high");
  });

  it("매칭 없으면 null", () => {
    const r = matchCase(null, { stageId: 5 }, [stage3Case, stage2Low]);
    expect(r).toBeNull();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run:
```bash
npm test
```
Expected: FAIL — `matchCase`를 `@/lib/case-match`에서 찾을 수 없음

- [ ] **Step 3: 매칭 로직 구현**

Create `lib/case-match.ts`:
```ts
/** 진단 결과 → 최적 사례 1개 매칭 (순수 함수) */

import { CASES, type CaseStudy } from "./cases";
import type { GapDiagnosis } from "./scoring";

/** priority 내림차순, 동률이면 입력 배열 순서 유지(결정적) */
function pickTop(candidates: CaseStudy[]): CaseStudy | null {
  if (candidates.length === 0) return null;
  return candidates.reduce((best, c) =>
    (c.priority ?? 0) > (best.priority ?? 0) ? c : best
  );
}

/**
 * 매칭 우선순위:
 * 1. 빈틈 정확 일치 (gapPattern === "{perceived}->{actual}")
 * 2. 빈틈의 실제 원인 Stage 일치
 * 3. 빈틈 없으면 최약 Stage 일치
 * 4. 무매칭 → null
 */
export function matchCase(
  gap: GapDiagnosis | null,
  worstStage: { stageId: number },
  cases: CaseStudy[] = CASES
): CaseStudy | null {
  if (gap?.hasGap) {
    const pattern = `${gap.perceivedWorst}->${gap.actualWorst}`;
    const exact = pickTop(cases.filter((c) => c.gapPattern === pattern));
    if (exact) return exact;

    const byActual = pickTop(cases.filter((c) => c.stageId === gap.actualWorst));
    if (byActual) return byActual;
  }

  return pickTop(cases.filter((c) => c.stageId === worstStage.stageId));
}

/** 매칭이 빈틈 패턴으로 이뤄졌는지 (UI 배지 분기용) */
export function isGapMatch(
  gap: GapDiagnosis | null,
  matched: CaseStudy | null
): boolean {
  if (!gap?.hasGap || !matched?.gapPattern) return false;
  return matched.gapPattern === `${gap.perceivedWorst}->${gap.actualWorst}`;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run:
```bash
npm test
```
Expected: 5개 테스트 모두 PASS

- [ ] **Step 5: Commit**

```bash
git add lib/case-match.ts lib/case-match.test.ts
git commit -m "feat: 사례 매칭 로직 (빈틈 인지, TDD)"
```

---

### Task 4: 트래킹 함수 추가 (`lib/analytics.ts`)

**Files:**
- Modify: `lib/analytics.ts`

- [ ] **Step 1: 사례 트래킹 함수 추가**

`lib/analytics.ts` 맨 끝(`trackResultView` 함수 뒤)에 추가:
```ts

/** 매칭된 사례 노출 */
export function trackCaseView(
  caseId: string,
  stageId: number,
  matchedByGap: boolean
) {
  track("case_view", {
    caseId,
    stageId,
    matchedByGap: matchedByGap ? "yes" : "no",
  });
}

/** 사례 카드 내 카카오 CTA 클릭 */
export function trackCaseCtaClick(caseId: string) {
  track("case_cta_click", { caseId });
}
```

- [ ] **Step 2: 타입 체크**

Run:
```bash
npx tsc --noEmit
```
Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
git add lib/analytics.ts
git commit -m "feat: 사례 노출/CTA 트래킹 이벤트"
```

---

### Task 5: 사례 카드 컴포넌트 (`components/CaseStudyCard.tsx`)

**Files:**
- Create: `components/CaseStudyCard.tsx`

참고: 기존 컴포넌트(`PriorityCard` 등)의 클래스 패턴 — 카드 컨테이너 `rounded-[14px] p-5 mb-4 animate-fade-in-up`, 디자인 토큰 `vp-navy`/`vp-blue`, 본문 텍스트 `text-[12.5px]~text-[14px]`, 모바일 퍼스트. 카카오 링크는 `http://pf.kakao.com/_xbunxen`.

- [ ] **Step 1: 컴포넌트 작성**

Create `components/CaseStudyCard.tsx`:
```tsx
"use client";

import { useEffect } from "react";
import type { CaseStudy } from "@/lib/cases";
import { trackCaseView, trackCaseCtaClick } from "@/lib/analytics";

const KAKAO_URL = "http://pf.kakao.com/_xbunxen";

interface Props {
  caseStudy: CaseStudy;
  matchedByGap: boolean;
}

export default function CaseStudyCard({ caseStudy, matchedByGap }: Props) {
  useEffect(() => {
    trackCaseView(caseStudy.id, caseStudy.stageId, matchedByGap);
  }, [caseStudy.id, caseStudy.stageId, matchedByGap]);

  const badge = matchedByGap
    ? "같은 착각을 했던 브랜드"
    : "같은 진단을 받은 브랜드";

  return (
    <section className="bg-white border border-gray-200 rounded-[14px] p-5 mb-4 animate-fade-in-up shadow-sm">
      <div className="inline-flex items-center gap-1.5 bg-vp-blue/10 text-vp-blue text-[11.5px] font-semibold px-2.5 py-1 rounded-full mb-3">
        <span>📌</span>
        {badge}
      </div>

      <h3 className="text-[14px] font-bold text-vp-navy mb-3">
        {caseStudy.brandType}
      </h3>

      <div className="flex flex-col gap-3">
        <div className="border-l-2 border-gray-300 pl-3">
          <p className="text-[11px] text-gray-400 mb-0.5">처음 느낀 문제</p>
          <p className="text-[13px] text-gray-700 leading-relaxed italic">
            “{caseStudy.symptom}”
          </p>
        </div>

        <div>
          <p className="text-[11px] text-vp-blue font-medium mb-0.5">
            진단이 찾아낸 진짜 원인
          </p>
          <p className="text-[13px] text-gray-700 leading-relaxed">
            {caseStudy.realCause}
          </p>
        </div>

        <div>
          <p className="text-[11px] text-gray-400 mb-0.5">무엇을 바꿨나</p>
          <p className="text-[13px] text-gray-700 leading-relaxed">
            {caseStudy.action}
          </p>
        </div>

        <div>
          <p className="text-[11px] text-gray-400 mb-0.5">결과</p>
          <p className="text-[13px] text-gray-800 font-medium leading-relaxed">
            {caseStudy.result}
          </p>
        </div>

        {caseStudy.metric && (
          <div className="flex items-center justify-between bg-vp-good-bg rounded-lg px-4 py-3 mt-1">
            <span className="text-[12px] text-vp-good font-medium">
              {caseStudy.metric.label}
            </span>
            <span className="text-[14px] font-bold text-vp-good">
              {caseStudy.metric.before} → {caseStudy.metric.after}
            </span>
          </div>
        )}
      </div>

      <a
        href={KAKAO_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackCaseCtaClick(caseStudy.id)}
        className="block w-full text-center bg-vp-blue hover:bg-vp-blue-hover text-white text-[13px] font-medium px-4 py-2.5 rounded-lg transition-colors mt-4"
      >
        우리 브랜드도 이렇게 될 수 있을까요? →
      </a>
    </section>
  );
}
```

- [ ] **Step 2: 타입 체크**

Run:
```bash
npx tsc --noEmit
```
Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
git add components/CaseStudyCard.tsx
git commit -m "feat: 사례 카드 UI (수치 강조 + 소프트 카카오 CTA)"
```

---

### Task 6: 결과 화면 연결 (`app/page.tsx`)

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: import 추가**

`app/page.tsx`에서 `import DeepResultCard ...` 줄 뒤에 추가:
```tsx
import CaseStudyCard from "@/components/CaseStudyCard";
```
그리고 `import { getBenchmark } ...` 줄 뒤에 추가:
```tsx
import { matchCase, isGapMatch } from "@/lib/case-match";
```

- [ ] **Step 2: 매칭 useMemo 추가**

`const benchmark = useMemo(...)` 블록 바로 뒤에 추가:
```tsx
  const matchedCase = useMemo(() => matchCase(gap, worstStage), [gap, worstStage]);
  const matchedByGap = useMemo(
    () => isGapMatch(gap, matchedCase),
    [gap, matchedCase]
  );
```

- [ ] **Step 3: `result` phase에 카드 삽입**

`result` phase에서 `PriorityCard`를 닫는 `/>` 와 그 다음 주석 `{/* 7. 빈틈 진단 ... */}` 사이에 추가:
```tsx
          {/* 6.5 매칭된 사례 (있을 때만) */}
          {matchedCase && (
            <CaseStudyCard caseStudy={matchedCase} matchedByGap={matchedByGap} />
          )}
```

- [ ] **Step 4: `deep-result` phase에 동일 삽입**

`deep-result` phase에서도 `PriorityCard` `/>` 와 `{/* 7. 빈틈 진단 */}` 사이에 동일 블록 추가:
```tsx
          {/* 6.5 매칭된 사례 (있을 때만) */}
          {matchedCase && (
            <CaseStudyCard caseStudy={matchedCase} matchedByGap={matchedByGap} />
          )}
```

- [ ] **Step 5: 타입 체크 + 빌드**

Run:
```bash
npx tsc --noEmit && npm run build
```
Expected: 타입 에러 없음, 빌드 성공

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx
git commit -m "feat: 결과 화면에 매칭 사례 카드 연결 (result/deep-result)"
```

---

### Task 7: 최종 검증

- [ ] **Step 1: 전체 테스트 + 타입 + 빌드**

Run:
```bash
npm test && npx tsc --noEmit && npm run build
```
Expected: 테스트 5 PASS, 타입 에러 없음, 빌드 성공

- [ ] **Step 2: 개발 서버에서 육안 확인 (선택)**

Run:
```bash
npm run dev
```
확인: 진단 완료 → 결과 화면에서 1순위 개선점 뒤에 사례 카드가 노출되는지, 빈틈 감지 시 배지가 "같은 착각을 했던 브랜드"로 바뀌는지.

---

## 비범위 (이번 제외)

- 어드민/DB(Supabase), 브랜드 프로필 매칭, 사례 복수 노출 — B/C/D 단계로 연기
