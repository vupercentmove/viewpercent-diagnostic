-- base 벤치마크 이중집계 수정 (2026-08-12 적용)
--
-- 문제: 심화 진단 완료자는 base 행과 심화 행을 각각 남기는데, RPC가 둘 다 세고
-- 있었다. `diagnostic_mode <> 'full'` 필터는 20260719113129에서 이미 들어갔지만
-- `deep_stage_id IS NULL`이 빠져 있었다.
--
-- 적용 시점 실측(표본 12→9행):
--   total 12 → 9 · deepRate 33% → 56% · Stage 5 분포 4 → 2 · Stage 2 분포 2 → 1
-- deepRate는 분모가 부풀려져 심화 전환율이 실제보다 낮게 나오고 있었다.
--
-- 함께 고친 것:
--   - `<> 'full'`은 diagnostic_mode가 NULL인 과거 행을 조용히 떨어뜨리므로
--     IS DISTINCT FROM으로 교체 (현재 NULL 행 0건이지만 방어)
--   - deepRate 분자만 scoped(=심화 행 포함), 분모는 base로 명시
--   - ctaRate 분모도 base로 통일 (getStats()에 ctaRate 구현이 없어 참조 스펙 부재)

CREATE OR REPLACE FUNCTION public.get_diagnostic_stats()
 RETURNS json
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  WITH scoped AS (
    -- 완료 + 정밀(full) 제외.
    SELECT * FROM diagnostic_results
    WHERE completed = true
      AND diagnostic_mode IS DISTINCT FROM 'full'
  ),
  base AS (
    -- 심화 완료자는 base 행과 심화 행을 각각 남긴다.
    -- 분포·평균은 base 행만 세야 이중집계가 안 된다.
    SELECT * FROM scoped WHERE deep_stage_id IS NULL
  )
  SELECT json_build_object(
    'total',    (SELECT COUNT(*) FROM base),
    'avgScore', COALESCE((SELECT ROUND(AVG(overall_score)) FROM base), 0),
    -- 심화 전환율 = 심화 행 수 / base 행 수 (분자만 scoped, 분모는 base)
    'deepRate', COALESCE(ROUND(100.0
                  * (SELECT COUNT(*) FROM scoped WHERE deep_stage_id IS NOT NULL)
                  / NULLIF((SELECT COUNT(*) FROM base), 0)), 0),
    'ctaRate',  COALESCE(ROUND(100.0
                  * (SELECT COUNT(*) FROM base WHERE cta_clicked = true)
                  / NULLIF((SELECT COUNT(*) FROM base), 0)), 0),
    'stageDistribution', (
      SELECT COALESCE(json_agg(d ORDER BY d.count DESC), '[]'::json)
      FROM (SELECT weakest_stage AS "stageId", COUNT(*) AS count
            FROM base GROUP BY weakest_stage) d
    ),
    'avgStageScores', (
      SELECT COALESCE(json_agg(s ORDER BY s."stageId"), '[]'::json)
      FROM (SELECT (score_entry->>'stageId')::int AS "stageId",
                   ROUND(AVG((score_entry->>'score')::numeric)) AS avg
            FROM base, jsonb_array_elements(stage_scores) AS score_entry
            GROUP BY 1) s
    )
  );
$function$;
