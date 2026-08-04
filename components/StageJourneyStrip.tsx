/** 인트로 화면용 6단계 여정 스트립 — 진단 구조를 눈으로 먼저 보여준다 */

const JOURNEY = [
  { id: 1, full: "욕구·검색·방문", short: "방문" },
  { id: 2, full: "체류", short: "체류" },
  { id: 3, full: "쇼핑의 시작", short: "쇼핑 시작" },
  { id: 4, full: "구매결정", short: "구매 결정" },
  { id: 5, full: "구매완료·기다림", short: "기다림" },
  { id: 6, full: "배송·수령완료", short: "수령" },
];

export default function StageJourneyStrip() {
  return (
    <div className="relative mb-5" aria-label="쇼핑 플로우 6단계">
      <div className="absolute left-[7%] right-[7%] top-[11px] h-px bg-white/15" />
      <ol className="grid grid-cols-6">
        {JOURNEY.map((s) => (
          <li
            key={s.id}
            title={s.full}
            className="relative flex flex-col items-center gap-1.5"
          >
            <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-white/25 bg-vp-navy text-[11px] text-vp-blue-light">
              {s.id}
            </span>
            <span className="break-keep text-center text-[10.5px] leading-tight text-white/60">
              {s.short}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
