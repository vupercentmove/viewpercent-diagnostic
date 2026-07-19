/**
 * AI 진단 코멘트 정리 — 구조 라벨(되받기/인과/트리거)·번호·마크다운(**·__·`) 마커를 제거해
 * 자연스러운 문장만 남긴다. 되받기→인과→트리거 '순서'(문장 배열)는 그대로 유지하고,
 * 그 라벨 단어와 강조 마커만 노출되지 않게 한다.
 */
export function cleanComment(raw: string): string {
  return raw
    .split("\n")
    .map((line) =>
      line
        .replace(/\*\*|__|`/g, "") // 마크다운 강조 마커 제거
        .replace(/^\s*(?:[-*•]|\(?\d+[).])\s*/, "") // 앞머리 번호·불릿 제거 (예: "1)", "- ")
        .replace(/^\s*(?:되받기|인과|트리거)\s*[:：\-—]?\s*/, "") // 구조 라벨 제거
        .trim()
    )
    .filter((line) => line.length > 0)
    .join("\n");
}
