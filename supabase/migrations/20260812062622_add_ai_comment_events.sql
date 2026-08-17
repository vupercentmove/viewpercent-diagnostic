-- 소급 커밋 (2026-08-17). 2026-08-12 라이브 Supabase(vupercent)에 이미 적용돼
-- 있었고 레포에 파일이 없었다. schema_migrations에서 그대로 옮긴 것 — 재실행 아님.

-- AI 진단 코멘트 응답 1건당 1행. 폴백률 집계용(익명, 개인정보 없음).
-- 서버(/api/analyze)만 insert 하고, 읽기는 SECURITY DEFINER RPC로만 한다.
create table if not exists public.ai_comment_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  mode text not null,
  fallback boolean not null default false,
  reason text
);

alter table public.ai_comment_events enable row level security;

drop policy if exists "anon insert ai comment events" on public.ai_comment_events;
create policy "anon insert ai comment events"
  on public.ai_comment_events for insert
  to anon, authenticated
  with check (true);

create index if not exists ai_comment_events_created_at_idx
  on public.ai_comment_events (created_at desc);

-- 폴백률 집계. diagnostic_results의 get_diagnostic_stats()와 같은 패턴.
create or replace function public.get_ai_comment_stats()
returns json
language sql
stable
security definer
set search_path = public
as $function$
  select json_build_object(
    'total', COUNT(*),
    'fallbackCount', COALESCE(SUM(CASE WHEN fallback THEN 1 ELSE 0 END), 0),
    'fallbackRate', COALESCE(ROUND(100.0 * SUM(CASE WHEN fallback THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0)), 0),
    'byReason', (
      SELECT COALESCE(json_agg(r ORDER BY r.count DESC), '[]'::json)
      FROM (
        SELECT reason, COUNT(*) AS count
        FROM ai_comment_events
        WHERE reason IS NOT NULL
        GROUP BY reason
      ) r
    )
  )
  FROM ai_comment_events;
$function$;

grant execute on function public.get_ai_comment_stats() to anon, authenticated;
