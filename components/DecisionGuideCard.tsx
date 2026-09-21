import type { DecisionGuide } from '@/lib/decision-guide';

export default function DecisionGuideCard({ guide }: { guide: DecisionGuide }) {
  return (
    <section aria-label="고객 흐름과 실행 판단" className="bg-white border border-vp-blue/25 rounded-[14px] p-5 mb-4 break-keep">
      <p className="text-[11px] text-vp-blue font-medium mb-2">도구를 쓰기 전에 정할 것</p>
      <h3 className="text-[19px] font-medium leading-snug mb-5">초안 다음에 필요한 판단</h3>
      <h4 className="text-[13px] font-medium mb-2">답변에서 확인한 근거</h4>
      {guide.evidence.length ? (
        <ul className="space-y-2">
          {guide.evidence.map(item => (
            <li key={item.questionId} className="bg-gray-50 rounded-lg p-3 text-[12px] leading-relaxed">
              <p className="text-gray-600">{item.question}</p>
              <p className="text-vp-navy font-medium mt-1">선택한 답 · {item.answer}</p>
            </li>
          ))}
        </ul>
      ) : <p className="text-[13px] text-gray-500">측정할 수 있는 답변이 아직 없어요.</p>}
      {guide.unknown.length > 0 && (
        <p className="mt-3 text-[12px] text-gray-600 leading-relaxed">
          잘 모르겠어요로 답한 영역 · {guide.unknown.map(item => item.area).join(' · ')}
        </p>
      )}
      <p className="text-[11px] text-gray-500 mt-3">답변을 바탕으로 정리한 확인 순서예요. 실제 이탈이나 매출 손실을 측정한 결과는 아니에요.</p>
      <div className="mt-5 pt-4 border-t border-gray-100">
        <h4 className="text-[13px] font-medium mb-2">답변에서 함께 보인 패턴</h4>
        <p className="text-[13px] text-gray-600 leading-relaxed">{guide.pattern}</p>
      </div>
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-[13px] font-medium mb-2">AI가 도울 수 있는 일</h4>
        <p className="text-[13px] text-gray-600 leading-relaxed">{guide.aiTask}</p>
      </div>
      <div className="mt-3 p-4 bg-vp-blue/5 rounded-lg">
        <h4 className="text-[13px] text-vp-blue font-medium mb-2">대표의 판단이 필요한 일</h4>
        <p className="text-[13px] text-gray-700 leading-relaxed">{guide.ownerTask}</p>
      </div>
      <p className="mt-4 text-[13px] text-gray-600 leading-relaxed">
        AI의 초안도 넣어준 근거와 질문에서 출발해요. 고객 근거를 고르고 우선순위를 정해 실행 후 다시 보는 흐름이 없으면, 기존 관점 안의 답을 반복할 수 있어요.
      </p>
      <p className="mt-3 text-[13px] text-vp-navy leading-relaxed">{guide.nextStep}</p>
      <div className="mt-5 pt-4 border-t border-gray-100">
        <h4 className="text-[13px] font-medium mb-2">뷰퍼센트무브가 함께 맡을 일</h4>
        <p className="text-[13px] text-gray-600 leading-relaxed">
          대표님이 혼자 자료 정리부터 실행까지 맡을 필요는 없어요. 뷰퍼센트무브는 고객 행동 근거를 정리하고 병목의 우선순위를 함께 정하는 외부 마케팅 파트너예요. 합의한 순서를 소재·상품페이지·운영 실행에 연결하고, 다음 판단에 쓸 고객 반응을 함께 확인합니다.
        </p>
      </div>
    </section>
  );
}
