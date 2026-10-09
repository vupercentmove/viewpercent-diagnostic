-- Close legacy public write/execute grants. Server routes authenticate with
-- SUPABASE_SERVICE_ROLE_KEY after validating caller input.

alter table public.diagnostic_results
  add column if not exists quick_answers jsonb;

drop policy if exists "anon insert diagnostic results"
  on public.diagnostic_results;
revoke insert on table public.diagnostic_results from anon, authenticated;
grant insert on table public.diagnostic_results to service_role;

drop policy if exists "anon insert workbook checkpoint conversions"
  on public.workbook_checkpoint_conversions;
revoke insert on table public.workbook_checkpoint_conversions from anon, authenticated;
grant insert on table public.workbook_checkpoint_conversions to service_role;

revoke all on function public.check_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, integer, integer)
  to service_role;