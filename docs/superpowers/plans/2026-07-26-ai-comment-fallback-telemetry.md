# AI 코멘트 폴백 계측 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** full 모드 진단에서 AI 코멘트 대신 정적 폴백 문구가 나간 비율과, quick 모드 호출 실패율을 Vercel Analytics로 측정 가능하게 만든다.

**Architecture:** 폴백 판정 로직을 `lib/ai-fallback.ts`로 분리해 단위 테스트하고, `app/api/analyze/route.ts`는 그것을 호출해 응답에 `fallback`·`reason`을 실어 보낸다. 클라이언트 두 호출부가 그 필드를 읽어 `lib/analytics.ts`의 래퍼로 이벤트를 쌓는다. 새 DB 컬럼도, 새 화면도 만들지 않는다.

**Tech Stack:** Next.js 14 App Router · TypeScript · Vercel Analytics (`@vercel/analytics` ^1.6.1) · Vitest

**설계 스펙:** `docs/superpowers/specs/2026-07-26-ai-comment-fallback-telemetry-design.md`

## Global Constraints

- 브랜치는 `feat/full-deep-mode`. 새 브랜치를 만들지 않는다.
- **워킹트리에 다른 세션의 미완 작업이 있다** — `components/FullDeepQuizStage.tsx`, `lib/full-deep-content.ts`, `lib/full-deep-content.test.ts`, `.gitignore`. **절대 건드리지 말고, 커밋에도 포함하지 말 것.** `git add`는 항상 파일을 명시한다. `git add .` / `git commit -a` 금지.
- **`npx tsc --noEmit`은 지금도 실패한다** — `components/FullDeepQuizStage.tsx(239,1): error TS1128`. 이건 위 미완 작업 탓이고 이 계획과 무관하다. 각 태스크의 tsc 검증 기준은 "에러가 그 한 줄뿐인지"다. 새 에러가 하나라도 늘면 실패로 본다.
- quick 모드의 **성공 경로**와 폴백 문구 **내용**은 바꾸지 않는다. 사용자에게 보이는 화면은 이 작업 전후로 동일해야 한다.
- Supabase 스키마·마이그레이션은 건드리지 않는다.
- `/api/admin/*`에 새 엔드포인트를 추가하지 않는다.
- 테스트 파일의 import는 이 레포 관행대로 상대 경로(`./ai-fallback`)를 쓴다. 소스 파일은 `@/lib/...` 별칭을 쓴다.
- 커밋 메시지 끝에 `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`를 붙인다.

## 파일 구조

| 파일 | 역할 |
|---|---|
| `lib/ai-fallback.ts` (신규) | 폴백 이유 타입 + full 모드 응답 본문 판정. 순수 함수, 테스트 대상 |
| `lib/ai-fallback.test.ts` (신규) | 위 모듈의 단위 테스트 |
| `app/api/analyze/route.ts` (수정) | 세 폴백/에러 갈래에 `reason`을 싣고, `empty_after_clean` 판정을 `lib/ai-fallback.ts`에 위임 |
| `lib/analytics.ts` (수정) | 이벤트 래퍼 3개 추가 |
| `app/page.tsx` (수정) | full 모드 호출부 계측 |
| `components/AiCommentCard.tsx` (수정) | quick 모드 호출부 계측 |

---

### Task 1: 폴백 판정 모듈

`cleanComment()` 결과가 빈 문자열이면 조용히 폴백 문구가 나가는데 응답에 흔적이 없다. 그 판정을 순수 함수로 떼어내 테스트 가능하게 만든다.

**Files:**
- Create: `lib/ai-fallback.ts`
- Test: `lib/ai-fallback.test.ts`

**Interfaces:**
- Consumes: `cleanComment` from `@/lib/clean-comment`
- Produces:
  - `type AiCommentMode = "quick" | "full"`
  - `type AiFallbackReason = "no_key" | "api_error" | "empty_after_clean" | "network"`
  - `interface AiCommentPayload { comment: string; fallback?: true; reason?: AiFallbackReason }`
  - `resolveFullComment(rawText: string, fallbackText: string): AiCommentPayload`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`lib/ai-fallback.test.ts` 신규 생성:

```ts
import { describe, it, expect } from "vitest";
import { resolveFullComment } from "./ai-fallback";

const FALLBACK = "지금은 구매결정 단계에서 가장 많이 새고 있어요.";

describe("resolveFullComment", () => {
  it("정리 후 내용이 남으면 폴백 표시 없이 그대로 반환한다", () => {
    expect(resolveFullComment("대표님은 지금 잘 하고 계세요.", FALLBACK)).toEqual({
      comment: "대표님은 지금 잘 하고 계세요.",
    });
  });

  it("마크다운·라벨을 벗기고 남은 문장을 반환한다", () => {
    expect(resolveFullComment("**되받기** 상품은 좋아요", FALLBACK)).toEqual({
      comment: "상품은 좋아요",
    });
  });

  it("라벨만 있어 정리 후 빈 문자열이면 폴백으로 대체하고 이유를 남긴다", () => {
    expect(resolveFullComment("**되받기**\n**인과**\n**트리거**", FALLBACK)).toEqual({
      comment: FALLBACK,
      fallback: true,
      reason: "empty_after_clean",
    });
  });

  it("빈 응답도 폴백으로 대체한다", () => {
    expect(resolveFullComment("", FALLBACK)).toEqual({
      comment: FALLBACK,
      fallback: true,
      reason: "empty_after_clean",
    });
  });

  it("공백뿐인 응답도 폴백으로 대체한다", () => {
    expect(resolveFullComment("   \n  \n ", FALLBACK).reason).toBe("empty_after_clean");
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인한다**

```bash
npx vitest run lib/ai-fallback.test.ts
```

Expected: FAIL — `Failed to resolve import "./ai-fallback"` (파일이 아직 없음)

- [ ] **Step 3: 최소 구현을 쓴다**

`lib/ai-fallback.ts` 신규 생성:

```ts
/**
 * AI 코멘트 폴백 판정.
 *
 * 배경: cleanComment()가 빈 문자열을 반환하면 정적 폴백 문구가 조용히 나가는데,
 * 그 사실이 응답에 남지 않아 폴백률을 셀 수 없었다. 판정을 여기로 모아
 * 응답에 fallback·reason을 싣는다.
 */
import { cleanComment } from "@/lib/clean-comment";

/** AI 코멘트를 요청한 진단 모드 */
export type AiCommentMode = "quick" | "full";

/** 정적 폴백이 나가거나 코멘트가 아예 없을 때의 이유 */
export type AiFallbackReason =
  | "no_key" // ANTHROPIC_API_KEY 미설정
  | "api_error" // Claude API 호출 예외
  | "empty_after_clean" // AI는 응답했으나 정리 후 빈 문자열
  | "network"; // 클라이언트 fetch 자체 실패

/** /api/analyze 응답 본문 */
export interface AiCommentPayload {
  comment: string;
  fallback?: true;
  reason?: AiFallbackReason;
}

/**
 * full 모드 응답 본문을 만든다.
 * rawText를 정리해 내용이 남으면 그대로, 남지 않으면 fallbackText + 폴백 표시.
 */
export function resolveFullComment(rawText: string, fallbackText: string): AiCommentPayload {
  const cleaned = cleanComment(rawText);
  if (cleaned) return { comment: cleaned };
  return { comment: fallbackText, fallback: true, reason: "empty_after_clean" };
}
```

- [ ] **Step 4: 테스트가 통과하는지 확인한다**

```bash
npx vitest run lib/ai-fallback.test.ts
```

Expected: PASS — 5 tests

- [ ] **Step 5: 기존 테스트가 안 깨졌는지 확인한다**

```bash
npm test
```

Expected: 기존 테스트 전부 통과 + 새 5건 통과. 실패 0건.

- [ ] **Step 6: 커밋**

```bash
git add lib/ai-fallback.ts lib/ai-fallback.test.ts
git commit -m "$(cat <<'EOF'
feat: AI 코멘트 폴백 판정 모듈 (resolveFullComment)

cleanComment 결과가 빈 문자열이면 정적 폴백이 나가는데 응답에 흔적이
없어 폴백률을 셀 수 없었다. 판정을 순수 함수로 분리하고 fallback·reason을
응답 본문에 싣도록 한다. 배선은 다음 커밋.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: 서버 응답에 reason 싣기

세 갈래(키 없음 / API 오류 / 정리 후 빈 문자열) 전부가 이유를 응답에 남기게 한다. 지금은 앞의 둘만 `fallback: true`가 있고 이유가 없으며, 세 번째는 표시 자체가 없다.

**Files:**
- Modify: `app/api/analyze/route.ts`

**Interfaces:**
- Consumes: Task 1의 `resolveFullComment` (값 import 하나뿐. `reason` 값은 문자열 리터럴로 직접 쓴다 — `NextResponse.json()`에 타입 주석이 필요 없다)
- Produces: `/api/analyze` 응답 계약 —
  - full 성공: `{ comment: string }`
  - full 폴백: `{ comment: string, fallback: true, reason: AiFallbackReason }`
  - quick 성공: `{ comment: string }`
  - quick 실패: HTTP 503/502 + `{ error: string, reason: AiFallbackReason }`

- [ ] **Step 1: import를 추가한다**

`app/api/analyze/route.ts`에서 `import { cleanComment } from "@/lib/clean-comment";` 줄을 찾아 **그 줄을 아래로 교체**한다(교체이지 추가가 아니다 — `cleanComment`는 Step 4 이후 이 파일에서 안 쓰인다):

```ts
import { resolveFullComment } from "@/lib/ai-fallback";
```

이 시점에는 `resolveFullComment`가 아직 안 쓰여서 lint 경고가 날 수 있다. Step 4에서 해소된다.

- [ ] **Step 2: 키 미설정 갈래에 reason을 붙인다**

93-100행의 블록을 통째로 아래로 교체:

```ts
  // 2) apiKey 검사 — full은 폴백, quick은 기존 503 유지
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    if (mode === "full") {
      return NextResponse.json({
        comment: buildFullFallback(weakestStage, weakScore),
        fallback: true,
        reason: "no_key",
      });
    }
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY 미설정", reason: "no_key" },
      { status: 503 }
    );
  }
```

- [ ] **Step 3: API 오류 갈래에 reason을 붙인다**

127-133행의 `catch` 블록을 통째로 아래로 교체:

```ts
  } catch (err) {
    console.error("[analyze] Claude API 오류:", err);
    if (mode === "full") {
      return NextResponse.json({
        comment: buildFullFallback(weakestStage, weakScore),
        fallback: true,
        reason: "api_error",
      });
    }
    return NextResponse.json({ error: "AI 분석 실패", reason: "api_error" }, { status: 502 });
  }
```

- [ ] **Step 4: 정리 후 빈 문자열 갈래를 판정 모듈에 위임한다**

118-126행(`const rawText = ...`부터 `return NextResponse.json({ comment });`까지)을 통째로 아래로 교체:

```ts
    const rawText = msg.content[0]?.type === "text" ? msg.content[0].text : "";
    // full: AI가 라벨(**되받기** 등)·마크다운을 뱉어도 화면엔 자연스러운 문장만 나가도록 정리.
    //       정리 후 빈 문자열이면 정적 폴백으로 대체하고 reason을 남긴다.
    //       quick은 기존 동작 그대로 유지.
    if (mode === "full") {
      return NextResponse.json(
        resolveFullComment(rawText, buildFullFallback(weakestStage, weakScore))
      );
    }

    return NextResponse.json({ comment: rawText.trim() });
```

이 교체로 `cleanComment` 직접 호출이 사라진다(Step 1에서 이미 import를 바꿨으므로 추가 작업 없음).

- [ ] **Step 5: 타입체크 — 새 에러가 없는지 확인한다**

```bash
npx tsc --noEmit
```

Expected: `components/FullDeepQuizStage.tsx(239,1): error TS1128` **한 줄만** 출력. `app/api/analyze/route.ts` 관련 에러가 하나라도 있으면 실패다.

- [ ] **Step 6: 테스트가 안 깨졌는지 확인한다**

```bash
npm test
```

Expected: 전부 통과.

- [ ] **Step 7: 커밋**

```bash
git add app/api/analyze/route.ts
git commit -m "$(cat <<'EOF'
feat: /api/analyze 응답에 폴백 이유(reason) 추가

세 갈래 모두 이유를 남긴다 — no_key / api_error / empty_after_clean.
특히 empty_after_clean은 지금까지 fallback 표시 없이 폴백 문구가
나가던 경로라, 계측을 붙여도 잡히지 않던 갈래다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: 이벤트 래퍼 3개

폴백률의 분자·분모를 쌓을 이벤트 계약을 정한다. 분모를 기존 완료 이벤트에서 빌리지 않고 호출 시도를 직접 세는 이유는 스펙 "측정 대상" 절 참조 — `diagnostic_complete`에 `mode`가 없고, full 모드엔 `/api/analyze`를 아예 호출하지 않는 분기가 있으며, quick의 AI 코멘트는 옵트인이다.

**Files:**
- Modify: `lib/analytics.ts`

**Interfaces:**
- Consumes: Task 1의 `AiCommentMode`
- Produces:
  - `trackAiCommentRequested(mode: AiCommentMode): void` → `ai_comment_requested { mode }`
  - `trackAiCommentFallback(mode: AiCommentMode, reason: string): void` → `ai_comment_fallback { mode, reason }`
  - `trackAiCommentError(mode: AiCommentMode, reason: string): void` → `ai_comment_error { mode, reason }`

- [ ] **Step 1: 타입 import를 추가한다**

`lib/analytics.ts` 12행 `import { track } from "@vercel/analytics";` **바로 아래**에 추가:

```ts
import type { AiCommentMode } from "@/lib/ai-fallback";
```

- [ ] **Step 2: 래퍼 3개를 파일 맨 끝에 추가한다**

`lib/analytics.ts` 맨 끝(`trackFullCtaClick` 함수 뒤)에 추가:

```ts

/**
 * AI 코멘트 호출 시도 — 폴백률·실패율의 분모.
 * 기존 완료 이벤트는 분모로 못 쓴다(diagnostic_complete에 mode가 없고,
 * full 모드엔 호출을 건너뛰는 분기가, quick엔 옵트인 버튼이 있다).
 */
export function trackAiCommentRequested(mode: AiCommentMode) {
  track("ai_comment_requested", { mode });
}

/** AI 코멘트가 정적 폴백 문구로 대체됨 (코멘트는 보이지만 AI가 쓴 게 아님) */
export function trackAiCommentFallback(mode: AiCommentMode, reason: string) {
  track("ai_comment_fallback", { mode, reason });
}

/** AI 코멘트 호출 실패 — 코멘트가 아예 안 나감 */
export function trackAiCommentError(mode: AiCommentMode, reason: string) {
  track("ai_comment_error", { mode, reason });
}
```

- [ ] **Step 3: 타입체크 — 새 에러가 없는지 확인한다**

```bash
npx tsc --noEmit
```

Expected: `components/FullDeepQuizStage.tsx(239,1)` 한 줄만.

- [ ] **Step 4: 커밋**

```bash
git add lib/analytics.ts
git commit -m "$(cat <<'EOF'
feat: AI 코멘트 폴백·실패 이벤트 래퍼 3종

ai_comment_requested(분모) / ai_comment_fallback / ai_comment_error.
호출부 배선은 다음 두 커밋.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: full 모드 호출부 계측

`app/page.tsx`는 지금 응답의 `fallback` 플래그를 읽지 않고 버린다.

**Files:**
- Modify: `app/page.tsx` (import 블록 36-38행 부근, 호출부 294-312행 부근)

**Interfaces:**
- Consumes: Task 3의 `trackAiCommentRequested`, `trackAiCommentFallback`, `trackAiCommentError`
- Produces: 없음 (말단)

- [ ] **Step 1: import에 세 함수를 추가한다**

`app/page.tsx`의 `from "@/lib/analytics"` import 블록(38행에서 끝남)에서, `trackFullDeepComplete,` 다음 줄에 추가:

```ts
  trackAiCommentRequested,
  trackAiCommentFallback,
  trackAiCommentError,
```

- [ ] **Step 2: 호출부를 교체한다**

`app/page.tsx` 295-312행 — `// AI 코멘트 (실패해도 폴백 반환...)` 주석부터 `catch` 블록 끝까지 — 를 통째로 아래로 교체:

```ts
    // AI 코멘트 (실패해도 폴백 반환, 네트워크 오류만 null로 남김)
    trackAiCommentRequested("full");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "full",
          stageScores: scores.map((s) => ({ stageId: s.stageId, score: s.score })),
          overallScore: overall,
          weakestStage: weakest.stageId,
          vision,
        }),
      });
      const data = await res.json();
      // 정적 폴백 문구가 나간 경우 — 코멘트는 보이지만 AI가 쓴 게 아니다.
      if (data.fallback) {
        trackAiCommentFallback("full", typeof data.reason === "string" ? data.reason : "unknown");
      }
      setFullAiComment(typeof data.comment === "string" ? data.comment : null);
    } catch {
      trackAiCommentError("full", "network");
      setFullAiComment(null);
    }
```

**주의:** 288-292행의 "약점 Stage 없음 → 고정 메시지" 분기는 건드리지 않는다. 거기서는 `/api/analyze`를 호출하지 않으므로 `trackAiCommentRequested`도 부르지 않는다(분모에서 빠지는 게 맞다).

- [ ] **Step 3: 타입체크 — 새 에러가 없는지 확인한다**

```bash
npx tsc --noEmit
```

Expected: `components/FullDeepQuizStage.tsx(239,1)` 한 줄만.

- [ ] **Step 4: 커밋**

```bash
git add app/page.tsx
git commit -m "$(cat <<'EOF'
feat: full 모드 AI 코멘트 폴백 계측 배선

응답의 fallback 플래그를 읽어 이벤트를 쌓는다. 이전에는 comment만
읽고 플래그를 버리고 있었다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: quick 모드 호출부 계측

`components/AiCommentCard.tsx`는 `if (!res.ok) throw`로 응답 body를 버려서 503(`no_key`)인지 502(`api_error`)인지 구분할 수 없다. 그 분기를 인라인 처리로 바꿔 이유를 꺼낸다. 사용자에게 보이는 결과(`state === "error"`)는 동일하다.

**Files:**
- Modify: `components/AiCommentCard.tsx` (import 1-5행 부근, `handleRequest` 15-42행)

**Interfaces:**
- Consumes: Task 3의 `trackAiCommentRequested`, `trackAiCommentError`
- Produces: 없음 (말단)

- [ ] **Step 1: import를 추가한다**

`components/AiCommentCard.tsx`의 `import { calcAllStageScores, ... } from "@/lib/scoring";` **바로 아래**에 추가:

```ts
import { trackAiCommentRequested, trackAiCommentError } from "@/lib/analytics";
```

- [ ] **Step 2: handleRequest를 교체한다**

`handleRequest` 함수 전체(15-42행)를 통째로 아래로 교체:

```ts
  const handleRequest = async () => {
    setState("loading");
    trackAiCommentRequested("quick");
    try {
      const stageScores = calcAllStageScores(answers);
      const overallScore = calcOverallScore(answers);
      const worstStage = getWorstStage(stageScores);
      const gap = detectGap(answers);

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stageScores,
          overallScore,
          weakestStage: worstStage.stageId,
          hasGap: gap?.hasGap ?? false,
          perceivedWorst: gap?.perceivedWorst,
          actualWorst: gap?.actualWorst,
        }),
      });

      if (!res.ok) {
        // 서버가 실패 이유를 body에 싣는다(no_key / api_error).
        // 파싱이 안 되면 상태 코드로 대체한다.
        const reason = await res
          .json()
          .then((body) => (typeof body?.reason === "string" ? body.reason : `http_${res.status}`))
          .catch(() => `http_${res.status}`);
        trackAiCommentError("quick", reason);
        setState("error");
        return;
      }

      const { comment: text } = await res.json();
      setComment(text);
      setState("done");
    } catch {
      trackAiCommentError("quick", "network");
      setState("error");
    }
  };
```

- [ ] **Step 3: 타입체크 — 새 에러가 없는지 확인한다**

```bash
npx tsc --noEmit
```

Expected: `components/FullDeepQuizStage.tsx(239,1)` 한 줄만.

- [ ] **Step 4: 전체 테스트**

```bash
npm test
```

Expected: 전부 통과.

- [ ] **Step 5: 커밋**

```bash
git add components/AiCommentCard.tsx
git commit -m "$(cat <<'EOF'
feat: quick 모드 AI 코멘트 실패 계측 배선

!res.ok 분기를 throw 대신 인라인 처리로 바꿔 응답 body의 reason을
꺼낸다. 이전에는 body를 버려서 503(키 없음)인지 502(API 오류)인지
구분할 수 없었다. 사용자에게 보이는 에러 UI는 그대로.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: 로컬 실화면 확인

코드가 아니라 **실제로 이벤트가 쌓이는지**를 확인한다. 소스만 고치고 완료라고 하지 않는다.

**Files:** 없음 (검증 전용)

- [ ] **Step 1: 키를 비운 채 dev 서버를 띄운다**

`.env.local`의 `ANTHROPIC_API_KEY` 값을 임시로 비운다(줄을 지우지 말고 값만 비울 것 — 원복하기 쉽게).

```bash
npm run dev
```

- [ ] **Step 2: full 진단을 완주하고 네트워크 탭을 본다**

브라우저에서 정밀(full) 진단을 끝까지 진행한다. 개발자도구 Network 탭에서 `/api/analyze` 응답 본문을 확인한다.

Expected: `{"comment":"지금은 ... 단계에서 가장 많이 새고 있어요...","fallback":true,"reason":"no_key"}`

- [ ] **Step 3: 이벤트가 짝으로 쌓이는지 본다**

Console 탭에서 Vercel Analytics 디버그 출력을 확인한다(개발 모드에서는 `track()`이 콘솔에 찍힌다).

Expected: `ai_comment_requested {mode: "full"}` 1건과 `ai_comment_fallback {mode: "full", reason: "no_key"}` 1건이 **각각** 찍힌다. 분모와 분자가 짝으로 쌓이는지가 핵심이다.

- [ ] **Step 4: quick 모드도 확인한다**

기본(quick) 진단을 완주하고 결과 화면에서 "AI 분석 보기" 버튼을 누른다.

Expected: `ai_comment_requested {mode: "quick"}` 1건 + `ai_comment_error {mode: "quick", reason: "no_key"}` 1건. 화면에는 기존과 동일한 에러 UI가 뜬다.

- [ ] **Step 5: 키를 원복하고 정상 경로를 확인한다**

`.env.local`의 `ANTHROPIC_API_KEY`를 원래 값으로 되돌리고 dev 서버를 재시작한다. full 진단을 다시 완주한다.

Expected: 응답에 `fallback` 필드가 **없고**, `ai_comment_requested`만 찍히고 `ai_comment_fallback`은 안 찍힌다. 화면에는 AI가 쓴 3문장이 나온다.

- [ ] **Step 6: 결과를 보고한다**

Step 2~5의 실제 출력(응답 본문·콘솔 로그)을 근거로 보고한다. 확인 못 한 항목은 "미검증"이라고 명시한다. 커밋할 것은 없다.

---

## 배포에 대해

이 계획은 **배포를 포함하지 않는다.** `components/FullDeepQuizStage.tsx:239`의 문법 오류가 남아 있는 한 `next build`가 실패하므로 배포 자체가 불가능하다. 그건 다른 세션의 미완 작업이고 이 계획의 범위 밖이다.

폴백률 실측은 배포 후 Vercel Analytics에 며칠 쌓인 뒤 확인한다:

- full 폴백률 = `ai_comment_fallback`(mode=full) ÷ `ai_comment_requested`(mode=full)
- quick 실패율 = `ai_comment_error`(mode=quick) ÷ `ai_comment_requested`(mode=quick)
