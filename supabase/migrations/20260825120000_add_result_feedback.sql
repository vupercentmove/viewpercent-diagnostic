-- 결과 화면 반응 수집 (2026-08-25)
--
-- 배경: 실고객 완주 6명 중 말을 건 사람이 1명. 결과 화면의 유일한 출구가 상담
-- 신청(카톡)이라 "이건 몰랐네" 한 마디를 둘 곳이 없었다. 판결로 끝나던 결과를
-- 질문으로 끝내고, 그 답을 받아둔다. 그 1명이 반응한 것도 결과가 아니라 문항
-- (= 질문)이었다.
--
-- 비파괴: 컬럼 4개 추가 + 함수 1개. 기존 행·기존 RPC에 영향 없음.
-- ⚠️ 앱이 record_result_feedback을 호출하기 전에 먼저 적용돼야 한다 — 함수가
--    없으면 API가 502를 내고 클라이언트는 그걸 삼키므로 반응이 조용히 유실된다.

alter table public.diagnostic_results
  add column if not exists reaction_stage smallint,
  add column if not exists reaction_note  text,
  add column if not exists unknown_pick   text,
  add column if not exists feedback_at    timestamptz;

comment on column public.diagnostic_results.reaction_stage is
  '결과 화면 "이 중 어디가 제일 의외였어요?" 선택 (1~6)';
comment on column public.diagnostic_results.reaction_note is
  '위 선택 뒤 자유 한 줄 (선택, 200자 상한)';
comment on column public.diagnostic_results.unknown_pick is
  '정밀: 모름으로 답한 것 중 "먼저 해보고 싶은 것" 선택 (subArea 이름)';
comment on column public.diagnostic_results.feedback_at is
  '마지막 반응 시각';

-- 넘긴 값만 갱신한다. 두 카드(의외 단계 / 모름 중 먼저 볼 것)가 따로 보내도
-- 서로 덮어쓰지 않도록 null이면 기존 값을 지킨다. 길이 상한은 API에서도 걸지만
-- 여기서도 자른다 — DB가 마지막 방어선이다.
create or replace function public.record_result_feedback(
  p_code           text,
  p_reaction_stage smallint default null,
  p_reaction_note  text     default null,
  p_unknown_pick   text     default null
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.diagnostic_results set
    reaction_stage = coalesce(p_reaction_stage, reaction_stage),
    reaction_note  = coalesce(nullif(left(p_reaction_note, 200), ''), reaction_note),
    unknown_pick   = coalesce(nullif(left(p_unknown_pick, 80), ''), unknown_pick),
    feedback_at    = now()
  where code = p_code;
$$;

grant execute on function public.record_result_feedback(text, smallint, text, text) to anon;
