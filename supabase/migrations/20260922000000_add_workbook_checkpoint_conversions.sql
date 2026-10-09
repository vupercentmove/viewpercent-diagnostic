-- Dedicated workbook checkpoint CTA conversions.
-- Kept separate from diagnostic_results so partial workbook exits never count as completed diagnoses.
create table if not exists public.workbook_checkpoint_conversions (
  event_id uuid primary key,
  created_at timestamptz not null default now(),
  stage_id smallint not null check (stage_id in (3, 5))
);

create index if not exists workbook_checkpoint_conversions_created_at_idx
  on public.workbook_checkpoint_conversions (created_at desc);

alter table public.workbook_checkpoint_conversions enable row level security;

drop policy if exists "anon insert workbook checkpoint conversions"
  on public.workbook_checkpoint_conversions;
revoke insert on table public.workbook_checkpoint_conversions from anon, authenticated;
grant insert on table public.workbook_checkpoint_conversions to service_role;

comment on table public.workbook_checkpoint_conversions is
  'Chapter 3/5 workbook CTA clicks only; intentionally separate from completed diagnostic results.';
