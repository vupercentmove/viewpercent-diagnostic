import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import IntroHero from "../components/IntroHero";
import FullDeepQuizStage from "../components/FullDeepQuizStage";
import WorkbookCheckpoint from "../components/WorkbookCheckpoint";
import { WORKBOOK_CHAPTERS, WORKBOOK_TOTAL_QUESTIONS } from "./workbook-content";

function position(html: string, text: string) {
  const index = html.indexOf(text);
  expect(index).toBeGreaterThanOrEqual(0);
  return index;
}

describe("샘플 기반 성장 워크북 흐름", () => {
  it("인트로에서 전체 6챕터를 먼저 보여주고 워크북을 주 경로로 둔다", () => {
    const html = renderToStaticMarkup(createElement(IntroHero, { onStart() {}, onStartFull() {} }));
    expect(WORKBOOK_CHAPTERS).toHaveLength(6);
    for (const chapter of WORKBOOK_CHAPTERS) expect(html).toContain(chapter.title);
    expect(position(html, "성장 워크북 시작하기")).toBeLessThan(position(html, "먼저 2분 빠른 점검하기"));
    expect(html).toContain("개념을 읽고");
    expect(html).toContain("실행을 정해요");
  });

  it("정밀 경로는 질문 전에 챕터 개념과 AI·대표 역할을 구분한다", () => {
    const html = renderToStaticMarkup(createElement(FullDeepQuizStage, {
      variant: "A",
      onComplete() {},
    }));
    expect(html).toContain("고객이 찾아오는 길");
    expect(html).toContain("이번 챕터에서 볼 것");
    expect(html).toContain("AI가 도울 일");
    expect(html).toContain("대표가 판단할 일");
    expect(html).toContain(`작성 0/${WORKBOOK_TOTAL_QUESTIONS}`);
  });

  it("챕터 3·5 체크포인트는 중간 문의와 계속 진행을 함께 제공한다", () => {
    for (const stageId of [3, 5] as const) {
      const html = renderToStaticMarkup(createElement(WorkbookCheckpoint, { stageId, onContinue() {} }));
      expect(html).toContain("지금까지 확인한 내용으로 문의하기");
      expect(html).toContain("작성한 답변은 자동 전송되지 않아요");
      expect(html).toContain("다음 챕터 계속하기");
      expect(html).toContain(`workbook_checkpoint_${stageId}`);
    }
  });

  it("엑셀의 약속·감사·고객 학습 관점을 점수 문항을 바꾸지 않고 챕터 안내에 보강한다", () => {
    const waiting = WORKBOOK_CHAPTERS.find((chapter) => chapter.stageId === 5)!;
    const retention = WORKBOOK_CHAPTERS.find((chapter) => chapter.stageId === 6)!;
    expect(waiting.purpose).toContain("감사");
    expect(waiting.ownerDecision).toContain("약속");
    expect(retention.purpose).toContain("후기·문의");
    expect(retention.checkPoints.join(" ")).toContain("고객의 말");
  });
});
