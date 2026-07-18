/**
 * 컨설팅 도구 참고 — 관리자 전용(내부용)
 *
 * 2026-07-19 자사몰 활성화 딥리서치(에이전트 104개 · 3표 반증 검증, 22건 통과)에서
 * GitHub 원본 저장소로 직접 검증한 오픈소스 도구 5종을 Shopping Flow 6단계에 매핑한 것.
 *
 * ⚠️ 고객용 결과 화면(ActionCards)에는 넣지 않는다. 이 도구들은 대부분 자체 서버·DevOps가
 * 전제라, 진단도구의 주 고객층(인스타→카톡 유입 / 1억 이하 / 카페24 임대형 몰)에게 그대로
 * 권하면 검증 단서와 모순된다. 여기 데이터는 컨설턴트가 세일즈·미팅에서 "규모별로 무엇을
 * 권할지" 판단하는 근거로만 쓴다.
 *
 * 원본: 옵시디언 vault `뷰퍼센트/wiki/소스요약/자사몰 활성화 딥리서치 검증 요약.md`
 * 웹 리포트: https://claude.ai/code/artifact/d21f8a0d-fdec-40ee-8f71-a1e4aa83568f
 * GitHub 지표 기준일: 2026-07-19 스냅샷 (시간이 지나면 스타 수·릴리즈 재확인)
 */

/** 도구가 어느 규모 셀러에 맞는지 */
export type ToolFit =
  | "cloud-ok" // 유료 클라우드/경량이라 소규모도 시작 가능 (단 셀프호스팅은 자체 서버 필요)
  | "self-server" // 자체 서버·DevOps 전제 — 임대형 몰 셀러에겐 직접 권하기 어려움
  | "top-seller"; // 운영 부담이 커 자체 서버 역량 있는 상위 셀러 전용

export const FIT_META: Record<ToolFit, { label: string; color: string }> = {
  "cloud-ok": { label: "소규모도 가능", color: "bg-vp-good-bg text-vp-good" },
  "self-server": { label: "자체 서버 필요", color: "bg-vp-warn-bg text-vp-warn" },
  "top-seller": { label: "상위 셀러 전용", color: "bg-vp-risk-bg text-vp-risk" },
};

export interface ConsultingTool {
  name: string;
  url: string;
  /** 라이선스 + 규모/활동 요약 (2026-07-19 GitHub 원본 대조) */
  meta: string;
  fit: ToolFit;
}

/** 검증 통과 오픈소스 스택 5종 (전원 3-0) */
export const VERIFIED_TOOLS: Record<string, ConsultingTool> = {
  posthog: {
    name: "PostHog",
    url: "https://github.com/posthog/posthog",
    meta: "MIT 오픈코어 · ★36.5k · 셀프호스팅 월~10만 이벤트 한정(공식 지원 없음), 소규모는 클라우드 무료 티어",
    fit: "cloud-ok",
  },
  mautic: {
    name: "Mautic",
    url: "https://github.com/mautic/mautic",
    meta: "GPL-3.0(PHP) · ★10.2k · 릴리즈 7.1.3 · privacy-focused(데이터 소유권 논리와 일치)",
    fit: "self-server",
  },
  listmonk: {
    name: "Listmonk",
    url: "https://github.com/knadh/listmonk",
    meta: "AGPL-3.0(Go) · ★22.2k · 경량 뉴스레터/메일링, 자체 서버 부담 낮음",
    fit: "self-server",
  },
  gorse: {
    name: "Gorse",
    url: "https://github.com/gorse-io/gorse",
    meta: "Apache-2.0(Go) · ★9.8k · v0.5.11 · DB+Redis+Docker 필요, pre-1.0 API 변경 리스크",
    fit: "top-seller",
  },
  spree: {
    name: "Spree",
    url: "https://github.com/spree/spree",
    meta: "BSD-3(코어) · ★15.6k · v5.5.3 · \"수수료 제로\" 셀프호스팅 자사몰 플랫폼, DevOps 비용 별도",
    fit: "top-seller",
  },
};

export interface StageToolRec {
  /** 이 도구/전략이 이 Stage의 어떤 문제에 답하는지 (컨설턴트 관점, 한 줄) */
  why: string;
  /** VERIFIED_TOOLS 키 (도구 추천일 때) */
  toolKey?: keyof typeof VERIFIED_TOOLS;
  /** 도구가 아닌 전략 서사일 때의 라벨 */
  strategy?: string;
}

/** Stage(Shopping Flow 6단계) → 컨설팅 도구/전략 매핑 */
export const STAGE_TOOL_MAP: Record<number, StageToolRec[]> = {
  1: [
    {
      toolKey: "posthog",
      why: "광고가 데려온 고객이 '어디서' 이탈하는지 퍼널·세션으로 계측 (ROAS 이후 행동까지 연결)",
    },
    {
      strategy: "Nike 아크 서사",
      why: "상위 셀러 피칭용 — 입점(2017)→데이터 이유 철수(2019)→CAC 상승으로 복귀(2025). '탈출이 아니라 병행'의 검증된 근거",
    },
  ],
  2: [
    {
      toolKey: "posthog",
      why: "'메인에서 3초 안에 이탈' 가설을 세션 리플레이로 실제 관찰",
    },
  ],
  3: [
    {
      toolKey: "posthog",
      why: "AI 이미지 제거·상세페이지 개선의 전환 효과를 A/B로 클라이언트별 자체 입증 (컨설팅 상품화 기회)",
    },
    {
      toolKey: "gorse",
      why: "체류·재방문 단계의 개인화 상품 추천 — 단 자체 서버 역량 있는 상위 셀러 한정",
    },
  ],
  4: [
    {
      toolKey: "posthog",
      why: "장바구니 이탈률·이탈 시점을 퍼널로 확인 (개선 액션의 근거 데이터)",
    },
  ],
  5: [
    {
      toolKey: "mautic",
      why: "배송·감사 커뮤니케이션 자동화 — 단 '매번 새로운' 메시지 원칙은 도구가 아닌 기획으로 채워야",
    },
    {
      toolKey: "listmonk",
      why: "감사·배송 안내 발송의 경량 시작점 (구독료·건당 과금 없음)",
    },
  ],
  6: [
    {
      toolKey: "mautic",
      why: "7·14·30일 재구매 리텐션 시퀀스, 행동 트리거 드립 — 신규 획득비용을 재도달 비용으로 재배분",
    },
    {
      toolKey: "listmonk",
      why: "단골 대상 뉴스레터의 저부담 옵션",
    },
    {
      toolKey: "spree",
      why: "플랫폼 이탈을 결심한 상위 셀러의 자사몰 이전 후보 ('수수료 제로' 포지셔닝)",
    },
  ],
};

/** 인용 금지·공백 — 세일즈 자료에 넣으면 안 되는 것들 */
export const CITATION_WARNINGS: string[] = [
  "❌ \"마켓플레이스가 고객 데이터 82% 접근 제한\" / \"LTV:CAC 3:1 최소선\" — 원출처 미확인(전부 블로그), 인용 금지",
  "❌ D2C 4대 편익(브랜드·포지셔닝·데이터·리텐션) — 0-3 반증, 원 논문 결론(하이브리드 우위)과 다른 과장",
  "❌ Open Loyalty — 적극 탈락(핵심 코드 부재·2023-09 이후 활동 전무). '오픈소스 로열티 플랫폼'으로 추천 불가",
  "⚠️ 공백: 카페24·카카오싱크·네이버페이 등 한국 시장 특화 해법은 검증 통과 0건 — 이 매핑의 한국 적용은 방향적 유추",
  "⚠️ 공백: 장바구니 이탈 복구·리뷰/실구매 인증·로열티·CRM(Chatwoot) 범주는 검증 통과 도구 없음",
];
