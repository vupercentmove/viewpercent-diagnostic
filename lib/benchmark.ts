/**
 * 업계 벤치마크 — "내 점수 vs 진단 브랜드 분포" 상대 비교
 *
 * 슈퍼샘플 전략의 핵심: 진단할수록 데이터가 쌓이고, 그 분포가 곧 업계 기준점이 된다.
 *
 * 현재는 표본이 충분히 쌓이기 전이라 **사전 기준치(seed baseline)** 로 계산한다.
 * (정직성 원칙 — isSeed=true 일 때 UI는 "초기 기준" 임을 반드시 표기한다.)
 * 맥미니 주간 집계(benchmark_report)가 실데이터로 baseline을 교체할 수 있도록
 * BASELINE 한 곳만 갈아끼우면 되게 설계.
 */

import { STAGES } from "./stage-meta";

interface Baseline {
  mean: number;
  std: number;
}

/** 사전 기준치 — 여성의류 이커머스 브랜드 운영 통념 기반 추정 분포 (0~100). */
const STAGE_BASELINE: Record<number, Baseline> = {
  1: { mean: 58, std: 19 }, // 욕구·검색·방문 (광고로 방문은 만듦 → 비교적 높음)
  2: { mean: 49, std: 20 }, // 체류 (첫인상·브랜드감 — 많이 약함)
  3: { mean: 52, std: 20 }, // 쇼핑의 시작 (상품 매력 전달)
  4: { mean: 55, std: 19 }, // 구매결정
  5: { mean: 60, std: 18 }, // 구매완료·기다림 (배송 기본기는 갖춘 편)
  6: { mean: 44, std: 21 }, // 배송·수령완료 (재구매·팬화 — 가장 약함)
};

const OVERALL_BASELINE: Baseline = { mean: 53, std: 14 };

/** 실데이터 표본 수. 실집계로 교체되기 전엔 null = seed 모드. */
const SAMPLE_SIZE: number | null = null;

/**
 * 표본수 단일 진실원천(read-only) 접근자.
 *
 * 컴포넌트는 절대 수치를 하드코딩하지 말고 이 함수로만 표본수를 읽는다.
 * 빌드/SSR 상수로 평가되어 클라이언트 fetch 없이 layout shift를 막는다.
 *
 * 환경변수 BENCHMARK_SAMPLE_SIZE가 유효한 양의 정수일 때만 우선 적용하고,
 * 그 외(미설정/0 이하/비정수/NaN)는 모듈 상수 SAMPLE_SIZE로 폴백한다.
 */
export function getSampleSize(): number | null {
  const raw = process.env.BENCHMARK_SAMPLE_SIZE;
  if (raw !== undefined) {
    const parsed = Number.parseInt(raw, 10);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return SAMPLE_SIZE;
}

/** 표준정규 누적분포함수 근사 (Abramowitz & Stegun 7.1.26). */
function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  let p =
    d *
    t *
    (0.3193815 +
      t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  if (z > 0) p = 1 - p;
  return p;
}

/** score가 분포에서 상위 몇 %인지 (높을수록 좋음). 반환: 1~99 정수. */
function topPercent(score: number, base: Baseline): number {
  const z = (score - base.mean) / base.std;
  const better = normalCdf(z); // 이 점수보다 낮은 브랜드 비율
  const top = Math.round((1 - better) * 100);
  return Math.min(99, Math.max(1, top));
}

export interface BenchmarkResult {
  /** 전체 점수가 진단 브랜드 중 상위 N% */
  overallTopPercent: number;
  /** 가장 약한 단계 id */
  weakestStageId: number;
  /** 그 단계에서 "나보다 앞선" 브랜드 비율 (개선 여지 강조용) */
  weakestStageBehindPercent: number;
  /** 가장 약한 단계 이름 */
  weakestStageName: string;
  /** seed(사전 기준) 모드 여부 — true면 UI에 "초기 기준" 표기 필수 */
  isSeed: boolean;
  /** 실집계 표본 수 (seed면 null) */
  sampleSize: number | null;
}

export function getBenchmark(
  overallScore: number,
  stageScores: { stageId: number; score: number }[]
): BenchmarkResult {
  const overallTopPercent = topPercent(overallScore, OVERALL_BASELINE);

  const weakest = stageScores.reduce((a, b) => (b.score < a.score ? b : a));
  const wBase = STAGE_BASELINE[weakest.stageId] ?? OVERALL_BASELINE;
  const wTop = topPercent(weakest.score, wBase);
  const weakestStageName =
    STAGES.find((s) => s.id === weakest.stageId)?.name ?? "";

  return {
    overallTopPercent,
    weakestStageId: weakest.stageId,
    weakestStageBehindPercent: Math.min(95, Math.max(5, 100 - wTop)),
    weakestStageName,
    isSeed: SAMPLE_SIZE === null,
    sampleSize: SAMPLE_SIZE,
  };
}
