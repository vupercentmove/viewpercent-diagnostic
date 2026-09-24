# viewpercent-diagnostic

뷰퍼센트무브 셀프 진단 도구 — 여성의류 이커머스 브랜드 대표를 위한 쇼핑 퍼널 6단계 진단.

## 기술 스택

- **Next.js 14** (App Router, `app/` directory)
- **TypeScript** (strict)
- **Tailwind CSS 3** (커스텀 디자인 토큰 사용)
- **Supabase** — 진단 결과 익명 저장, 벤치마크 집계, 어드민 통계
- **@anthropic-ai/sdk** (Claude Haiku 4.5) — AI 결과 코멘트 생성
- **@vercel/analytics** — 퍼널 이벤트 트래킹
- **Vercel** 배포 (GitHub push → 자동 배포)

## 프로젝트 구조

```
app/
  layout.tsx          # 루트 레이아웃 (Analytics 포함)
  page.tsx            # 메인 페이지 — 9개 Phase 관리 (모드 선택 포함), readUtm로 ?ref=/utm_* 수집
  result/[encoded]/   # 공유 결과 SSR 경로 (OG 메타) → SharedResult
  admin/              # 관리자 통계 대시보드 (유입경로별 완료 포함)
  api/
    analyze/route.ts        # Claude Haiku AI 코멘트 생성 (mode별 분기)
    diagnostic-result/route.ts  # 결과 저장 (Supabase) — 결과 행 핸들 code 발급·반환
    cta-click/route.ts          # 카톡 CTA 클릭 → cta_clicked=true (code로 행 특정)
    result-feedback/route.ts    # 결과 화면 반응 (의외였던 단계·한 줄 / 모름 중 먼저 볼 것)
    og/route.tsx                # 공유 링크 OG 이미지 (result-summary 파이프라인)
    admin/
      stats/route.ts        # 벤치마크 통계 조회
      results/route.ts      # 결과 상세 조회
      auth/route.ts         # 관리자 인증
components/
  IntroHero.tsx       # 시작 화면 → ModeSelect ("성장 워크북 시작하기"=정밀 / "먼저 2분 빠른 점검하기"=빠른)
  ModeSelect.tsx      # 모드 선택 버튼 2개
  StageJourneyStrip.tsx # 인트로 6단계 여정 스트립 (번호 + 축약 라벨)
  QuizStage.tsx       # 기본 10문항 진단 UI
  FullDeepQuizStage.tsx # 정밀 진단 27문항 UI + ICP/Vision 문항 + 모름 버튼(UNKNOWN_OPTION_LABEL)
  WorkbookChapterIntro.tsx # 정밀: 단계(챕터)마다 개념 → 질문 시작 (workbook-content.ts)
  WorkbookCheckpoint.tsx   # 정밀: 챕터 끝 체크포인트
  QuestionExample.tsx # 문항 아래 "어디서 확인하는가" 한 줄 (세 문항 화면 공유)
  DeepQuizStage.tsx   # 심화 진단 UI (적응형)
  AnalyzingInterstitial.tsx # 로딩 인터스티셜 (분석 중...)
  ResultLayout.tsx    # 결과 화면 (빠른 진단). variant="shared"는 공유 수신자용 — 시작 버튼이 /?ref=shared_result
  SharedResult.tsx    # /result/[encoded] 수신자 화면 (깨진 링크면 인트로 폴백)
  ResultHero.tsx · StrengthBox.tsx · AiCommentCard.tsx · CaseStudyCard.tsx · DecisionGuideCard.tsx
  StickyCtaBar.tsx    # 하단 카톡 CTA — 한 화면 넘게 읽은 뒤에만 붙는다 (진단·영업 분리)
  ShareCardButton.tsx # 결과 카드 이미지 저장·공유
  SocialProofBadge.tsx # 누적 진단수 — 표본 임계치 미만이면 수치 숨김 (social-proof.ts)
  FullResultLayout.tsx # 결과 화면 (정밀 진단)
  RadarChart.tsx      # 6각형 레이더 차트
  StageScoreList.tsx  # Stage별 점수 리스트
  ActionCards.tsx     # 액션 추천 카드 (하위 2개 Stage)
  PriorityCard.tsx    # 1순위 개선점 카드
  GapDiagnosisCard.tsx # 빈틈 진단 카드
  DeepResultCard.tsx  # 심화 결과 카드 (subArea 바 차트)
  EmpathyQuotes.tsx   # 공감 인용
  BeyondCard.tsx      # 진단 너머의 이야기
  CTACard.tsx         # KakaoTalk CTA
  ReactionCard.tsx    # "이 중 어디가 제일 의외였어요?" — 결과를 질문으로 끝낸다 (CTA 앞)
  UnknownPickCard.tsx # 정밀: 모름으로 답한 것 중 "먼저 해보고 싶은 것" (둘 이상일 때만)
lib/
  questions.ts        # 기본 10문항 정의
  deep-questions.ts   # 심화 27문항 정의 (Stage당 4~5문항, 빠른진단 심화경로와 공유)
  scoring.ts          # 기본 스코어링 + 빈틈 진단 로직
  full-deep-scoring.ts    # 정밀 진단 집계 스코어링
  full-deep-content.ts    # 정밀 진단 설명 + ICP 판정 + Vision 문항
  quiz-fallback.ts    # 모름 처리 (UNKNOWN_ANSWER=-1, 2연속 폴백)
  stage-meta.ts       # 6단계 메타데이터 + Thinking 프레임
  analytics.ts        # 이벤트 트래킹 함수들
  constants.ts        # 전역 상수 (KAKAO_URL 등)
  supabase.ts         # Supabase 클라이언트 + 타입
  question-examples.ts    # 문항별 예시 (문항 id → "어디서 확인하는가" 한 줄)
  stage-examples.ts   # 단계별 해석 예시 (결과 화면 약점 단계 1개에만 사용)
  feedback-client.ts  # 결과 화면 → 서버 신호 (CTA 클릭·반응) fire-and-forget
  url-state.ts        # 결과 URL 인코딩 (빠른 ?a= / 정밀 ?fa=) + 버전별 문항 순서표 — 아래 "공유 링크 인코딩" 필독
  revenue-lever.ts    # 약점 카드의 "매출 공식" 칩 (1 방문자 수 / 2 전환율 / 3·4 전환율·객단가 / 5·6 기존 고객)
  inflow-source.ts    # 어드민 유입경로 집계 (ref → utm_source → 미상)
  full-deep-evidence.ts # 정밀 결과 "이 구간을 짚은 건…" — 낮게 답한/모름 하위 영역 되짚기
  decision-guide.ts   # 정밀 결과 "도구를 쓰기 전에 정할 것"
  full-result-policy.ts # 정밀 결과 표현·AI 호출 정책
  workbook-content.ts # 정밀 진단 챕터(단계)별 개념·목적·결과물 정본
  likert-scale.ts     # 리커트 앵커 문구 (세 경로 공유)
  copy-canon.ts       # 금지어·성과 약속 규칙 단일 출처 (예시 테스트들이 공유)
  benchmark.ts · social-proof.ts # 벤치마크 분포·표본수 (시드 기준치면 "초기 기준" 표기 필수)
  cases.ts · case-match.ts # 결과 화면 사례 카드 데이터·매칭
  result-summary.ts   # decode→점수→라벨 파이프라인 (OG·공유 메타 공용)
  ai-fallback.ts · clean-comment.ts · numeric-guard.ts · stage-guard.ts # AI 코멘트 후처리·폴백 판정
  strength-stages.ts · sticky-cta-copy.ts · analyzing-steps.ts · progress.ts · quiz-navigation.ts · ab.ts
  consulting-tools.ts # 관리자 전용 참고 (고객 화면 노출 금지)
```

## 디자인 토큰

Tailwind `tailwind.config.ts`에 정의:

| 토큰 | HEX | 용도 |
|------|-----|------|
| `vp-navy` | `#06091D` | 주요 텍스트, 선택 버튼 |
| `vp-blue` | `#2A5AE6` | 프라이머리 액션, 프로그레스 |
| `vp-blue-light` | `#5A8CFF` | 보조 강조 |
| `vp-blue-hover` | `#1d47c4` | 버튼 호버 |
| `vp-risk` / `vp-risk-bg` | `#A32D2D` / `#FCEBEB` | 위험 태그 |
| `vp-warn` / `vp-warn-bg` | `#854F0B` / `#FAEEDA` | 주의 태그 |
| `vp-good` / `vp-good-bg` | `#0F6E56` / `#E1F5EE` | 양호 태그 |

**폰트**: Pretendard → Apple SD Gothic Neo → Noto Sans KR  
**모바일 퍼스트**: 모든 컴포넌트는 모바일 최적화 기준 (max-width ~430px 기준 설계)

## 핵심 로직

### Phase 흐름

```
intro (모드 선택)
├─ 빠른 진단: quiz → analyzing → result → (선택) deep-quiz → deep-result
└─ 정밀 진단: full-deep-quiz → full-analyzing → full-result
```

**빠른 진단 (quick) 경로:**
- `intro`: 시작 화면 (버튼 2개: "먼저 2분 빠른 점검하기", "성장 워크북 시작하기"=정밀)
- `quiz`: 기본 10문항 (6 Stage에 걸쳐 분배)
- `analyzing`: 로딩 인터스티셜 (2~3초)
- `result`: 결과 화면 (레이더 차트 + 액션 추천 + 심화 진단 유도)
- `deep-quiz`: 가장 약한 Stage의 심화 4~5문항
- `deep-result`: 기본 결과 + 심화 결과 (subArea 분석) 합산 표시

**정밀 진단 (full) 경로:**
- `intro`: 모드 선택 화면 ("성장 워크북 시작하기")
- `full-deep-quiz`: 27문항 (6 Stage 당 4~5문항) + ICP 질문 2개 + Vision 질문 1개. 단계마다 워크북 챕터 소개(WorkbookChapterIntro) → 질문 → 체크포인트
- `full-analyzing`: 로딩 인터스티셜 (AI 분석 중...)
- `full-result`: 정밀 결과 (AI 코멘트 + 6 Stage 스코어 + 약점 영역별 액션)

### 스코어링

- **yn 문항**: yes=100, no=0 (기본)
- **REVERSE_YN**: `q1a`, `q1b`, `q5a`, `q6b` — "예"가 부정적 → yes=0, no=100
- **심화 문항**: REVERSE_YN 없음 (모두 정방향)
- **likert 문항**: 1~5 → [0, 25, 50, 75, 100]
- **Stage 점수**: 해당 Stage 문항의 평균
- **태그**: ≥70 양호(good), ≥40 주의(warn), <40 위험(risk)

### 빈틈 진단 (Gap Diagnosis)

- Stage 1 점수 ≤ 30이면서 실제 최약 Stage가 1이 아닌 경우 → 빈틈 감지
- q6b에 "예"(체념) + 실제 최약 Stage가 6이 아닌 경우 → 빈틈 감지

### 심화 진단 (Deep Diagnosis) — 빠른 진단 부가 경로

- 기본 결과에서 가장 약한 Stage만 4~5문항으로 파고듦
- 각 문항에 `subArea` 태그 (예: "유입 추적", "브랜드 정체성", "이탈 복구")
- 결과: subArea별 바 차트 + 강/약 영역 분류

### 풀심화(정밀) 진단 (Full Deep Diagnosis) — 독립 진단 경로

#### 집계 스코어링
- **모름 처리**: `UNKNOWN_ANSWER = -1` (`lib/quiz-fallback.ts`)
- **점수 계산**: 각 Stage별 모름 제외 평균 (`lib/full-deep-scoring.ts`)
  - 예: [100, -1, 50] → 평균 (100+50)/2 = 75
- **모름 버튼 문구**: `UNKNOWN_OPTION_LABEL` = "잘 모르겠어요 · 확인해 봐야 알아요" (`lib/quiz-fallback.ts`). ⚠️ "안 해봤어요"류를 넣지 말 것 — 2026-09-24까지 "아직 안 해봤어요"였는데, "~하고 있나요/해본 적 있나요" 문항에서 아니요(0점)와 같은 뜻이면서 모름은 점수에서 빠져 안 해본 대표일수록 점수가 올랐다. 가드 테스트가 있다. 모름 응답의 뜻은 2026-09-24T11:17Z(PR #33)부터 좁아졌으니 전후 비율을 섞어 비교하지 말 것
- **2연속 모름 폴백**: 한 Stage 안에서 서로 다른 문항에 "모름"을 2회 연속 선택하면 그 Stage의 남은 문항을 건너뛰고 설명 카드로 전환. 연속 카운트는 실답변(yes/no/likert) 시 0으로 리셋되고 Stage가 바뀌면 0에서 시작
- **결과**: 6개 Stage 점수 + 종합 점수

#### ICP 판정 (타겟팅 고객 판정)
- **조건**: `computeIcpFlag()` (`lib/full-deep-content.ts`)
  - 광고비 월 300만원 이상 (지속적 규모) AND
  - 콘텐츠 주 1회 이상 생성 (지속적 투자)
- **결과**: `icp_flag` true/false는 Supabase에 저장되어 **백엔드/CRM 세그먼트용**이며, 현재 결과 화면·CTA에는 반영되지 않음 (향후 활용 예정)

#### Vision 문항 + 되비춤
- **Vision**: "매출이 지금보다 성장한다면, 가장 먼저 뭘 하고 싶으세요?" (4선다)
- **AI 코멘트에 반영**: Claude가 대표의 바람을 인사이트에 녹여 제시

#### AI 분석 코멘트 (Claude Haiku 4.5)
- **모드별 프롬프트**:
  - `full`: 3연 구조 - [되받기] → [인과] → [트리거]
  - `quick`: 2문장 핵심 인사이트
- **폴백**: 키 없음·API 오류·수치 날조·단계 불일치 시 정적 코멘트 자동 제공 (full 3문장 / quick 2문장)
- 각 문장 60자 이내, '무조건/꼭' 금지, 느낌표 금지, 부정 표현 두 문장 연속 금지, 진단 결과에 없는 수치·퍼센트 지어내지 않기(제공된 점수 인용은 가능 — 2026-08-12 프로덕션에서 "이탈률 20%" 날조 확인 후 추가, 프롬프트 수정 시 이 가드를 유지할 것)
- 호칭은 '대표님'(‘당신’ 금지), 존댓말 종결(‘~거야요’처럼 반말·존댓말 혼용 금지)
- ⚠️ **full 프롬프트에는 6단계 점수를 전부 넘긴다.** 2026-08-17까지 최약 단계 한 줄만 넘겨서, 맥락이 없는 AI가 진단이 짚지 않은 단계를 지목했다(최약 STAGE 3인데 코멘트는 90점짜리 STAGE 4를 원인으로 말함 — 헤로와 코멘트가 한 화면에서 다른 단계를 가리켰다). 프롬프트를 줄일 때 이 점수 블록을 빼지 말 것
- 최약 단계가 아닌 단계만 지목하면 `lib/stage-guard.ts`가 잡아 폴백시킨다(`reason: "wrong_stage"`). 단계명 비교는 공백을 지우고 한다 — 정본은 `구매결정`인데 AI는 `구매 결정`으로 쓴다

### 공유 링크 인코딩 · 문항 교체 절차 (`lib/url-state.ts`)

결과 URL은 답을 문항 순서대로 한 자리씩 인코딩한다. 순서가 바뀌면 이미 나간 링크가 다른 문항으로 복원되므로 **순서표는 버전별로 동결**한다.
- 빠른 진단 `?a=` — v1, 접두어 없음 (`QUICK_ORDER_V1`). 자리 값은 역채점이 이미 적용된 점수다
- 정밀 진단 `?fa=` — 현재 **v4** (`FULL_ENCODING_VERSION = 4`, 접두어 `4-`). v1은 접두어 없음
  - v2 (2026-09-24, PR #31): STAGE 1 d1c → **d1e** 플랫폼 수수료 vs 자사몰 광고비
  - v3 (PR #32): STAGE 5 d5b → **d5e** 품절·미송 취소 건수 (세부 영역 "품절 손실")
  - v4 (PR #34): STAGE 4 d4d → **d4f** 상품별 구매율 비교 (세부 영역 "구매율 확인")
- 옛 링크는 그 버전 순서로 읽히고, 없어진 문항 답은 스코어링이 읽지 않아 해당 단계가 나머지 문항 평균으로 다시 계산된다

**정밀 문항을 바꿀 때 (반드시 이 순서)**
1. **새 id를 쓴다.** 같은 id에 문구만 바꾸면 옛 링크와 DB `deep_answers`의 답이 새 문항 답으로 조용히 읽힌다
2. 새 순서표 `FULL_ORDER_V<n+1>`을 추가하고 `FULL_ENCODING_VERSION`을 올린다. 기존 배열은 절대 수정하지 않는다 (`url-version.test.ts`가 현재 버전 = `DEEP_QUESTIONS` 일치를 검사)
3. `question-examples.ts`(id 일치 테스트가 강제), `full-deep-content.ts` QUESTION_INSIGHT(테스트 없음, 수동), `decision-experience.test.ts` 문항 계약을 함께 고친다
4. 머지 전에 실고객 옛 결과의 점수 변화를 계산해 보고한다. 프로덕션 확인은 옛·새 코드가 다르게 답하는 입력으로 한다 (예: 옛 v1 링크의 해당 단계 점수, 새 버전 접두어 링크의 복원 여부)
5. 문구는 "~할 수 있나요 / 확인할 수 있나요"처럼 확인 가능한 행동으로 끝낸다. 결정 근거 문서는 vault `뷰퍼센트/02_브랜드진단도구/문항 교체안 — *.md`

### 유입경로 (`?ref=`)
- 결과 저장 시 `readUtm`(app/page.tsx)이 주소창의 `ref`·`utm_*`를 `diagnostic_results.utm`에 넣고, 어드민 "유입경로별 완료"가 `ref → utm_source → 미상`으로 집계한다 (`lib/inflow-source.ts`)
- 채널 링크 정본(이름 규칙: 소문자 영어·밑줄, 채널명 앞)은 vault `뷰퍼센트/02_브랜드진단도구/채널별 진단 링크 2026-09-24.md`. 공유 결과 수신자는 자동으로 `shared_result`
- ⚠️ **프로덕션에서 테스트할 때는 `?ref=test`를 붙인다.** 이 테이블엔 테스트/실고객 구분 컬럼이 없어, 표시 없는 테스트 행이 CTA율과 문항별 응답 비율 분석을 부풀렸다 (2026-09-24 hermes 검증 4건·수동 테스트 5건 삭제). 로컬 검증은 PostgREST 스텁으로 한다

## API 엔드포인트

### POST /api/analyze
Claude Haiku 4.5를 이용한 AI 결과 분석 코멘트 생성.
- **요청**: `{ mode: "quick"|"full", stageScores, overallScore, weakestStage, vision? }`
- **응답**: `{ comment: string, fallback?: true, reason?: "no_key"|"api_error"|"empty_after_clean"|"ungrounded_number"|"wrong_stage" }`
- **로직**:
  - `mode === "full"`: 3연 프롬프트 ([되받기]→[인과]→[트리거]), full 전용 정적 폴백
  - `mode === "quick"`: 2문장 프롬프트
  - 키 없음·API 오류: 두 모드 모두 200 + 모드별 정적 폴백 (에러 상태로 끝내지 않음)
  - 응답 후처리: 라벨·마크다운 제거 → 빈 문자열이거나 진단에 없는 퍼센트·배수가 있으면 폴백으로 교체
  - 응답 1건마다 `ai_comment_events`에 폴백 여부 기록 (어드민 "AI 폴백률")

### POST /api/diagnostic-result
진단 결과를 Supabase에 익명 저장. 벤치마크 집계 및 어드민 통계 용도.
- **요청**: `{ stageScores, overallScore, weakestStage, resultType, hasGap, deepStageId?, deepAnswers?, utm?, diagnostic_mode?, vision_answer?, unknown_areas?, icp_flag? }`
- **저장 필드**:
  - 기본: `stage_scores`, `overall_score`, `weakest_stage`, `result_type`, `has_gap`, `deep_stage_id`, `deep_answers`, `utm`, `completed`
  - 정밀 전용: `diagnostic_mode` (quick/full), `vision_answer`, `unknown_areas`, `icp_flag`
- **응답**: `{ ok: true, code }` — `code`는 이 행의 핸들(uuid). 클라이언트가 `resultCode` 상태로 들고 있다가 아래 두 라우트에 넘긴다. 심화(deep) 저장은 별도 행이라 별도 code를 받지만 CTA·반응은 base 행에 붙이므로 무시한다
- **벤치마크 필터**: base 분포는 `deep_stage_id IS NULL AND diagnostic_mode <> 'full'` 행만 포함

### POST /api/cta-click
카톡 CTA 클릭을 결과 행에 표시. `{ code }` → RPC `mark_cta_clicked(p_code)` → `cta_clicked=true`.
- 이 RPC는 2026-06-07부터 DB에 있었지만 앱이 code를 만든 적이 없어 2026-08-25까지 한 번도 호출되지 않았다(어드민 CTA 전환율이 영원히 0%였던 이유)
- 클라이언트(`lib/feedback-client.ts`)는 keepalive fire-and-forget. 실패해도 UX 영향 없음

### POST /api/result-feedback
결과 화면 반응 두 가지를 같은 행에 기록. 넘긴 필드만 갱신(RPC `record_result_feedback`의 coalesce).
- **요청**: `{ code, reactionStage?: 1~6, reactionNote?: ≤200자, unknownPick?: ≤80자 }` — 하나 이상 필수
- `reactionStage`·`reactionNote`: `ReactionCard` "이 중 어디가 제일 의외였어요?" (단계 탭 즉시 전송, 한 줄은 따로)
- `unknownPick`: `UnknownPickCard` 정밀 진단 모름 답변 중 먼저 해보고 싶은 것 (subArea 이름)
- ⚠️ 마이그레이션 `20260907025746_add_result_feedback.sql`이 **앱보다 먼저** 적용돼야 한다. 함수가 없으면 502를 내고 클라이언트가 삼켜 반응이 조용히 유실된다

### GET /api/admin/stats
벤치마크 통계 조회: Stage별 평균 점수, 분포, 전환율 등. **인증 필요** — 미인증 시 401 JSON.

### GET /api/admin/results
진단 결과 상세 조회: 페이지네이션 지원, 필터 가능. **인증 필요** — 미인증 시 401 JSON.

### 어드민 인증 (middleware.ts)
- matcher: `["/admin/:path*", "/api/admin/:path*"]` — 페이지와 API를 함께 보호
- 예외는 로그인 경로 두 개뿐: `/admin/login`, `/api/admin/auth` (막으면 로그인 자체가 불가 → 무한 루프)
- 미인증 응답: API는 401 JSON(`{"error":"인증이 필요합니다."}`), 페이지는 `/admin/login`으로 307
- 쿠키 `admin_auth` 값이 `ADMIN_PASSWORD`와 일치할 때만 통과. `ADMIN_PASSWORD` 미설정이면 전부 차단
- ⚠️ 새 어드민 API를 추가할 때 `/api/admin/` 밖에 두면 이 보호를 받지 못한다. 회귀 테스트는 `middleware.test.ts`

## 트래킹 이벤트

`@vercel/analytics` 사용. `lib/analytics.ts`에 정의:

| 이벤트 | 시점 |
|--------|------|
| `diagnostic_start` | 빠른 진단 버튼 클릭 (page.tsx handleStart에서) |
| `mode_select` (quick/full) | 모드 선택 (page.tsx에서) |
| `full_deep_start` | 정밀 진단 시작 |
| `quiz_answer` | 각 문항 응답. `context` 필드로 경로 구분: `quick`=기본 10문항, `deep`=빠른진단 심화(4~5문항), `full`=정밀진단 27문항 |
| `question_insight_toggle` | 정밀 진단 문항 답변 후 "왜 이걸 묻나요?" 인사이트 토글. `action` 필드가 `open`/`close` — "열어본 수" 집계는 `action=open`만 셀 것 (열기+접기 합산 금지) |
| `diagnostic_complete` | 빠른 진단 완료 |
| `full_deep_complete` | 정밀 진단 완료 |
| `deep_diagnostic_start` | 심화 진단 시작 (빠른 진단 결과 화면에서) |
| `deep_diagnostic_complete` | 심화 진단 완료 |
| `cta_kakao_click` | KakaoTalk CTA 클릭 (기본 경로) |
| `full_cta_click` | KakaoTalk CTA 클릭 (정밀 경로) |
| `diagnostic_restart` | 다시 진단하기 |
| `sticky_cta_view` | **결과 화면 진입** (StickyCtaBar 마운트). 이름과 달리 CTA 노출이 아니다 |
| `sticky_cta_impression` | 하단 sticky CTA가 실제로 화면에 보인 시점 (한 화면 넘게 스크롤 후) |
| `sticky_cta_click` | 하단 sticky CTA 클릭 |
| `reaction_stage` | 결과 화면 "어디가 제일 의외였어요?" 단계 탭 |
| `reaction_note` | 위 탭 뒤 한 줄까지 남김 |
| `unknown_pick` | 정밀: 모름 답변 중 먼저 해보고 싶은 것 탭 |
| `share_referral_start` | 공유 결과 링크(/result/…) 수신자 화면 진입 |
| `workbook_checkpoint_cta` | 정밀 워크북 챕터 체크포인트 버튼 |

⚠️ **`sticky_cta_view`의 발사 시점을 옮기지 말 것.** 2026-06부터 "결과 화면 진입수"로
시계열이 쌓여 있어, 마운트 시점을 바꾸면 과거와 비교가 끊긴다. CTA 실노출을 재려면
`sticky_cta_impression`을 쓴다. 두 이벤트의 비율이 곧 "결과를 읽고 내려간 비율"이다.

⚠️ **`quiz_answer`의 `deep`과 `full`은 문항 id(d1a~d6e)를 공유한다.** `context` 필드
없이 문항 id만으로는 빠른 진단 심화 경로인지 정밀 진단 27문항 경로인지 구분할 수 없다
(2026-08-02 PR #13에서 분리, 그 전까지는 구분 불가였음).

## 현재 상태 (2026-07-19 작성 · 2026-09-24 보강)

**2026-08~09 추가분:**
- ✅ 정밀 진단 6챕터 성장 워크북 흐름 (챕터 소개·체크포인트, PR #29) · 결과의 근거 되짚기·판단 가이드 (PR #28)
- ✅ 문항별 예시 한 줄 (`question-examples.ts`) · 약점 단계 해석 예시 (`stage-examples.ts`, PR #25)
- ✅ 결과 행 핸들 `code` → CTA 클릭 기록·반응 카드·모름 우선순위 카드 (PR #27)
- ✅ 공유 링크 인코딩 버전화 (PR #26) → 정밀 v4까지 (문항 3개 교체, PR #31·#32·#34)
- ✅ 약점 카드 "매출 공식" 칩 (`revenue-lever.ts`, PR #30)
- ✅ 모름 버튼 문구 분리 (PR #33) · 공유 결과 유입 `ref=shared_result` (PR #35)
- ⚠️ 병목은 사용량이다 — 2026-09-24 기준 실고객 정밀 응답 3건, CTA 클릭·반응 0건. 문항 변경 효과는 응답이 쌓여야 판단할 수 있다

**빠른 진단 (quick) 경로:**
- ✅ 기본 10문항 진단 + 결과 화면 — 완성
- ✅ 레이더 차트 시각화 — 완성
- ✅ 퍼널 트래킹 (Vercel Analytics) — 완성
- ✅ 적응형 심화 진단 (DeepQuizStage) — 완성
- ✅ Supabase 결과 저장 (fire-and-forget) — 완성
- ✅ 벤치마크 집계 필터 — `lib/supabase-admin.ts`의 `getStats`는 2026-08-12 아무도 호출하지 않는 죽은 코드로 확인되어 삭제됐다(`56ba30b`). 라이브 집계는 Supabase RPC `get_diagnostic_stats()` 단독이며, 2026-08-12 RPC 본문을 직접 읽어 확인한 결과 총계(`total`·`avgScore`·`deepRate`)와 분포 계열(`stageDistribution`·`avgStageScores`)이 모두 `FROM diagnostic_results WHERE completed = true AND diagnostic_mode <> 'full'` 한 모집단을 쓴다(실측 14 = 14 = 14, 일치). 수동 패치 대기 상태 아님.

**정밀 진단 (full) 경로:**
- ✅ 27문항 Full Deep Quiz Stage — 완성
- ✅ 집계 스코어링 (모름 제외 평균, UNKNOWN_ANSWER=-1) — 완성
- ✅ 2연속 모름 폴백 (quiz-fallback.ts) — 완성
- ✅ ICP 판정 (광고비 + 콘텐츠 지속) — 완성
- ✅ Vision 문항 + AI 코멘트에 반영 — 완성
- ✅ Claude Haiku 4.5 AI 분석 코멘트 생성 — 완성
- ✅ 3연 프롬프트 (되받기→인과→트리거) + full 정적 폴백 — 완성
- ✅ FullResultLayout (AI 코멘트 + 약점 단계 중심 액션 추천) — 완성

**어드민 & 인증:**
- ✅ 관리자 페이지(app/admin/*) middleware 보호 — 완성
- ✅ /api/admin/* 라우트 보호 — 완성 (2026-07-26, matcher 확장 + 미인증 401 JSON. `/api/admin/auth`만 예외)

**모드 선택 & 라우팅:**
- ✅ 모드 선택 UI (IntroHero 2버튼) — 완성
- ✅ 빠른/정밀 진단 두 경로 분리 — 완성
- ✅ URL 상태 관리 (공유 링크) — 완성

**CTA & 외부 연동:**
- ✅ KakaoTalk CTA "이 빈틈, 카톡으로 봐드릴게요" — 완성
- ✅ KAKAO_URL https 전환 (lib/constants.ts) — 완성

## CTA 정본

**KakaoTalk 채널 상담 URL:**
- 기본 URL: `https://pf.kakao.com/_xbunxen` (lib/constants.ts에서 중앙 관리)
- 결과 페이지별 ref 파라미터 추가 (필요시 상담사가 결과를 미리 봄)
- **CTA 카피** (정밀/full 결과 경로): "이 빈틈, 카톡으로 봐드릴게요" (ResultLayout 기본 경로와는 카피 다름)
- **CTA 카피** (빠른·심화·공유 결과 CTACard): "내 약점 단계, 같이 해결책 찾기 →" / 하단 sticky: "이 빈틈, 카톡으로 봐드릴게요"
- ⚠️ "마케팅 문의"류 영업 문구로 바꾸지 말 것 — 2026-09-21 PR #28에서 "카카오톡으로 마케팅 문의"로 바뀌었다가 2026-09-24 복원했다(진단·영업 분리 원칙). `decision-experience.test.ts`가 "마케팅 문의"를 막는다
- 정밀 결과 카톡 버튼은 누르는 순간 결과 링크를 클립보드에 복사하고 "결과 링크를 복사해 뒀어요 — 카톡 창에 붙여넣어 주세요"를 띄운다. 카톡 `ref`에는 단계 번호뿐이고 채널이 그걸 상담 화면에 보여주는지 확인되지 않았다 — 코치가 결과를 받는 경로는 대표가 붙여넣는 링크다

## 카피 정본 (2026-07-25 확정)

**브랜드 표기**: `VUPERCENT` / 뷰퍼센트무브. **`VIEWPERCENT`는 오기** — 레포·URL·경로가 `viewpercent-*`인 건 인프라 이름일 뿐이니 화면 텍스트로 옮기지 말 것.

**비유 체계 — 원인과 결과를 나눠 쓴다**
- **"돌아서다" = 고객의 행동(원인)** — 인트로 헤드라인, 문항. 예: "고객이 어디서 돌아서는지부터"
- **"새다" = 돈의 결과** — 결과 화면, 점수, 액션. 예: "매출이 새는 구간", "같은 자리에서 새는 매출"
- 섞지 말 것. "매출이 돌아선다", "고객이 샌다"는 비문이다. 고객이 돌아서니까 → 매출이 새는 것.

**결과 라벨 문장 구조** (`lib/result-labels.ts` 상단 가이드 참조)
- label = "A가 아니라 B" 대조 프레임 / tagline = "~인 줄 알았는데, 실은 ~였어요" 통념 뒤집기
- 성장 프레임 필수: "실패·약점·문제·못함" 낙인 금지

**문항 언어 원칙** (정본: `docs/진단-언어-원칙-2026-07-25.md`)
- 만족도·자각이 아니라 **확인 가능한 경험과 행동**을 묻는다. "~에 만족하시나요" "~라고 생각해 보신 적 있나요" 금지
- 자기채점 부사 금지: '충분히', '전략적으로', '적극적으로', '의도적으로'
- 유도 금지 — 원하는 결론을 질문에 심지 않는다. 해석은 결과 화면에서 한다
- 되비춤(`ECHO_PHRASES`)은 답변을 되풀이하지 말고 **한 겹 재정의**한다. 단 답변보다 앞서 나가거나 말하지 않은 감정을 단정하지 않는다
- 진단·영업 분리 — 경험 → 패턴 → 문제 재정의 → 역할 정의가 끝난 뒤에만 해결 구조를 붙인다. 성과 약속("~하면 더 팔립니다") 금지

**금지어**: 무료 상담, 무료 진단, "무료로", AI 활용 자랑, 시스템 자랑. 느낌표 금지. 명령형("~하세요") 지양 — 결론은 독자가 내리게 한다.
**말투**: 두괄식 · 차분 · 한 명에게 말하듯 · 전문용어는 고객 언어로 (정본: `~/obsidian-vault/뷰퍼센트/00_운영본부/context/voice-말투정본.md`)

## 주의사항

- **모바일 퍼스트**: 진단 도구는 인스타그램 → 카카오톡 경로로 유입. 반드시 모바일 뷰 기준 설계
- **REVERSE_YN 조심**: `q1a`, `q1b`, `q5a`, `q6b`는 "예"가 부정 신호. 새 기본 문항 추가 시 방향 확인 필수
- **심화 문항은 정방향만**: DeepQuizStage에서는 REVERSE_YN 로직 없음
- **정밀 진단 문항도 정방향만**: FullDeepQuizStage의 27문항은 모두 정방향
- **상수 중앙화**: KAKAO_URL 등 전역 상수는 `lib/constants.ts`에서 관리. 하드코딩 금지
- **단계명 정본은 `lib/stage-meta.ts`의 STAGES**: 파일마다 `STAGE_NAMES` 표를 새로 만들지 말 것. 2026-08-12까지 analyze 라우트·어드민 대시보드가 각자 복제 표를 들고 STAGE 2·3·4를 정본과 다르게(3을 "구매결정"으로) 표시해, AI 프롬프트가 화면과 다른 단계명을 알려주고 있었다
- **Supabase**: 결과 저장은 fire-and-forget (fetch + keepalive). 오류가 사용자 경험을 막지 않도록
- **AI 코멘트**: 키 없음·API 오류 시 두 모드 모두 정적 폴백 코멘트 제공(응답에 `fallback`·`reason` 표시). 진단에 없는 퍼센트·배수를 지어내면 `lib/numeric-guard.ts`가 잡아 폴백으로 대체한다. 폴백 여부는 `ai_comment_events` 테이블에 쌓여 어드민 "AI 폴백률" 타일로 보인다
- **GitHub**: org `vupercentmove`, repo `viewpercent-diagnostic`
- **예시는 표시용이다**: `question-examples.ts`·`stage-examples.ts`는 스코어링과 무관하다. 문항을 추가·삭제하면 `question-examples.test.ts`의 id 일치 테스트가 깨지므로 예시도 함께 넣는다
- **결과 행 핸들 `code`**: 저장 API가 발급해 클라이언트 `resultCode`로 흐른다. 공유 링크(`/result/<enc>`)·새로고침 복원에는 없다 — 그 화면에선 `ReactionCard`·`UnknownPickCard`가 그려지지 않고 CTA 클릭도 기록되지 않는다(의도된 동작: 공유 링크 수신자는 진단한 당사자가 아닐 수 있다). `lib/full-deep-content.ts`의 `QUESTION_INSIGHT`(27문항, 같은 카드에서 함께 렌더)는 id 일치 테스트가 없어 CI가 못 잡으니 수동으로 같이 채울 것

## 커맨드

```bash
npm run dev     # 로컬 개발 서버 (http://localhost:3000)
npm run build   # 프로덕션 빌드
npx tsc --noEmit  # 타입 체크
```
