import { describe, expect, it } from 'vitest';
import type { Answers } from './scoring';
import { buildDecisionGuide } from './decision-guide';
import { QUICK_QUESTIONS } from './questions';
import { DEEP_QUESTIONS } from './deep-questions';
import { BANNED_WORDS, PERFORMANCE_PROMISE_PATTERN } from './copy-canon';

const quickGood = Object.fromEntries(QUICK_QUESTIONS.map(q => [q.id, 100]));
const fullGood = Object.fromEntries(DEEP_QUESTIONS.map(q => [q.id, 100]));

describe('답변에 근거한 AI와 대표의 역할', () => {
  it('빠른 진단은 최약 단계와 실제 역방향 응답을 근거로 삼는다', () => {
    const guide = buildDecisionGuide('quick', { ...quickGood, q1a: 0, q1b: 0 });
    expect(guide.stageId).toBe(1);
    expect(guide.evidence.map(e => e.questionId)).toEqual(['q1a', 'q1b']);
    expect(guide.evidence[0].answer).toBe('예');
    expect(guide.status).toBe('check');
    expect(guide.aiTask).toContain('소재');
    expect(guide.aiTask).toContain("'욕구·검색·방문'에서는");
    expect(guide.ctaBridge).toContain("확인할 영역: '욕구·검색·방문'");
    expect(guide.ownerTask).toContain('유입');
  });
  it('정방향 아니요와 리커트 눈금을 실제 선택대로 표시한다', () => {
    const guide = buildDecisionGuide('quick', { ...quickGood, q3a: 0, q3b: 25 });
    expect(guide.evidence.map(e => e.answer)).toEqual(['아니요', '2 / 5']);
  });
  it('정밀 진단은 최약 단계의 낮은 subArea를 작업에 연결한다', () => {
    const guide = buildDecisionGuide('full', { ...fullGood, d3b: 0, d3c: 0 });
    expect(guide.stageId).toBe(3);
    expect(guide.focus).toBe('불안 해소');
    expect(guide.evidence.map(e => e.questionId)).toEqual(['d3b', 'd3c']);
    expect(guide.aiTask).toContain('불안 해소');
    expect(guide.ownerTask).toContain('불안 해소');
  });
  it('모름과 생략을 구분하고 다른 단계의 모름도 먼저 확인할 근거로 남긴다', () => {
    const answers: Answers = { ...fullGood, d3b: 0, d1a: -1, d1b: -1 };
    delete answers.d1e;
    const guide = buildDecisionGuide('full', answers);
    expect(guide.stageId).toBe(3);
    expect(guide.unknown.map(e => e.questionId)).toEqual(['d1a', 'd1b']);
    expect(guide.unknown[0].answer).toBe('잘 모르겠어요');
    expect(guide.nextStep).toContain('유입 추적');
    expect(guide.unknown.some(e => e.questionId === 'd1e')).toBe(false);
  });
  it('전부 모름이면 약점으로 판정하지 않고 첫 명시적 모름에서 확인을 시작한다', () => {
    const guide = buildDecisionGuide('full', { d2a: -1, d2b: -1 });
    expect(guide.status).toBe('unmeasured');
    expect(guide.stageId).toBe(2);
    expect(guide.focus).toBe('체류 데이터');
    expect(guide.evidence).toEqual([]);
    expect(guide.pattern).toContain('판단을 보류');
  });
  it('빈 답변으로 응답이나 최약 단계를 만들어내지 않는다', () => {
    for (const mode of ['quick', 'full'] as const) {
      const guide = buildDecisionGuide(mode, {});
      expect(guide.stageId).toBeNull();
      expect(guide.evidence).toEqual([]);
      expect(guide.unknown).toEqual([]);
      expect(guide.status).toBe('unmeasured');
    }
  });
  it('모두 양호한 답변은 결함을 단정하지 않고 유지할 기준을 제안한다', () => {
    for (const [mode, answers] of [['quick', quickGood], ['full', fullGood]] as const) {
      const guide = buildDecisionGuide(mode, answers);
      expect(guide.status).toBe('maintain');
      expect(guide.pattern).toContain('유지');
      expect(guide.pattern).not.toMatch(/부족|새고|없어요/);
      expect(guide.evidence.every(e => e.score === 100)).toBe(true);
    }
  });
  it('정밀 단계 평균이 양호하면 개별 낮은 응답이 있어도 상위 상태와 같은 유지 안내를 쓴다', () => {
    const guide = buildDecisionGuide('full', { ...fullGood, d1a: 0 });
    expect(guide.status).toBe('maintain');
    expect(guide.pattern).toContain('유지');
    expect(guide.pattern).not.toContain('낮게 답한');
  });
  it('빠른 진단의 추가 심화는 원래 최약 단계에 속한 실제 답변만 보강한다', () => {
    const guide = buildDecisionGuide('quick', { ...quickGood, q4a: 0, q4b: 0 }, { d4c: 0, d1a: 0 });
    expect(guide.stageId).toBe(4);
    expect(guide.focus).toBe('사이즈 불안');
    expect(guide.evidence.map(e => e.questionId)).toContain('d4c');
    expect(guide.evidence.map(e => e.questionId)).not.toContain('d1a');
  });
  it('동점은 단계 순서로 고르고 입력을 바꾸지 않으며 결과가 결정론적이다', () => {
    const answers = Object.freeze({ ...fullGood, d3b: 0, d3c: 0, d4a: 0, d4b: 0 });
    const guide = buildDecisionGuide('full', answers);
    expect(guide.stageId).toBe(3);
    expect(buildDecisionGuide('full', answers)).toEqual(guide);
  });
  it('6단계 모두 서로 다른 작업과 고객 근거를 제안하며 카피 정본을 지킨다', () => {
    const tasks = new Set<string>();
    for (let stage = 1; stage <= 6; stage++) {
      const answers = { ...fullGood };
      DEEP_QUESTIONS.filter(q => q.stageId === stage).forEach(q => { answers[q.id] = 0; });
      const guide = buildDecisionGuide('full', answers);
      expect(guide.stageId).toBe(stage);
      tasks.add(guide.aiTask);
      const text = JSON.stringify(guide);
      for (const word of BANNED_WORDS) expect(text).not.toContain(word);
      expect(text).not.toMatch(PERFORMANCE_PROMISE_PATTERN);
      expect(text).not.toMatch(/!|VIEWPERCENT|무능|뒤처/);
    }
    expect(tasks.size).toBe(6);
  });
});
