-- 소급 커밋 (2026-08-17). 2026-07-19 라이브 Supabase(vupercent)에 이미 적용돼
-- 있었고 레포에 파일이 없었다. schema_migrations에서 그대로 옮긴 것 — 재실행 아님.
-- add_full_diagnostic_fields(20260719113115)로 diagnostic_mode 컬럼이 생긴 직후,
-- 정밀(full) 모드 행이 base 집계를 오염시키지 않도록 필터를 추가한 개정.

CREATE OR REPLACE FUNCTION public.get_diagnostic_stats()
 RETURNS json
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT json_build_object(
    'total', COUNT(*),
    'avgScore', COALESCE(ROUND(AVG(overall_score)), 0),
    'deepRate', COALESCE(ROUND(100.0 * SUM(CASE WHEN deep_stage_id IS NOT NULL THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0)), 0),
    'ctaRate', COALESCE(ROUND(100.0 * SUM(CASE WHEN cta_clicked = true THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0)), 0),
    'stageDistribution', (
      SELECT COALESCE(json_agg(d ORDER BY d.count DESC), '[]'::json)
      FROM (
        SELECT weakest_stage AS "stageId", COUNT(*) AS count
        FROM diagnostic_results
        WHERE completed = true AND diagnostic_mode <> 'full'
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
        WHERE completed = true AND diagnostic_mode <> 'full'
        GROUP BY 1
      ) s
    )
  )
  FROM diagnostic_results
  WHERE completed = true AND diagnostic_mode <> 'full';
$function$
