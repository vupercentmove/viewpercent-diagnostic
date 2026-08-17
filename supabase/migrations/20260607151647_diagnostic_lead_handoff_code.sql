-- 소급 커밋 (2026-08-17). 2026-06-07 라이브 Supabase(vupercent)에 이미 적용돼
-- 있었고 레포에 파일이 없었다. schema_migrations에서 그대로 옮긴 것 — 재실행 아님.

-- 진단 코드 핸드오프: 컬럼 추가 (non-breaking)
alter table public.diagnostic_results
  add column if not exists code text,
  add column if not exists cta_clicked boolean not null default false,
  add column if not exists claimed_at timestamptz;

create unique index if not exists diagnostic_results_code_key
  on public.diagnostic_results (code) where code is not null;

-- magic-link 조회: 정확한 코드 알아야만 1건 반환 (security definer, RLS 우회하되 코드로만)
create or replace function public.lookup_diagnostic(p_code text)
returns setof public.diagnostic_results
language sql
security definer
set search_path = public
as $$
  select * from public.diagnostic_results where code = p_code limit 1;
$$;

-- CTA 클릭 기록
create or replace function public.mark_cta_clicked(p_code text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.diagnostic_results set cta_clicked = true where code = p_code;
$$;

-- 상담 처리(클레임) 표시 — 잭/은비가 응대 시작 시
create or replace function public.claim_diagnostic(p_code text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.diagnostic_results set claimed_at = now() where code = p_code and claimed_at is null;
$$;

grant execute on function public.lookup_diagnostic(text) to anon;
grant execute on function public.mark_cta_clicked(text) to anon;
grant execute on function public.claim_diagnostic(text) to anon;
