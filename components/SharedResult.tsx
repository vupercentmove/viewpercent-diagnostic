"use client";

import { useEffect, useMemo } from "react";
import ResultLayout from "@/components/ResultLayout";
import IntroHero from "@/components/IntroHero";
import { decodeAnswers } from "@/lib/url-state";
import { trackShareReferralStart } from "@/lib/analytics";

interface SharedResultProps {
  encoded: string;
}

/**
 * 공유 링크(/result/[encoded]) 수신자 화면.
 * 답변을 디코딩해 결과를 바로 보여주고(analyzing 없음), '내 진단 시작' 유도.
 * 유효하지 않은 코드면 인트로로 폴백.
 */
export default function SharedResult({ encoded }: SharedResultProps) {
  const answers = useMemo(() => decodeAnswers(encoded), [encoded]);

  useEffect(() => {
    if (answers) trackShareReferralStart();
  }, [answers]);

  if (!answers) {
    // 깨진 링크 → 직접 진단 시작
    return (
      <IntroHero
        onStart={() => {
          window.location.href = "/";
        }}
      />
    );
  }

  return <ResultLayout answers={answers} variant="shared" />;
}
