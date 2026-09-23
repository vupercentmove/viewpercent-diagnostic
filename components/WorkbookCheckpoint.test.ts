import { describe, expect, it, vi } from "vitest";
import type { ReactElement, ReactNode } from "react";

const { reportWorkbookCheckpoint } = vi.hoisted(() => ({ reportWorkbookCheckpoint: vi.fn() }));
vi.mock("@/lib/feedback-client", () => ({ reportWorkbookCheckpoint }));
vi.mock("@/lib/analytics", () => ({ trackWorkbookCheckpointCta: vi.fn() }));

import WorkbookCheckpoint from "./WorkbookCheckpoint";

function findAnchor(node: ReactNode): ReactElement<{ onClick?: () => void }> | null {
  if (!node || typeof node !== "object" || !("type" in node)) return null;
  const element = node as ReactElement<{ children?: ReactNode; onClick?: () => void }>;
  if (element.type === "a") return element;
  const children = element.props.children;
  const list = Array.isArray(children) ? children : [children];
  for (const child of list) {
    const found = findAnchor(child);
    if (found) return found;
  }
  return null;
}

describe("WorkbookCheckpoint", () => {
  it.each([3, 5] as const)("chapter %s CTA click을 서버 체크포인트 기록과 연결한다", (stageId) => {
    reportWorkbookCheckpoint.mockReset();
    const tree = WorkbookCheckpoint({ stageId, onContinue() {} });
    findAnchor(tree)?.props.onClick?.();
    expect(reportWorkbookCheckpoint).toHaveBeenCalledWith(stageId);
  });
});
