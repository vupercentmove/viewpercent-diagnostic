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
  page.tsx            # 메인 페이지 — 9개 Phase 관리 (모드 선택 포함)
  admin/              # 관리자 통계 대시보드
  api/
    analyze/route.ts        # Claude Haiku AI 코멘트 생성 (mode별 분기)
    diagnostic-result/route.ts  # 결과 저장 (Supabase)
    admin/
      stats/route.ts        # 벤치마크 통계 조회
      results/route.ts      # 결과 상세 조회
      auth/route.ts         # 관리자 인증
components/
  IntroHero.tsx       # 시작 화면 (모드 선택: 빠른 진단 / 정밀 진단)
  StageJourneyStrip.tsx # 인트로 6단계 여정 스트립 (번호 + 축약 라벨)
  QuizStage.tsx       # 기본 10문항 진단 UI
  FullDeepQuizStage.tsx # 정밀 진단 27문항 UI + ICP/Vision 문항
  DeepQuizStage.tsx   # 심화 진단 UI (적응형)
  AnalyzingInterstitial.tsx # 로딩 인터스티셜 (분석 중...)
  ResultLayout.tsx    # 결과 화면 (빠른 진단)
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
- `intro`: 시작 화면 (버튼 2개: "빠른 진단", "정밀 진단")
- `quiz`: 기본 10문항 (6 Stage에 걸쳐 분배)
- `analyzing`: 로딩 인터스티셜 (2~3초)
- `result`: 결과 화면 (레이더 차트 + 액션 추천 + 심화 진단 유도)
- `deep-quiz`: 가장 약한 Stage의 심화 4~5문항
- `deep-result`: 기본 결과 + 심화 결과 (subArea 분석) 합산 표시

**정밀 진단 (full) 경로:**
- `intro`: 모드 선택 화면
- `full-deep-quiz`: 27문항 (6 Stage 당 4~5문항) + ICP 질문 2개 + Vision 질문 1개
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
- **벤치마크 필터**: base 분포는 `deep_stage_id IS NULL AND diagnostic_mode <> 'full'` 행만 포함

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

⚠️ **`sticky_cta_view`의 발사 시점을 옮기지 말 것.** 2026-06부터 "결과 화면 진입수"로
시계열이 쌓여 있어, 마운트 시점을 바꾸면 과거와 비교가 끊긴다. CTA 실노출을 재려면
`sticky_cta_impression`을 쓴다. 두 이벤트의 비율이 곧 "결과를 읽고 내려간 비율"이다.

⚠️ **`quiz_answer`의 `deep`과 `full`은 문항 id(d1a~d6e)를 공유한다.** `context` 필드
없이 문항 id만으로는 빠른 진단 심화 경로인지 정밀 진단 27문항 경로인지 구분할 수 없다
(2026-08-02 PR #13에서 분리, 그 전까지는 구분 불가였음).

## 현재 상태 (2026-07-19)

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
- **예시는 표시용이다**: `question-examples.ts`·`stage-examples.ts`는 스코어링과 무관하다. 문항을 추가·삭제하면 `question-examples.test.ts`의 id 일치 테스트가 깨지므로 예시도 함께 넣는다. `lib/full-deep-content.ts`의 `QUESTION_INSIGHT`(27문항, 같은 카드에서 함께 렌더)는 id 일치 테스트가 없어 CI가 못 잡으니 수동으로 같이 채울 것

## 커맨드

```bash
npm run dev     # 로컬 개발 서버 (http://localhost:3000)
npm run build   # 프로덕션 빌드
npx tsc --noEmit  # 타입 체크
```
