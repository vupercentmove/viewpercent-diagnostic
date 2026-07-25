/**
 * /result/[encoded] — 결과 공유 링크의 SSR 진입점.
 *
 * 카카오/슬랙 봇은 JS를 실행하지 않고 초기 HTML만 파싱하므로, 개인화된 OG 메타는
 * 반드시 서버에서 generateMetadata로 내보내야 한다(클라이언트 SPA로는 불가).
 * 실제 결과 렌더링은 SharedResult(클라이언트)가 담당.
 */

import type { Metadata } from "next";
import SharedResult from "@/components/SharedResult";
import { decodeAnswers } from "@/lib/url-state";
import { buildResultSummary } from "@/lib/result-summary";
import { getSiteUrl, OG_VERSION } from "@/lib/constants";

interface PageProps {
  params: { encoded: string };
}

export function generateMetadata({ params }: PageProps): Metadata {
  const answers = decodeAnswers(params.encoded);
  const base = getSiteUrl();

  if (!answers) {
    return {
      title: "뷰퍼센트무브 브랜드 자가진단",
      description: "광고비를 더 쓰기 전에, 고객이 어디서 돌아서는지부터.",
    };
  }

  const { overall, label } = buildResultSummary(answers);

  const title = `${label.label} · 진단 ${overall}점`;
  const description = `${label.tagline} — 광고비를 더 쓰기 전에, 매출이 어디서 새는지 6단계로 점검해보세요.`;
  const ogImage = `${base}/api/og?a=${encodeURIComponent(params.encoded)}&v=${OG_VERSION}`;
  const pageUrl = `${base}/result/${params.encoded}`;
  const alt = `${label.label} · 진단 ${overall}점 — 뷰퍼센트무브`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: pageUrl,
      images: [{ url: ogImage, width: 1200, height: 630, alt }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [{ url: ogImage, alt }],
    },
  };
}

export default function ResultPage({ params }: PageProps) {
  return <SharedResult encoded={params.encoded} />;
}
