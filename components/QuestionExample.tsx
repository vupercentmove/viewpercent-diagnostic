import { getQuestionExample } from "@/lib/question-examples";

/**
 * 문항 아래에 "어디서 확인하는가"를 한 줄로 보여준다.
 *
 * 세 문항 화면(QuizStage·DeepQuizStage·FullDeepQuizStage)이 공유한다.
 * 각자 렌더하면 세 경로의 문구·스타일이 어긋난다 — likert-scale.ts로 앵커를
 * 모은 것과 같은 이유다.
 *
 * ⚠️ 바깥 마진(mb-3)을 이 컴포넌트에 두지 않는다. 예시가 없는 문항(getQuestionExample이
 * ""를 반환)에서는 이 컴포넌트가 null을 렌더하므로, 마진을 여기 두면 문항↔버튼 간격이
 * 예시 유무에 따라 12px/6px로 흔들린다. 간격은 호출부의 wrapper(`mb-3 flex flex-col
 * gap-1.5`)가 소유한다 — 여기에 mb-3을 다시 넣지 말 것.
 */
export default function QuestionExample({ questionId }: { questionId: string }) {
  const example = getQuestionExample(questionId);
  if (!example) return null;

  return (
    <p className="text-[12px] text-gray-500 leading-relaxed">{example}</p>
  );
}
