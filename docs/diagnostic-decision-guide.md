# 고객 흐름과 실행 판단 안내 (2026-09-21)

## 범위와 근거

기존 빠른 10문항 / 정밀 27문항의 단계·응답 타입·순서·점수·공유 인코딩을 유지한다.
읽기 전용 참고: `viewpercent-growth-workbook/lib/questions.ts`, `lib/workbook.ts`, `shopping_flow_extracted.json`.
워크북의 5개 병목을 기존 6단계 점수에 새로 섞지 않는다. 고객 근거 → 실행 우선순위 → 다음 확인이라는 운영 순서를 결과에 반영한다.

| 기존 단계 | 참고 철학을 반영한 판단 / 실행 |
| --- | --- |
| 욕구·검색·방문 | 소재별 클릭 이후 행동을 보고 유입·예산 판단 |
| 체류 | 고객의 표현과 다음 클릭을 보고 메인 안내 순서 선택 |
| 쇼핑의 시작 | 후기·문의에서 구매 이유와 핏·소재 질문을 골라 설명에 연결 |
| 구매결정 | 결제·배송·교환 근거로 편하게 고를 조건과 안내 결정 |
| 구매완료·기다림 | 지킬 배송 약속·선제 안내·감사 메시지와 담당자 연결 |
| 배송·수령완료 | 수령 후 후기와 다음 주문을 보고 관계를 이어갈 시점 결정 |

기존 문항 대부분은 이 근거를 이미 묻는다. 견해를 묻던 q6b만 재구매 검토에서 카테고리 특성으로 설명한 경험으로 다듬었다. 카테고리 판단이라는 의미와 ‘예=0’은 유지하며 예시·되비춤·빈틈 메시지를 함께 정리했다. 기존 공유 링크에는 문구 버전이 없으므로 과거 링크도 현재 질문 문구로 표시된다. 과거 응답과 신규 응답의 문항 표현은 완전히 동일하지 않다.

## 결정론적 결과

`lib/decision-guide.ts`는 네트워크·모델·시간·무작위 값 없이 콘텐츠를 생성한다.

- 기존 점수 함수의 최약 측정 단계와 동점 순서를 사용한다.
- 실제 답한 낮은 항목(<50)을 최대 3개 인용한다. 낮은 항목이 없으면 실제 측정 응답을 인용한다.
- 빠른 진단의 추가 심화는 기존 최약 단계의 근거만 보강한다.
- 명시적 모름만 따로 표시한다. 생략 문항을 모름으로 바꾸지 않는다.
- 낮은 subArea를 우선 작업으로, 다른 단계의 모름도 다음 근거 확인 대상으로 연결한다.
- 전부 모름/빈 답변은 판단 보류, 측정 단계가 모두 양호하면 유지할 기준으로 분기한다.
- 고객 행동의 실측, 매출 손실, 인과관계, 대표의 역량·인력·대행사 관계를 추정하지 않는다.

결과의 순서는 답변 근거 → 함께 보인 패턴 → AI 초안 작업 → 대표의 판단 → 파트너 역할 → 문의다.
AI는 제공된 고객 기록의 정리·초안을 돕고, 대표와 파트너는 근거 선택·우선순위·실행·다음 확인을 연결한다.
`UnknownPickCard`의 모름을 ‘안 해본 일’로 단정하던 표시도 ‘확인 전’으로 맞췄다.

## 유지한 경계

- 저장/API·URL 인코딩·CTA의 중앙 URL과 클릭 tracking/code 전달은 변경하지 않았다.
- `sticky_cta_view` 마운트 시점, 실제 CTA 노출 조건 모두 변경하지 않았다.
- `ReactionCard`·`UnknownPickCard`의 기록 흐름과 code 없는 공유·복원 시 생략 동작을 유지한다.
- 원본 작업 디렉터리·워크북·Excel 추출본은 수정하지 않았다. Claude는 호출하지 않았다.

## 검증

새 단위/HTML 렌더링 테스트는 `lib/decision-guide.test.ts`, `lib/decision-experience.test.ts`에 있다.
미구현 상태에서 17개 실패를 확인한 후 구현했다. 모름 카드 표현도 실패를 먼저 확인한 후 수정했다.
전체 테스트, 타입 검사, 빌드를 실행한다. Vitest 4 / Vite 8의 TSX 렌더링을 위해 테스트 설정에 OXC automatic JSX를 지정했다.

잠금 파일 기준으로 `npm ci`를 완료했고 Next.js 14.2.35 환경에서 전체 검증을 다시 수행했다.
로컬 서버 `127.0.0.1:3187`을 실행해 390px 모바일 폭에서 인트로 → 빠른 진단 10문항 → 결과 화면을 실제 브라우저로 확인했다. 새 역할 안내와 카카오 문의 CTA가 정상 렌더링됐다.

운영 환경변수를 연결한 뒤 정밀 진단 27문항 → ICP 2문항 → Vision → 결과까지 390px 모바일 폭에서 완료했다. 최초 검증에서는 기존 앱의 `/api/analyze`가 Anthropic API를 1회 호출했고, 전 구간 100점인데도 문제 진단형 코멘트를 만드는 모순이 확인됐다. 이후 `full-result-policy.ts`를 추가해 측정된 70점 미만 단계가 있을 때만 AI 코멘트를 요청하도록 수정했다. 재검증의 브라우저 resource 목록에는 `/api/diagnostic-result`만 있었고 `/api/analyze`는 없었다.

운영 Supabase에는 검증 표식 `hermes_deploy_verification_20260921`이 있는 full 결과를 1건 저장했다. `lookup_diagnostic`으로 같은 행을 읽어 `overall_score=100`, `cta_clicked=false`를 확인한 뒤 `/api/cta-click` 호출 후 `cta_clicked=true`를 다시 읽었다. CTA는 `https://pf.kakao.com/_xbunxen?ref=full_maintain`으로 이동해 뷰퍼센트무브 카카오톡 채널 제목을 확인했다. 메시지는 보내지 않았다.

## 실제 변경 파일

- `components/IntroHero.tsx`: 인트로 약속
- `components/ModeSelect.tsx`: 정밀 진단 설명
- `components/DecisionGuideCard.tsx`: 공통 근거·역할·파트너 카드 (신규)
- `components/ResultLayout.tsx`: 빠른·심화·공유 결과 연결
- `components/FullResultLayout.tsx`: 정밀 결과 연결과 응답 기준 표현
- `components/CTACard.tsx`: 결과별 연결 문구와 문의 CTA
- `components/UnknownPickCard.tsx`: 모름 표시 표현 보정
- `app/page.tsx`: 약한 단계가 있을 때만 AI 코멘트 요청
- `lib/decision-guide.ts`: 순수 콘텐츠 생성 함수 (신규)
- `lib/decision-guide.test.ts`: 결정론·근거·경계 조건 테스트 (신규)
- `lib/decision-experience.test.ts`: HTML 렌더링·문항 계약 테스트 (신규)
- `lib/full-result-policy.ts`: 정밀 결과 상태·AI 호출 정책 (신규)
- `lib/full-result-policy.test.ts`: 양호·확인 전·약점 상태 회귀 테스트 (신규)
- `lib/questions.ts`: q6b 검토 경험 표현
- `lib/question-examples.ts`: q6b 확인 예시
- `lib/scoring.ts`: q6b 해석 문구만 변경, 점수 로직 유지
- `vitest.config.ts`: TSX 렌더링 변환 설정
- `docs/diagnostic-decision-guide.md`: 설계·검증·한계 기록

최종 검증: 관련 테스트 27개 통과, 전체 `npm test` 33개 파일 / 261개 테스트 통과, `npx tsc --noEmit` 통과. `git diff --check` 통과.
최종 `npm run build`도 잠금 버전 Next.js 14.2.35에서 종료 코드 0으로 통과했다. Edge runtime 페이지의 정적 생성 제외 안내 외 빌드 오류는 없었다.
