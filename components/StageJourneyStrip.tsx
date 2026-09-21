import { WORKBOOK_JOURNEY } from "@/lib/workbook-content";

/** 인트로에서 전체 구조를 먼저 보여주는 6챕터 지도 */
export default function StageJourneyStrip() {
  return (
    <section className="mb-6 rounded-xl border border-white/10 bg-white/[0.04] p-4" aria-label="성장 워크북 6챕터">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-vp-blue-light">Workbook map</p>
          <p className="mt-1 text-[13px] font-medium text-white">고객이 찾아와 다시 찾기까지</p>
        </div>
        <span className="text-[10.5px] text-white/45">6챕터 · 약 10분</span>
      </div>
      <ol className="space-y-2">
        {WORKBOOK_JOURNEY.map((chapter) => (
          <li key={chapter.stageId} className="flex items-start gap-3 rounded-lg bg-white/[0.04] px-3 py-2.5">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/20 text-[10.5px] text-vp-blue-light">
              {chapter.stageId}
            </span>
            <div className="min-w-0">
              <p className="text-[12.5px] font-medium text-white">{chapter.title}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-white/50">{chapter.output}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
