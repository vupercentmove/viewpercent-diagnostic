import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/react";
import { getSiteUrl } from "@/lib/constants";
import "@/styles/globals.css";

const SITE_URL = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "뷰퍼센트무브 브랜드 자가진단",
  description:
    "광고비를 더 쓰기 전에, 매출이 어디서 새고 있는지부터. 패션 이커머스 브랜드를 위한 6단계 자가진단.",
  openGraph: {
    title: "뷰퍼센트무브 브랜드 자가진단",
    description: "광고비를 더 쓰기 전에, 매출이 어디서 새고 있는지부터.",
    type: "website",
    images: [{ url: "/api/og", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // 접근성: 사용자 확대 허용 (maximumScale/userScalable 강제 금지)
  themeColor: "#06091D",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="preconnect"
          href="https://cdn.jsdelivr.net"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <main className="max-w-[720px] mx-auto px-4 py-6">{children}</main>
        <Analytics />
      </body>
    </html>
  );
}
