import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import IntroHero from '../components/IntroHero';
import ResultLayout from '../components/ResultLayout';
import FullResultLayout from '../components/FullResultLayout';
import { QUICK_QUESTIONS } from './questions';
import { DEEP_QUESTIONS } from './deep-questions';
import { QUESTION_EXAMPLE } from './question-examples';
import { BANNED_WORDS } from './copy-canon';

const quick = Object.fromEntries(QUICK_QUESTIONS.map(q => [q.id, 0]));
const full = Object.fromEntries(DEEP_QUESTIONS.map(q => [q.id, 0]));

describe('진단 전환 경험', () => {
  it('인트로는 도구를 더 쓰기 전에 확인할 고객 흐름과 판단을 약속한다', () => {
    const html = renderToStaticMarkup(createElement(IntroHero, { onStart() {} }));
    expect(html).toContain('AI');
    expect(html).toContain('고객 흐름');
    expect(html).toContain('대표의 판단');
  });
  for (const mode of ['quick', 'deep', 'shared', 'full'] as const) {
    it(`${mode} 결과에 근거, 역할 구분, 파트너와 카카오 문의를 순서대로 표시한다`, () => {
      const html = renderToStaticMarkup(mode === 'full'
        ? createElement(FullResultLayout, { answers: full, vision: null, aiComment: null, onRestart() {} })
        : createElement(ResultLayout, { answers: quick, variant: mode === 'deep' ? 'deep-result' : mode === 'shared' ? 'shared' : 'result', deepStageId: 1, deepAnswers: { d1a: 0 } }));
      const labels = ['답변에서 확인한 근거', '답변에서 함께 보인 패턴', 'AI가 도울 수 있는 일', '대표의 판단이 필요한 일', '뷰퍼센트무브가 함께 맡을 일', '카카오톡으로 마케팅 문의'];
      const indices = labels.map(label => html.indexOf(label));
      expect(indices.every(index => index >= 0)).toBe(true);
      expect(indices).toEqual([...indices].sort((a, b) => a - b));
      expect(html).toContain('https://pf.kakao.com/');
      expect(html).not.toContain('이 중 어디가 제일 의외였어요?'); // code 없는 공유·복원
    });
  }
  it('code 있는 결과에는 기존 피드백을 유지한다', () => {
    const html = renderToStaticMarkup(createElement(FullResultLayout, {
      answers: { ...full, d1a: -1, d1b: -1 }, vision: null, aiComment: null, onRestart() {}, resultCode: 'test-result',
    }));
    expect(html).not.toContain('아직 안 해보셨다고');
    expect(html).toContain('아직 확인 전');
    expect(html).toContain('의외');
    expect(html).toContain('먼저');
    expect(html).toContain('AI가 도울 수 있는 일');
  });
  it('전 구간 양호 결과는 AI 문제 진단과 약점 카드로 뒤집지 않는다', () => {
    const html = renderToStaticMarkup(createElement(FullResultLayout, {
      answers: Object.fromEntries(DEEP_QUESTIONS.map(q => [q.id, 100])),
      vision: '제품·촬영에 더 투자하기',
      aiComment: '문제가 있으니 먼저 고쳐야 합니다.',
      onRestart() {},
    }));
    expect(html).toContain('확인된 답변은 양호 범위');
    expect(html).toContain('유지할 기준');
    expect(html).not.toContain('진단 코멘트');
    expect(html).not.toContain('가장 먼저 볼 구간');
    expect(html).not.toContain('이어서 볼 구간');
    expect(html).not.toContain('문제가 있으니');
  });
  it('q6b는 카테고리 판단이라는 기존 의미를 유지하면서 현재 검토 결론을 묻는다', () => {
    const question = QUICK_QUESTIONS.find(q => q.id === 'q6b')!;
    expect(question).toMatchObject({ stageId: 6, answerType: 'yn' });
    expect(question.text).toContain('검토');
    expect(question.text).toContain('카테고리');
    expect(question.text).toContain('최근');
    expect(question.text).toContain('보고 있나요');
    expect(QUESTION_EXAMPLE.q6b).toContain('검토');
  });
  it('정밀 단계 평균 75점은 헤더·가이드·CTA 모두 유지 상태로 일치한다', () => {
    const html = renderToStaticMarkup(createElement(FullResultLayout, {
      answers: { ...Object.fromEntries(DEEP_QUESTIONS.map(q => [q.id, 100])), d1a: 0 }, vision: null, aiComment: '문제 진단형 문구', onRestart() {},
    }));
    expect(html).toContain('확인된 답변은 양호 범위');
    expect(html).toContain('유지할 기준');
    expect(html).toContain('full_maintain');
    expect(html).not.toContain('낮게 답한 항목');
    expect(html).not.toContain('문제 진단형 문구');
  });
  it('모든 문항은 정본의 금지 부사를 포함하지 않는다', () => {
    for (const question of [...QUICK_QUESTIONS, ...DEEP_QUESTIONS]) {
      for (const word of BANNED_WORDS) expect(question.text).not.toContain(word);
    }
  });
});

describe('공유·점수 문항 계약 유지', () => {
  it('빠른 문항 순서·단계·응답 타입을 유지한다', () => {
    expect(QUICK_QUESTIONS.map(q => `${q.id}:${q.stageId}:${q.answerType}`)).toEqual([
      'q1a:1:yn', 'q1b:1:yn', 'q2a:2:likert', 'q3a:3:yn', 'q3b:3:likert',
      'q4a:4:yn', 'q4b:4:yn', 'q5a:5:yn', 'q6a:6:yn', 'q6b:6:yn',
    ]);
  });
  it('심화 27문항 순서·단계·응답 타입을 유지한다', () => {
    expect(DEEP_QUESTIONS.map(q => `${q.id}:${q.stageId}:${q.answerType}`)).toEqual([
      'd1a:1:yn', 'd1b:1:yn', 'd1e:1:yn', 'd1d:1:likert',
      'd2a:2:yn', 'd2b:2:yn', 'd2c:2:likert', 'd2d:2:likert',
      'd3a:3:likert', 'd3b:3:yn', 'd3c:3:yn', 'd3d:3:likert', 'd3e:3:likert',
      'd4a:4:yn', 'd4b:4:yn', 'd4c:4:yn', 'd4d:4:yn', 'd4e:4:likert',
      'd5a:5:yn', 'd5e:5:yn', 'd5c:5:yn', 'd5d:5:yn',
      'd6a:6:yn', 'd6b:6:yn', 'd6c:6:likert', 'd6d:6:likert', 'd6e:6:yn',
    ]);
  });
});
