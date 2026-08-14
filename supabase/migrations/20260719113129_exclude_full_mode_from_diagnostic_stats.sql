-- 정밀(full) 모드를 base 벤치마크에서 제외 (2026-07-19 적용분 역기록)
--
-- ⚠️ 사후 기록. 실제 적용은 2026-07-19에 Supabase에서 직접 이뤄졌고 저장소에는
-- 남지 않았다. 그 결과 코드 주석·CLAUDE.md에는 "RPC에 필터가 없어 운영자가 수동
-- 패치해야 한다"는 서술이 3주 넘게 남아 실제와 어긋났다.
-- statements를 그대로 복원해 넣는다 (version 20260719113129).

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
