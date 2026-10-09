-- Atomic cross-instance API rate limits for Vercel/serverless route handlers.
create table if not exists public.api_rate_limits (
  bucket_key text primary key,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0)
);

alter table public.api_rate_limits enable row level security;
revoke all on public.api_rate_limits from anon, authenticated;

create or replace function public.check_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  allowed boolean;
  observed_at timestamptz := clock_timestamp();
begin
  if p_key !~ '^[0-9a-f]{64}$'
     or p_limit < 1 or p_limit > 1000
     or p_window_seconds < 1 or p_window_seconds > 86400 then
    return false;
  end if;

  insert into public.api_rate_limits as limits (
    bucket_key,
    window_started_at,
    request_count
  ) values (
    p_key,
    observed_at,
    1
  )
  on conflict (bucket_key) do update set
    request_count = case
      when limits.window_started_at <= observed_at - make_interval(secs => p_window_seconds)
        then 1
      else limits.request_count + 1
    end,
    window_started_at = case
      when limits.window_started_at <= observed_at - make_interval(secs => p_window_seconds)
        then observed_at
      else limits.window_started_at
    end
  returning request_count <= p_limit into allowed;

  -- Each call removes at most one small batch that is older than the maximum
  -- accepted window. This bounds table growth without an unbounded request-time scan.
  delete from public.api_rate_limits
  where bucket_key in (
    select bucket_key
    from public.api_rate_limits
    where window_started_at < observed_at - interval '1 day'
    order by window_started_at
    limit 100
  );

  return coalesce(allowed, false);
exception when others then
  return false;
end;
$$;

revoke all on function public.check_rate_limit(text, integer, integer) from public;
revoke all on function public.check_rate_limit(text, integer, integer) from anon, authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;

comment on table public.api_rate_limits is
  'Hashed, non-reversible per-route client buckets for atomic serverless rate limiting.';
