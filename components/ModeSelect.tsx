"use client";

export default function ModeSelect({
  onQuick,
  onFull,
}: {
  onQuick: () => void;
  onFull: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 mt-6">
      <button
        onClick={onQuick}
        className="w-full py-4 rounded-xl bg-vp-blue text-white font-medium hover:bg-vp-blue-hover"
      >
        빠른 진단 시작 <span className="opacity-80 text-sm">· 2분 · 10문항</span>
      </button>
      <button
        onClick={onFull}
        className="w-full py-4 rounded-xl border border-white/40 text-white font-medium hover:border-vp-blue-light hover:text-vp-blue-light"
      >
        정밀 진단 시작{" "}
        <span className="opacity-70 text-sm">· 약 10분 · 6단계 전체</span>
      </button>
      <p className="text-[12px] text-white/60 text-center leading-relaxed">
        정밀 진단은 6단계를 하나씩 깊게 봐요. 지금 어디서 새는지 구조로
        짚어드릴게요.
      </p>
    </div>
  );
}
