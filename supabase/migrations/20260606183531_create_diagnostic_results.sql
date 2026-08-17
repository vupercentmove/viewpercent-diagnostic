-- 소급 커밋 (2026-08-17). 이 마이그레이션은 2026-06-06 라이브 Supabase(vupercent)에
-- 이미 적용돼 있었고 레포에 파일이 없었다. `supabase_migrations.schema_migrations`에서
-- 그대로 옮긴 것 — 재실행이 아니라 기록 보정이다.

-- viewpercent-diagnostic 진단 응답 익명 집계용 테이블 (사용자 명시 승인)
create table if not exists public.diagnostic_results (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  stage_scores jsonb not null,
  overall_score int not null,
  weakest_stage int not null,
  result_type text not null default 'none',
  has_gap boolean not null default false,
  deep_stage_id int,
  deep_answers jsonb,
  utm jsonb,
  completed boolean not null default true
);

create index if not exists diagnostic_results_created_at_idx
  on public.diagnostic_results (created_at desc);
create index if not exists diagnostic_results_weakest_stage_idx
  on public.diagnostic_results (weakest_stage);

alter table public.diagnostic_results enable row level security;

drop policy if exists "anon insert diagnostic results" on public.diagnostic_results;
create policy "anon insert diagnostic results"
  on public.diagnostic_results
  for insert
  to anon, authenticated
  with check (true);

comment on table public.diagnostic_results is
  '뷰퍼센트 셀프 진단 익명 응답 — 업계 벤치마크 집계용. 개인식별정보 없음.';
