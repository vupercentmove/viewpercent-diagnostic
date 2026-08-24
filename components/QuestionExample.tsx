import { getQuestionExample } from "@/lib/question-examples";

/**
 * 문항 아래에 "어디서 확인하는가"를 한 줄로 보여준다.
 *
 * 세 문항 화면(QuizStage·DeepQuizStage·FullDeepQuizStage)이 공유한다.
 * 각자 렌더하면 세 경로의 문구·스타일이 어긋난다 — likert-scale.ts로 앵커를
 * 모은 것과 같은 이유다.
 */
export default function QuestionExample({ questionId }: { questionId: string }) {
  const example = getQuestionExample(questionId);
  if (!example) return null;

  return (
    <p className="text-[12px] text-gray-400 leading-relaxed mb-3">{example}</p>
  );
}
