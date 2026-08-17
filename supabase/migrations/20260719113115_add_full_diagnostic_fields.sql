-- 파일명 정정 (2026-08-17). 원래 파일명은 20260719083524였는데, 실제 라이브
-- Supabase(vupercent) `schema_migrations`에 기록된 버전은 20260719113115다
-- (약 2시간 56분 뒤). 이 파일의 원래 헤더가 지시한 대로 사람이 SQL Editor에
-- 직접 붙여넣어 실행한 것으로 보인다 — `supabase db push`로 적용했다면 이
-- 파일의 타임스탬프가 그대로 버전이 됐을 것이다. 내용은 무변경, 파일명만
-- 실제 적용 버전에 맞춰 `git mv` 했다 — CLI(`supabase migration list`)가
-- 이 마이그레이션을 "누락"으로 오인하던 것을 바로잡는다.

-- Task 8: 정밀 진단(풀 심화) 모드 — diagnostic_results 컬럼 추가
--
-- ⚠️ 이 파일은 초안이다. Claude Code는 이 SQL을 실행/적용하지 않았다
-- (하드 세이프티 규칙 — 어떤 마이그레이션도 라이브 Supabase에 적용 금지).
-- 운영 적용은 승인 후 `supabase db push` 또는 Supabase SQL Editor에서 사람이 직접 실행.

alter table diagnostic_results
  add column if not exists diagnostic_mode text not null default 'quick',
  add column if not exists vision_answer text,
  add column if not exists unknown_areas jsonb,
  add column if not exists icp_flag boolean;

-- NOTE (핸드오프, 코드 밖 — 운영 변경이라 별도 승인 필요):
-- 이 컬럼들이 배포된 뒤에는 base 벤치마크를 집계하는 모든 곳에서
-- `deep_stage_id IS NULL` 필터를 `deep_stage_id IS NULL AND diagnostic_mode <> 'full'`로
-- 갱신해야 정밀(full) 모드 레코드가 base 분포를 오염시키지 않는다.
--   1. Postgres RPC `get_diagnostic_stats()` — Supabase 프로젝트에 직접 생성되어
--      있고 이 레포에는 소스가 없다 (app/api/admin/stats/route.ts가 호출만 함).
--      운영자가 Supabase에서 현재 정의를 확인한 뒤 필터를 추가해야 한다.
--   2. 맥미니 벤치마크 집계 잡/스크립트 (이 레포 밖) — task-8-brief.md 핸드오프 항목.
-- 이 레포 안에서 코드로 고칠 수 있는 base 집계(lib/supabase-admin.ts의 getStats())는
-- 이미 Task 8 커밋에 반영되어 있다.
--
-- ⚠️ 배포 순서(중요): 이 마이그레이션을 운영 Supabase에 적용하고 PostgREST 스키마 캐시가
-- 갱신된 뒤에만 이 브랜치 코드를 배포할 것. 그 전에 코드가 먼저 배포되면
-- insertDiagnosticResult()가 존재하지 않는 컬럼 키를 전송해 quick·full 모든 저장이
-- PGRST204로 실패함.
