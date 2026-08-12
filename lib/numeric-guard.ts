/**
 * AI 코멘트의 근거 없는 성과 수치 검출.
 *
 * 배경: 프롬프트에 "진단 결과에 없는 수치·퍼센트를 지어내지 않기"를 명시해도
 * 모델이 어길 수 있다(2026-08-12 프로덕션에서 "이탈률 20퍼센트" 날조 확인).
 * 프롬프트 지시는 확률적 방어라, 결정적 후처리로 한 번 더 거른다.
 *
 * 검출 대상은 진단 데이터로 뒷받침되지 않는 '성과 수치'뿐이다 —
 * 퍼센트(%·퍼센트·프로)와 배수(배). 점수("38점")·단계 번호("STAGE 3")는
 * 진단 결과가 제공한 값이라 단위가 붙어도 걸리지 않는다.
 */

/**
 * 숫자+단위 패턴. '프로'·'배'는 뒤에 한글이 붙는 다른 단어(프로그램·배송 등)를
 * 잘못 잡지 않도록 흔한 연결을 제외한다.
 */
const METRIC_PATTERN = /(\d+(?:\.\d+)?)\s*(%|퍼센트|프로(?!그|젝|모)|배(?!송|너|치|열|경|포|급))/g;

/**
 * text에서 allowed에 없는 성과 수치 표현을 찾아 반환한다.
 * allowed에는 진단이 실제로 제공한 값(단계 점수·종합 점수)을 넣는다 —
 * 그 값을 인용한 표현은 날조가 아니므로 통과시킨다.
 */
export function findUngroundedMetrics(text: string, allowed: number[]): string[] {
  const allowedSet = new Set(allowed);
  const found: string[] = [];
  for (const match of text.matchAll(METRIC_PATTERN)) {
    if (!allowedSet.has(Number(match[1]))) found.push(match[0]);
  }
  return found;
}
