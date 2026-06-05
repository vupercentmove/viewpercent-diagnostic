# viewpercent-diagnostic

뷰퍼센트무브 셀프 진단 도구 — 여성의류 이커머스 브랜드 대표를 위한 쇼핑 퍼널 6단계 진단.

## 기술 스택

- **Next.js 14** (App Router, `app/` directory)
- **TypeScript** (strict)
- **Tailwind CSS 3** (커스텀 디자인 토큰 사용)
- **recharts** — 레이더 차트 시각화
- **@vercel/analytics** — 퍼널 이벤트 트래킹
- **Vercel** 배포 (GitHub push → 자동 배포)

## 프로젝트 구조

```
app/
  layout.tsx          # 루트 레이아웃 (Analytics 포함)
  page.tsx            # 메인 페이지 — 5개 Phase 관리
components/
  IntroHero.tsx       # 시작 화면
  QuizStage.tsx       # 기본 10문항 진단 UI
  DeepQuizStage.tsx   # 심화 진단 UI (적응형)
  ResultHero.tsx      # 결과 헤드라인
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
  deep-questions.ts   # 심화 27문항 정의 (Stage당 3~5문항)
  scoring.ts          # 스코어링 + 빈틈 진단 로직
  stage-meta.ts       # 6단계 메타데이터 + Thinking 프레임
  analytics.ts        # Vercel Analytics 트래킹 함수들
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
intro → quiz → result → (선택) deep-quiz → deep-result
```

- `intro`: 시작 화면
- `quiz`: 기본 10문항 (6 Stage에 걸쳐 분배)
- `result`: 결과 화면 (레이더 차트 + 액션 추천 + 심화 진단 유도)
- `deep-quiz`: 가장 약한 Stage의 심화 3~5문항
- `deep-result`: 기본 결과 + 심화 결과 (subArea 분석) 합산 표시

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

### 심화 진단 (Deep Diagnosis)

- 기본 결과에서 가장 약한 Stage만 3~5문항으로 파고듦
- 각 문항에 `subArea` 태그 (예: "유입 추적", "브랜드 정체성", "이탈 복구")
- 결과: subArea별 바 차트 + 강/약 영역 분류

## 트래킹 이벤트

`@vercel/analytics` 사용. `lib/analytics.ts`에 정의:

| 이벤트 | 시점 |
|--------|------|
| `diagnostic_start` | 시작 버튼 클릭 |
| `quiz_answer` | 각 문항 응답 |
| `diagnostic_complete` | 기본 진단 완료 |
| `deep_diagnostic_start` | 심화 진단 시작 |
| `deep_diagnostic_complete` | 심화 진단 완료 |
| `cta_click` | KakaoTalk CTA 클릭 |
| `restart` | 다시 진단하기 |

## 현재 상태 (2025-06-05)

- ✅ 기본 10문항 진단 + 결과 화면 — 완성
- ✅ 레이더 차트 (recharts) — 완성
- ✅ 퍼널 트래킹 (Vercel Analytics) — 완성
- ✅ 적응형 심화 진단 — 완성
- ⏳ Git 미커밋: 퍼널 트래킹 + 심화 진단 변경사항 커밋/푸시 필요
- ⏳ Vercel 배포 대기 (GitHub push 후 자동 배포)
- 🔜 관리자 어드민 — 아직 미착수 (현재는 모든 기능 오픈)

## 주의사항

- **모바일 퍼스트**: 진단 도구는 인스타그램 → 카카오톡 경로로 유입. 반드시 모바일 뷰 기준 설계
- **REVERSE_YN 조심**: `q1a`, `q1b`, `q5a`, `q6b`는 "예"가 부정 신호. 새 기본 문항 추가 시 방향 확인 필수
- **심화 문항은 정방향만**: DeepQuizStage에서는 REVERSE_YN 로직 없음
- **KakaoTalk CTA**: `http://pf.kakao.com/_xbunxen` — 하드코딩됨
- **인증 없음**: 현재 어드민/인증 없이 모든 기능 공개 상태 (의도적)
- **GitHub**: org `vupercentmove`, repo `viewpercent-diagnostic`

## 커맨드

```bash
npm run dev     # 로컬 개발 서버 (http://localhost:3000)
npm run build   # 프로덕션 빌드
npx tsc --noEmit  # 타입 체크
```
