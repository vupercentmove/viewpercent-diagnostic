-- 소급 커밋 (2026-08-17). 2026-07-04 라이브 Supabase(vupercent)에 이미 적용돼
-- 있었고 레포에 파일이 없었다. schema_migrations에서 그대로 옮긴 것 — 재실행 아님.
-- get_diagnostic_stats()의 최초 버전. 이후 20260719113129·20260812081047·
-- 20260817000238이 순서대로 재정의했다(모두 이 커밋에서 함께 소급 반영).

CREATE OR REPLACE FUNCTION get_diagnostic_stats()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
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
        WHERE completed = true
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
        WHERE completed = true
        GROUP BY 1
      ) s
    )
  )
  FROM diagnostic_results
  WHERE completed = true;
$$;

GRANT EXECUTE ON FUNCTION get_diagnostic_stats() TO anon;
