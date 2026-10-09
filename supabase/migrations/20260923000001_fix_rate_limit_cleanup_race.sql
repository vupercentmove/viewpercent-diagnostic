-- Recreate the rate-limit RPC so cleanup cannot delete a bucket that was
-- selected as stale and then concurrently reset before DELETE acquires it.
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

  with expired as materialized (
    select bucket_key
    from public.api_rate_limits
    where window_started_at < observed_at - interval '1 day'
    order by window_started_at
    limit 100
  )
  delete from public.api_rate_limits as current
  using expired
  where current.bucket_key = expired.bucket_key
    and current.window_started_at < observed_at - interval '1 day';

  return coalesce(allowed, false);
exception when others then
  return false;
end;
$$;
