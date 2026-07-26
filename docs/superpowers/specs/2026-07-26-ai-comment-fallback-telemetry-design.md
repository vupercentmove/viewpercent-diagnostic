# AI 코멘트 폴백 계측 — 설계

> 2026-07-26 · 브랜치 `feat/full-deep-mode`

## 배경 — 원가 콘솔에서 폴백 계측으로 바뀐 이유

스폰지클럽 2기 4주차 순회에서 찌니(신진영)의 SAJU&CO 어드민 비용/마진 콘솔을 참고해
진단 OS에도 단계별 원가를 박제하려 했다. 착수 전 실제 원가를 계산해보니 전제가 무너졌다.

| 항목 | 값 |
|---|---|
| LLM 호출 지점 | `app/api/analyze/route.ts` **한 곳, 1콜** (quick·full 모드가 프롬프트만 다름) |
| 모델 | `claude-haiku-4-5-20251001` — 입력 $1.00 / 출력 $5.00 per 1M 토큰 |
| 입력 | 약 500 토큰 → $0.0005 |
| 출력 | 약 150 토큰 (`max_tokens: 300`) → $0.00075 |
| **진단 1건** | **약 $0.00125 ≈ 1.8원** |

1만 건을 돌려도 약 1만 8천원이다. 참고 사례였던 찌니 쪽은 리포트 1건 $0.464(6콜·3,500~5,500자)
로 370배 차이가 난다 — 그쪽은 단계별 원가가 의미 있고, 여기는 없다.

**따라서 원가 콘솔은 만들지 않는다.** 대신 계측할 가치가 있는 것이 따로 드러났다:
`route.ts`는 AI 호출이 실패하면 조용히 정적 폴백 문구를 내보내는데, **그 사실이 어디에도
기록되지 않는다.** 지금 몇 %의 진단이 AI 코멘트 대신 붕어빵 문구를 받고 있는지 알 수 없다.

## 목표

full 모드 진단 중 **AI 코멘트 대신 정적 폴백 문구가 나간 비율**을 측정 가능하게 만든다.
quick 모드의 **호출 실패율**도 함께 센다(그쪽은 코멘트 자체가 안 나간다).

## 비목표 (의도적으로 만들지 않는 것)

| 안 만드는 것 | 이유 |
|---|---|
| 원가 콘솔 화면 | 건당 2원. 볼 이유가 없다 |
| `usage` 토큰 기록 | 위와 같음. 리포트가 길어지면 그때 |
| Supabase 컬럼 추가 | 운영 스키마 변경은 승인 대상이고, `supabase/migrations/20260719083524_*.sql`이 아직 미적용이라 순서 정리가 선행 |
| `/admin` 대시보드 신규 카드 | `/api/admin/*`가 무인증 상태(CLAUDE.md 잔여 후속). 인증 전에 엔드포인트를 늘리지 않는다 |
| 폴백률 자동 계산 화면 | 이벤트 2개면 Vercel Analytics 대시보드에서 눈으로 나눈다 |

## 측정 대상

호출자가 둘이고 실패 모양이 다르다.

| 호출자 | 모드 | 실패 시 사용자가 보는 것 |
|---|---|---|
| `app/page.tsx:297` | full | 정적 폴백 문구 (AI가 쓴 게 아님) |
| `components/AiCommentCard.tsx:23` | quick | 에러 UI (코멘트 자체가 없음) |

그래서 이벤트를 둘로 나눈다.

| 이벤트 | 속성 | 발생 조건 |
|---|---|---|
| `ai_comment_requested` | `{ mode }` | `/api/analyze` 호출 직전 (성공·실패 무관) |
| `ai_comment_fallback` | `{ mode, reason }` | 정적 문구로 대체됨 (현재는 full 모드에서만 발생) |
| `ai_comment_error` | `{ mode, reason }` | 호출 실패로 코멘트가 아예 없음 |

`mode`는 두 이벤트 모두 `"quick" | "full"`이다. quick 모드에서 폴백이 발생하는 경로는 현재
없지만(에러를 던짐), 나중에 quick에도 폴백을 붙이면 같은 이벤트로 잡히도록 열어 둔다.

`reason` 값:

| 값 | 의미 | 현재 코드 위치 |
|---|---|---|
| `no_key` | `ANTHROPIC_API_KEY` 미설정 | `route.ts:95-100` |
| `api_error` | Claude API 호출 예외 | `route.ts:127-132` |
| `empty_after_clean` | AI는 응답했으나 `cleanComment` 결과가 빈 문자열 | `route.ts:121-124` |
| `network` | 클라이언트 `fetch` 자체가 실패 | 클라이언트 catch |

**분모는 `ai_comment_requested`를 쓴다.** 기존 완료 이벤트를 분모로 쓰려다 확인해보니 맞지 않았다:

- `diagnostic_complete`는 `mode` 속성을 갖지 않는다(`overallScore`·`worstStage`·`worstScore`·`hasGap`뿐)
- full 모드는 별도 이벤트 `full_deep_complete`를 쓰는데, `app/page.tsx:288-292`에 **약점 Stage가
  없으면 `/api/analyze`를 아예 호출하지 않고 고정 메시지를 쓰는 분기**가 있어 완료 수 ≠ 호출 수다
- quick 모드의 AI 코멘트는 "AI 분석 보기" 버튼을 눌러야 발생하는 옵트인이라, 진단 완료 수와 무관하다

따라서 호출 시도 자체를 세는 이벤트를 두고 그것을 분모로 쓴다. 자체 완결이라 다른 이벤트의
의미 변화에 영향받지 않는다.

- full 폴백률 = `ai_comment_fallback`(mode=full) / `ai_comment_requested`(mode=full)
- quick 실패율 = `ai_comment_error`(mode=quick) / `ai_comment_requested`(mode=quick)

## 지금 안 잡히는 갈래 — 이 작업의 핵심

`route.ts:121-124`:

```ts
const comment =
  mode === "full"
    ? cleanComment(rawText) || buildFullFallback(weakestStage, weakScore)
    : rawText.trim();
```

AI가 라벨(`**되받기**` 등)이나 마크다운만 뱉어서 정리 후 아무것도 안 남으면 정적 폴백으로
대체되는데, **응답에 `fallback` 플래그가 붙지 않는다.** 계측만 추가하고 이 경로를 그대로 두면
영원히 0건으로 보인다. 플래그를 붙이는 수정이 함께 들어가야 한다.

## 파일별 변경 — 4개

### ① `app/api/analyze/route.ts` (서버)

- `no_key` 폴백 응답에 `reason: "no_key"` 추가
- `api_error` 폴백 응답에 `reason: "api_error"` 추가
- **`empty_after_clean` 경로 신설** — `cleanComment` 결과가 빈 문자열이면
  `{ comment: 폴백문구, fallback: true, reason: "empty_after_clean" }` 반환
- quick 모드 에러 응답(503/502) body에도 `reason` 추가

quick 모드의 성공 경로와 폴백 문구 내용은 건드리지 않는다.

### ② `lib/analytics.ts` (클라이언트)

기존 `track()` 래퍼 패턴 그대로 세 함수 추가:

```ts
type AiMode = "quick" | "full";

export function trackAiCommentRequested(mode: AiMode)
export function trackAiCommentFallback(mode: AiMode, reason: string)
export function trackAiCommentError(mode: AiMode, reason: string)
```

### ③ `app/page.tsx` (full 모드 호출부, 297행 부근)

- `fetch` 직전에 `trackAiCommentRequested("full")`
- 응답의 `data.fallback`이 참이면 `trackAiCommentFallback("full", data.reason ?? "unknown")`
  — 현재는 `data.comment`만 읽고 `fallback` 플래그를 버리고 있다
- `catch` 블록에서 `trackAiCommentError("full", "network")`

288-292행의 "약점 Stage 없음 → 고정 메시지" 분기는 건드리지 않는다. 거기서는 호출 자체를
하지 않으므로 `ai_comment_requested`도 발생시키지 않는다(분모에서 제외되는 게 맞다).

### ④ `components/AiCommentCard.tsx` (quick 모드 호출부)

- `fetch` 직전에 `trackAiCommentRequested("quick")`
- **`catch`만으로는 `reason`을 알 수 없다.** 현재 코드는 `if (!res.ok) throw new Error(...)`로
  body를 버리고 있어, 503(`no_key`)인지 502(`api_error`)인지 구분이 안 된다. 그래서
  `!res.ok` 분기를 throw 대신 인라인 처리로 바꾼다 — body를 `json()`으로 읽어
  `reason`을 꺼내고(파싱 실패 시 `"http_" + res.status`), `trackAiCommentError("quick", reason)`
  후 `setState("error")`
- `fetch` 자체가 던진 경우(진짜 네트워크 오류)에만 `catch`에서 `reason = "network"`

사용자에게 보이는 에러 UI는 그대로다 — `state`가 `"error"`가 되는 결과는 동일하다.

## 검증 방법

**제약: 워킹트리 전체 `tsc --noEmit`은 지금 실패한다.**
`components/FullDeepQuizStage.tsx:239`에 문법 오류(TS1128)가 있다 — 다른 세션이 편집 도중
멈춘 상태이고 이 작업과 무관하다. 따라서 전체 tsc 통과를 완료 기준으로 쓸 수 없다.

대신 이렇게 검증한다:

1. `npx tsc --noEmit` 실행 후 **에러가 `FullDeepQuizStage.tsx:239` 한 건뿐인지** 확인
   (내가 만진 4개 파일에서 새 에러가 안 났는지)
2. `npx vitest run` — 기존 테스트가 깨지지 않는지
3. `ANTHROPIC_API_KEY`를 비운 채 로컬에서 full 진단 완주 → 브라우저 네트워크 탭에서
   `/api/analyze` 응답에 `fallback: true, reason: "no_key"`가 오는지, Vercel Analytics
   디버그 모드에서 `ai_comment_requested`와 `ai_comment_fallback`이 **각각 1건씩** 잡히는지
   (분모·분자가 짝으로 쌓이는지 확인)
4. `empty_after_clean` 경로는 단위 테스트로 확인 — `cleanComment`가 빈 문자열을 반환하는
   입력을 주고 응답에 `reason: "empty_after_clean"`이 붙는지

배포 후 실측은 Vercel Analytics에서 며칠 쌓인 뒤 확인한다.

## 리스크

| 리스크 | 대응 |
|---|---|
| `lib/analytics.ts`가 다른 세션 미커밋 파일이었음 | 착수 전 `0c7e1f6`으로 분리 커밋 완료. 현재 깨끗 |
| `FullDeepQuizStage.tsx` 문법 오류로 빌드 불가 | 이 작업 범위 밖. 건드리지 않고, 검증은 위 1번 방식으로 우회. **배포 전에 별도로 해결돼야 함** |
| 미적용 마이그레이션이 남아 있음 | 이 작업은 DB를 건드리지 않으므로 무관. 단 배포 순서상 기존 핸드오프 런북이 여전히 유효 |
| Vercel Analytics 이벤트 속성 한도 | 속성 2개(`mode`, `reason`)뿐이라 여유 |

## 참고

- 원 순회 기록: 홈 세션 메모리 `spongeclub2-week3-priorities`
- 참고 사례: 찌니(신진영) 2기 4주차 — `1_mission/2조/찌니(신진영)/4주차 과제 제출 폴더/`
- 가격 근거: Claude API 공식 모델 표 (Haiku 4.5 = $1.00 / $5.00 per 1M)
