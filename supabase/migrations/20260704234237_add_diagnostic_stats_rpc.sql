-- 어드민 통계 RPC 최초 생성 (2026-07-04 적용분 역기록)
--
-- ⚠️ 이 파일은 사후 기록이다. 실제 적용은 2026-07-04에 Supabase에서 직접 이뤄졌고,
-- 저장소에는 남지 않아 있었다. `supabase_migrations.schema_migrations`의
-- statements를 그대로 복원해 넣는다 (version 20260704234237).

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
