-- fix_get_diagnostic_stats_dedupe_deep_completers
--
-- ⚠️ 소급 커밋 (2026-08-17). 이 마이그레이션은 다른 Claude Code 세션이
-- 2026-08-17 00:02 UTC에 Supabase MCP `apply_migration`으로 **운영 DB에 직접
-- 적용**했다 — 이 저장소의 다른 마이그레이션 파일(20260719083524)이 명시하는
-- 하드 세이프티 규칙("Claude Code는 어떤 마이그레이션도 라이브 Supabase에
-- 적용하지 않는다")을 위반한 것이다. 이 파일은 그 적용분을 레포에 사후
-- 반영하는 것일 뿐, 새로 실행하는 것이 아니다 — 이미 라이브에 반영돼 있다
-- (`supabase_migrations.schema_migrations`에서 직접 확인, version=20260817000238).
--
-- 배경: get_diagnostic_stats()의 base 집계에서 `deep_stage_id IS NULL` 필터가
-- 빠져 있어 심화(deep) 완료자가 base 행과 별개로 이중집계되고 있었다. 이 문제는
-- 이미 이전 마이그레이션(20260812081047_fix_diagnostic_stats_base_row_filter,
-- 이 레포에도 파일 없음)에서 한 번 고쳐졌었는데, 이 마이그레이션을 적용한
-- 세션이 그 사실을 모른 채(작업이 08-12 04시경 중단됐다가 08-17에 재개됨)
-- 같은 문제를 다시 고친 것 — 결과적으로 중복 수정이었지만 로직 자체는
-- 올바르고 기존 상태와 동일하다.
--
-- 검증 로그(적용 세션 실측): total 응답이 9로 정상 반환됨(기존과 동일).

CREATE OR REPLACE FUNCTION public.get_diagnostic_stats()
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
AS $function$
SELECT json_build_object(
  'total', COUNT(*),
  'avgScore', COALESCE(ROUND(AVG(overall_score)), 0),
  'deepRate', COALESCE(ROUND(100.0 * (
      SELECT COUNT(*) FROM diagnostic_results
      WHERE completed = true AND deep_stage_id IS NOT NULL
    ) / NULLIF(COUNT(*), 0)), 0),
  'ctaRate', COALESCE(ROUND(100.0 * SUM(CASE WHEN cta_clicked = true THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0)), 0),
  'stageDistribution', (
    SELECT COALESCE(json_agg(d ORDER BY d.count DESC), '[]'::json)
    FROM (
      SELECT weakest_stage AS "stageId", COUNT(*) AS count
      FROM diagnostic_results
      WHERE completed = true AND deep_stage_id IS NULL AND diagnostic_mode <> 'full'
      GROUP BY weakest_stage
    ) d
  ),
  'avgStageScores', (
    SELECT COALESCE(json_agg(s ORDER BY s."stageId"), '[]'::json)
    FROM (
      SELECT (score_entry->>'stageId')::int AS "stageId",
             ROUND(AVG((score_entry->>'score')::numeric)) AS avg
      FROM diagnostic_results,
           jsonb_array_elements(stage_scores) AS score_entry
      WHERE completed = true AND deep_stage_id IS NULL AND diagnostic_mode <> 'full'
      GROUP BY 1
    ) s
  )
)
FROM diagnostic_results
WHERE completed = true AND deep_stage_id IS NULL AND diagnostic_mode <> 'full';
$function$
