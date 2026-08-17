-- 소급 커밋 (2026-08-17). 2026-08-12 17:10(KST) 라이브 Supabase(vupercent)에
-- 이미 적용돼 있었고 레포에 파일이 없었다. schema_migrations에서 그대로
-- 옮긴 것 — 재실행 아님.
--
-- 배경: base 집계에서 `deep_stage_id IS NULL` 필터가 빠져 있어 심화(deep)
-- 완료자가 base 행과 별개로 이중집계되고 있었다(자비스 대시보드 리드
-- 카운터가 14건으로 부풀려진 원인 — 실제는 9건). 이 마이그레이션이 그 필터를
-- 추가한 최초 수정이다. 5일 뒤 별개 세션이 같은 문제를 모른 채 다시 고친 것이
-- 20260817000238(이미 이 레포에 커밋됨) — 결과는 동일, 중복 수정이었다.

CREATE OR REPLACE FUNCTION public.get_diagnostic_stats()
 RETURNS json
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  WITH scoped AS (
    -- 완료 + 정밀(full) 제외.
    -- `<> 'full'`은 diagnostic_mode가 NULL인 과거 행을 조용히 떨어뜨리므로
    -- IS DISTINCT FROM으로 바꾼다. (현재 NULL 행은 0이지만 방어)
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
