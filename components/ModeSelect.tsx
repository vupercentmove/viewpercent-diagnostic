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
      <div>
        <button
          onClick={onFull}
          className="w-full py-3.5 rounded-xl bg-vp-blue text-white hover:bg-vp-blue-hover"
        >
          <span className="block text-[11px] text-white/80 mb-0.5">
            6챕터를 따라 판단까지 정리
          </span>
          <span className="font-medium">
            성장 워크북 시작하기{" "}
            <span className="opacity-80 text-sm">· 약 10분</span>
          </span>
        </button>
        <p className="text-[11.5px] text-white/70 text-center mt-2">
          개념을 읽고 바로 답하기 · 결과는 실행 브리프로 정리
        </p>
      </div>
      <button
        onClick={onQuick}
        className="w-full py-4 rounded-xl border border-white/40 text-white font-medium hover:border-vp-blue-light hover:text-vp-blue-light"
      >
        먼저 2분 빠른 점검하기{" "}
        <span className="opacity-70 text-sm">· 10문항</span>
      </button>
      <p className="text-[12px] text-white/60 text-center leading-relaxed">
        아직 10분이 어렵다면 빠른 점검으로 먼저 확인할 구간을 찾을 수 있어요.
      </p>
    </div>
  );
}
