# 진단툴 전환 고도화 — 리서치 백로그 + 구현 계획

**작성일:** 2026-06-22
**근거:** 전세계 GitHub·CRO 플랫폼·YouTube·행동과학·바이럴·한국시장 6개 각도 웹 리서치 → 51개 finding → RICE 랭킹 15개 백로그 → 즉시 구현 8개.
**북극성:** ① 진단 완료율 ② 카카오톡 상담 CTA 전환율. 부가: 바이럴/공유, 재방문, 신뢰도.
**제약:** 정적·무인증·모바일 퍼스트, REVERSE_YN 방향 보존, 담백 톤(CLAUDE.md), 스코어링 로직 불변.

## 핵심 통찰

퀴즈 진행 마찰 제거(완료율)와 결과 페이지 설득(전환·신뢰)이 가장 두꺼운 근거를 가진 두 레버다. 사례매칭·적응형심화·빈틈진단은 이미 베스트프랙티스와 정렬돼 "강화" 관점으로만 다룬다. 중대 발견: 현재 첫 문항 q1a가 REVERSE_YN(예=부정)이라 첫인상이 자책적 → foot-in-the-door 원칙 위배.

## 즉시 구현 (8개) — 3개 그룹 순차

스코어링·REVERSE_YN·트래킹 스키마는 변경하지 않는다(기존 Vercel 이벤트 연속성 유지, 추가만).

### 그룹 1 — 퀴즈 완료율 (QuizStage 공유 → 함께)
1. **한 화면 한 문항 + 자동 전진** — flat 커서로 전환, yn 즉시/likert 350ms 자동 전진, '이전' 상시, 마지막은 수동 '결과 보기'. 핵심 가드: `shouldAutoAdvance`는 답한 문항이 현재 커서이고 마지막이 아닐 때만 true(과거 답 수정 시 전진 금지 = 루프 방지). 순수 모듈 `lib/quiz-navigation.ts` TDD.
2. **쉬운 정방향 첫 문항** — `STAGE_DISPLAY_ORDER`로 노출 순서만 변경(점수 무관, 순서 불변성 테스트로 고정). 첫 화면을 정방향·자책없는 문항으로. *(브랜드 내러티브 영향 있어 PR에서 대표 검토 플래그, 즉시 롤백 가능)*
3. **성취형 진행바 + 50% 격려 + "약 2분"** — 순수 모듈 `lib/progress.ts` TDD(`progressPercent`, `hasCrossedHalf`). 격려 1회만, 담백.

### 그룹 2 — 결과 설득(신뢰)
5. **정체성 결과 라벨** — `lib/result-labels.ts`(데이터+`matchLabel` 순수, cases.ts 패턴). 약점을 성장 프레임으로. ResultHero 배지. *코파 owner-editable, 검토 플래그.*
7. **개인화 되비춤** — `lib/scoring.ts`에 `buildEchoQuote`+`ECHO_PHRASES`(문항별 1인칭 되비춤, REVERSE_YN 방향은 문장에 박아 안전화). GapDiagnosisCard·PriorityCard에 인용 1줄(있을 때만). TDD.

### 그룹 3 — 전환·신뢰 마감
4. **하단 sticky 카톡 CTA** — `StickyCtaBar.tsx` + `lib/sticky-cta-copy.ts`(최약Stage/빈틈 분기 1인칭, TDD). result/deep-result 하단 fixed, 부모 pb 패딩. *과장 '무료' 미검증 표현 금지 — 기존 CTACard 약속과 톤 일치.*
6. **사회적증거 배지** — `lib/social-proof.ts`(실측 게이트, TDD). `benchmark.ts` SAMPLE_SIZE 단일 출처, 임계 미만/seed면 정성 폴백(표시광고법 안전). 현재 seed라 정성 카피로 노출.
8. **분석중 인터스티셜** — `AnalyzingInterstitial.tsx` + `buildSteps` 순수(TDD). `analyzing` phase 추가, 1.8초 3단계(실제 산출값만, 가짜 수치 금지), reduced-motion·hidden 단축.

## 백로그 (구현 보류 — 후속 사이클)

| rank | 항목 | 북극성 | effort | 비고 |
|---|---|---|---|---|
| 9 | 인스타 9:16 결과 공유카드 + 카카오 공유 | 바이럴 | M | html-to-image, Kakao SDK 키, 정적 SVG 레이더 |
| 10 | 동적 OG 이미지 + 결과 URL 상태화 | 바이럴 | L | Phase→URL 라우팅 리팩터 |
| 11 | 결과 직전 소프트 게이트(스킵 가능) | 카톡전환 | M | 강제 금지, 건너뛰기 필수 |
| 12 | 강점 인정 박스 + Stage 백분위 태그 | 카톡전환 | M | benchmark 표본 의존 |
| 13 | 문항별 드롭오프 계측 강화 | 완료율 | S | quiz_answer에 index |
| 14 | 채널추가 즉시 인센티브 오퍼 | 카톡전환 | M | 웰컴메시지 운영 연계 |
| 15 | 광고성 정보 법적 표기/동의 분리 | 신뢰 | S | 정보통신망법 §50 가드레일 |

## 검증

각 순수 모듈 vitest TDD, 그룹마다 `npx tsc --noEmit` + `npm run build`. 스코어링 회귀 없음(순서 불변성 테스트). 트래킹은 추가만(기존 이벤트명 불변).

## 전체 출력 원본

리서치 raw output: `tasks/wiivjv8v2.output` (51 finding + 15 백로그 + 8 상세 스펙).
