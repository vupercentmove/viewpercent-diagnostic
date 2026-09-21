import { getWorkbookChapter } from "@/lib/workbook-content";

export default function WorkbookChapterIntro({
  stageId,
  onStart,
}: {
  stageId: number;
  onStart: () => void;
}) {
  const chapter = getWorkbookChapter(stageId);

  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-vp-blue">Chapter {stageId}</p>
      <h2 className="mt-2 text-[21px] font-medium leading-snug text-vp-navy">{chapter.title}</h2>
      <p className="mt-3 text-[13.5px] leading-relaxed text-gray-600">{chapter.purpose}</p>

      <div className="mt-5 rounded-xl bg-gray-50 p-4">
        <p className="text-[11px] font-medium text-gray-500">이번 챕터에서 볼 것</p>
        <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-gray-700">
          {chapter.checkPoints.map((item) => <li key={item}>· {item}</li>)}
        </ul>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-100 p-3.5">
          <p className="text-[10.5px] font-medium text-vp-blue">AI가 도울 일</p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-gray-600">{chapter.aiRole}</p>
        </div>
        <div className="rounded-xl border border-gray-100 p-3.5">
          <p className="text-[10.5px] font-medium text-vp-navy">대표가 판단할 일</p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-gray-600">{chapter.ownerDecision}</p>
        </div>
      </div>

      <div className="mt-4 rounded-lg border-l-2 border-vp-blue bg-vp-blue/5 px-3.5 py-3">
        <p className="text-[10.5px] text-vp-blue">이 챕터를 마치면</p>
        <p className="mt-1 text-[13px] font-medium text-vp-navy">{chapter.output}</p>
      </div>

      <button onClick={onStart} className="mt-5 w-full rounded-lg bg-vp-blue py-3.5 text-sm font-medium text-white hover:bg-vp-blue-hover">
        질문 시작하기
      </button>
    </div>
  );
}
