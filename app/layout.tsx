import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "뷰퍼센트무브 브랜드 자가진단",
  description:
    "광고비를 더 쓰기 전에, 매출이 어디서 새고 있는지부터. 패션 이커머스 브랜드를 위한 6단계 자가진단.",
  openGraph: {
    title: "뷰퍼센트무브 브랜드 자가진단",
    description:
      "광고비를 더 쓰기 전에, 매출이 어디서 새고 있는지부터.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <main className="max-w-[720px] mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
