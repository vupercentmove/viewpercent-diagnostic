/**
 * AI 코멘트가 진단과 다른 단계를 문제 지점으로 지목하는 것을 잡는다.
 *
 * 배경(2026-08-17 프로덕션 실측): 정밀 진단에서 최약 구간이 STAGE 3 '쇼핑의 시작'
 * (70점)으로 판정됐는데, 같은 화면의 AI 코멘트는 "실제 구매 결정 단계에서 이탈이
 * 생기고 있네요"라고 STAGE 4 '구매결정'(90점, 두 번째로 높은 점수)을 지목했다.
 * 헤로와 코멘트가 한 화면에서 서로 다른 단계를 말해 결과 신뢰도를 깎았다.
 *
 * 원인은 full 모드 프롬프트가 최약 단계 한 줄만 넘기고 나머지 5단계 점수를 주지
 * 않은 것이었다(quick 모드는 6단계 전부 전달). 맥락이 없으니 그럴듯한 퍼널 서사를
 * 지어냈다. 프롬프트는 고쳤지만 생성 결과를 보장하지는 못하므로 여기서 한 번 더 막는다.
 */
import { STAGES } from "./stage-meta";

/**
 * 코멘트가 최약 단계를 빼고 다른 단계만 지목하는지 판정한다.
 *
 * 판정 규칙 — 아래 둘을 모두 만족할 때만 어긋난 것으로 본다.
 *   1. 최약 단계 이름이 코멘트에 없다
 *   2. 다른 단계 이름이 코멘트에 있다
 *
 * 둘 다 요구하는 이유: "앞 단계에서 잘 데려온 고객이"처럼 다른 단계를 **맥락으로**
 * 언급하는 건 정상이다. 최약 단계를 함께 말하고 있으면 통과시킨다. 단계 이름을
 * 하나도 안 쓴 코멘트도 통과다 — 지목 자체가 없으므로 어긋날 수 없다.
 */
export function mentionsWrongStageOnly(comment: string, weakestStage: number): boolean {
  const weakest = STAGES.find((s) => s.id === weakestStage);
  if (!weakest) return false;

  // ⚠️ 공백을 지우고 비교한다. 정본 단계명은 '구매결정'인데 AI는 '구매 결정'으로 쓴다
  //    (실제 관측 사례). 공백을 그대로 두면 바로 그 케이스를 놓친다.
  const flat = comment.replace(/\s/g, "");
  const has = (name: string) => flat.includes(name.replace(/\s/g, ""));

  if (has(weakest.name)) return false;

  return STAGES.some((s) => s.id !== weakestStage && has(s.name));
}
