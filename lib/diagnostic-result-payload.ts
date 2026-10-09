import { DEEP_QUESTIONS } from "./deep-questions";
import type { IcpSignals } from "./full-deep-content";
import type { Answers } from "./scoring";

export type QuickResultPayload = {
  quickAnswers: Answers;
  deepStageId?: number;
  deepAnswers?: Answers;
};

export function buildQuickResultPayload(
  quickAnswers: Answers,
  deep?: { deepStageId: number; deepAnswers: Answers }
): QuickResultPayload {
  return deep ? { quickAnswers, ...deep } : { quickAnswers };
}

export type FullResultPayload = {
  diagnostic_mode: "full";
  fullAnswers: Answers;
  vision_answer: string;
  icp_signals: IcpSignals;
};

export function buildFullResultPayload(
  answers: Answers,
  vision: string,
  icpSignals: IcpSignals
): FullResultPayload {
  const fullAnswers = Object.fromEntries(
    DEEP_QUESTIONS.map((question) => [question.id, answers[question.id] ?? -1])
  );
  return {
    diagnostic_mode: "full",
    fullAnswers,
    vision_answer: vision,
    icp_signals: icpSignals,
  };
}
