-- Close every known database mutation surface to server-only credentials.
-- Read/capability RPC grants are intentionally unchanged.

drop policy if exists "anon insert ai comment events"
  on public.ai_comment_events;
drop policy if exists "anon insert diagnostic results"
  on public.diagnostic_results;
drop policy if exists "anon insert workbook checkpoint conversions"
  on public.workbook_checkpoint_conversions;

revoke insert, update, delete on table public.ai_comment_events
  from public, anon, authenticated;
revoke insert, update, delete on table public.api_rate_limits
  from public, anon, authenticated;
revoke insert, update, delete on table public.diagnostic_results
  from public, anon, authenticated;
revoke insert, update, delete on table public.workbook_checkpoint_conversions
  from public, anon, authenticated;

grant insert, update, delete on table public.ai_comment_events to service_role;
grant insert, update, delete on table public.api_rate_limits to service_role;
grant insert, update, delete on table public.diagnostic_results to service_role;
grant insert, update, delete on table public.workbook_checkpoint_conversions to service_role;

revoke all on function public.check_rate_limit(text, integer, integer)
  from public, anon, authenticated;
revoke all on function public.claim_diagnostic(text)
  from public, anon, authenticated;
revoke all on function public.mark_cta_clicked(text)
  from public, anon, authenticated;
revoke all on function public.record_result_feedback(text, smallint, text, text)
  from public, anon, authenticated;

grant execute on function public.check_rate_limit(text, integer, integer) to service_role;
grant execute on function public.claim_diagnostic(text) to service_role;
grant execute on function public.mark_cta_clicked(text) to service_role;
grant execute on function public.record_result_feedback(text, smallint, text, text) to service_role;
