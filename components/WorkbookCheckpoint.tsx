"use client";

import { buildKakaoUrl } from "@/lib/constants";
import { trackWorkbookCheckpointCta } from "@/lib/analytics";
import { getWorkbookChapter } from "@/lib/workbook-content";

export default function WorkbookCheckpoint({
  stageId,
  onContinue,
}: {
  stageId: 3 | 5;
  onContinue: () => void;
}) {
  const chapter = getWorkbookChapter(stageId);
  const copy = stageId === 3
    ? "상품의 매력과 고객의 불안까지 확인했습니다. 어디서부터 바꿀지 막힌다면 지금 답변을 바탕으로 함께 순서를 정할 수 있어요."
    : "광고만 바꿔서는 해결되지 않는 구매 전후 경험까지 확인했습니다. 소재·상품페이지·운영을 한 흐름으로 연결해볼 수 있어요.";

  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-vp-blue">Checkpoint · Chapter {stageId}</p>
      <h2 className="mt-2 text-[20px] font-medium leading-snug text-vp-navy">{chapter.title}까지 확인했어요.</h2>
      <p className="mt-3 text-[13.5px] leading-relaxed text-gray-600">{copy}</p>
      <a
        href={buildKakaoUrl(`workbook_checkpoint_${stageId}`)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackWorkbookCheckpointCta(stageId)}
        className="mt-5 block w-full rounded-lg bg-[#FEE500] py-3.5 text-center text-sm font-medium text-[#191919] hover:bg-[#F5DC00]"
      >
        지금까지 확인한 내용으로 문의하기
      </a>
      <p className="mt-2 text-center text-[10.5px] leading-relaxed text-gray-400">
        작성한 답변은 자동 전송되지 않아요. 상담에서 필요한 부분만 이어서 말씀해 주세요.
      </p>
      <button onClick={onContinue} className="mt-1 w-full py-3 text-[12.5px] text-gray-500 hover:text-vp-blue">
        다음 챕터 계속하기
      </button>
    </div>
  );
}
