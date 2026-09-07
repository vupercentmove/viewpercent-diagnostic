/**
 * 결과 화면에서 서버로 보내는 가벼운 신호 — 전부 fire-and-forget.
 *
 * 실패해도 화면은 그대로 간다. 여기서 보내는 건 "이 사람이 뭘 눌렀나"이지 결과
 * 자체가 아니라서, 못 보내도 사용자가 잃는 게 없다. 그래서 에러를 전부 삼킨다.
 *
 * keepalive: 카톡 버튼은 새 탭을 열고 현재 페이지는 뒤로 가므로, 페이지가 사라져도
 * 요청이 끊기지 않게 한다.
 *
 * `code`는 저장 API(/api/diagnostic-result)가 발급한 결과 행 핸들이다. 공유 링크로
 * 들어온 사람이나 새로고침으로 복원된 화면에는 code가 없고, 그 경우 호출부가
 * 아예 부르지 않는다.
 */
function send(path: string, body: Record<string, unknown>): void {
  try {
    fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* noop */
  }
}

/** 카톡 CTA 클릭 → diagnostic_results.cta_clicked = true */
export function reportCtaClick(code: string): void {
  send("/api/cta-click", { code });
}

/** "이 중 어디가 제일 의외였어요?" 단계 선택 (+ 선택적 한 줄) */
export function submitReaction(code: string, stageId: number, note?: string): void {
  const trimmed = note?.trim();
  send("/api/result-feedback", {
    code,
    reactionStage: stageId,
    ...(trimmed ? { reactionNote: trimmed } : {}),
  });
}

/** 정밀: 모름으로 답한 것 중 "먼저 해보고 싶은 것" */
export function submitUnknownPick(code: string, pick: string): void {
  send("/api/result-feedback", { code, unknownPick: pick });
}
