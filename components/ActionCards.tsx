"use client";

import { STAGES } from "@/lib/stage-meta";
import { getTag, type ScoreTag } from "@/lib/scoring";

interface ActionCardsProps {
  stageScores: { stageId: number; score: number }[];
}

/** Stage별 추천 액션 — 가장 약한 2개 Stage에 대해 표시 */
const ACTION_RECS: Record<
  number,
  { title: string; actions: string[]; timeframe: string }
> = {
  1: {
    title: "광고 효율 구조 점검",
    actions: [
      "광고가 데려온 고객이 어디서 이탈하는지 흐름 추적하기",
      "광고 소재별 ROAS가 아닌 '이후 행동'까지 연결해서 보기",
      "광고비 올리기 전에, 받아낼 준비(체류·전환)부터 점검",
    ],
    timeframe: "1~2주 내 점검",
  },
  2: {
    title: "첫인상 차별화 설계",
    actions: [
      "메인 페이지 3초 안에 '여기 뭔가 다르다' 전달하기",
      "브랜드 톤앤매너를 한 문장으로 정리하기",
      "경쟁 브랜드 5개와 나란히 놓고 차별점 확인",
    ],
    timeframe: "이번 주 착수",
  },
  3: {
    title: "상세페이지 매력 전달 강화",
    actions: [
      "'예쁘니까'를 넘어서는 구매 이유를 상세페이지에 녹이기",
      "고객의 '나한테 맞을까?' 걱정에 답하는 콘텐츠 추가",
      "기능 나열이 아닌, 고객 관점의 가치 전달로 전환",
    ],
    timeframe: "상위 5개 상품부터",
  },
  4: {
    title: "구매 결정 장벽 제거",
    actions: [
      "장바구니 이탈률 확인 + 이탈 시점 분석",
      "사이즈별 리뷰 노출 강화 (실착 후기, 체형별 필터)",
      "첫 구매 혜택을 결제 직전에 다시 한번 보여주기",
    ],
    timeframe: "데이터 확인 후 즉시",
  },
  5: {
    title: "재고·배송 약속 관리",
    actions: [
      "인기 상품 품절 전 알림 시스템 구축",
      "배송 예정일 커뮤니케이션 강화",
      "품절 시 대체 추천 or 입고 알림 신청 유도",
    ],
    timeframe: "운영 프로세스 개선",
  },
  6: {
    title: "재구매 경험 설계",
    actions: [
      "첫 구매 후 7일, 14일, 30일 시점 리텐션 흐름 설계",
      "'우리 카테고리는 재구매 없어'가 사실인지 데이터로 확인",
      "단골 고객에게 '당신이 특별하다'는 경험 만들기",
    ],
    timeframe: "이번 달 내 설계",
  },
};

const PRIORITY_BADGE: Record<number, { label: string; color: string }> = {
  1: { label: "1순위", color: "bg-vp-risk-bg text-vp-risk" },
  2: { label: "2순위", color: "bg-vp-warn-bg text-vp-warn" },
};

export default function ActionCards({ stageScores }: ActionCardsProps) {
  // 점수 낮은 순으로 정렬, 상위 2개
  const sorted = [...stageScores].sort((a, b) => a.score - b.score);
  const top2 = sorted.slice(0, 2);

  return (
    <section className="bg-white border border-gray-100 rounded-[14px] p-5 mb-4 animate-fade-in-up">
      <h3 className="text-[13px] font-medium text-gray-500 mb-4">
        지금 바로 할 수 있는 액션
      </h3>
      <div className="flex flex-col gap-4">
        {top2.map(({ stageId, score }, idx) => {
          const stage = STAGES.find((s) => s.id === stageId)!;
          const rec = ACTION_RECS[stageId];
          const badge = PRIORITY_BADGE[idx + 1];
          const tag = getTag(score);

          return (
            <div
              key={stageId}
              className="border border-gray-100 rounded-xl p-4 bg-gray-50/50"
            >
              {/* Header */}
              <div className="flex items-center gap-2 mb-3">
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${badge.color}`}
                >
                  {badge.label}
                </span>
                <span className="text-[11px] text-gray-400">
                  {stage.label} — {stage.name}
                </span>
                <span className="ml-auto text-[11px] text-gray-400">
                  {score}점
                </span>
              </div>

              {/* Title */}
              <h4 className="text-[15px] font-semibold text-gray-900 mb-3">
                {rec.title}
              </h4>

              {/* Action list */}
              <ul className="flex flex-col gap-2 mb-3">
                {rec.actions.map((action, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-[13px] text-gray-600 leading-relaxed"
                  >
                    <span className="text-vp-blue font-bold mt-0.5 shrink-0">
                      {i + 1}.
                    </span>
                    {action}
                  </li>
                ))}
              </ul>

              {/* Timeframe */}
              <div className="text-[11px] text-vp-blue font-medium bg-vp-blue/5 rounded-md px-3 py-1.5 inline-block">
                {rec.timeframe}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
