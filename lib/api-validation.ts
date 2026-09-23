export type StageScore = { stageId: number; score: number };

export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  const allowedSet = new Set(allowed);
  return Object.keys(value).every((key) => allowedSet.has(key));
}

export function isFiniteScore(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;
}

export function parseStageScores(value: unknown): StageScore[] | null {
  if (!Array.isArray(value) || value.length !== 6) return null;
  const scores: StageScore[] = [];
  const ids = new Set<number>();
  for (const item of value) {
    if (!isPlainRecord(item) || !hasOnlyKeys(item, ["stageId", "score"])) return null;
    const { stageId, score } = item;
    if (typeof stageId !== "number" || !Number.isInteger(stageId) || stageId < 1 || stageId > 6) return null;
    if (!isFiniteScore(score) || ids.has(stageId)) return null;
    ids.add(stageId);
    scores.push({ stageId, score });
  }
  return ids.size === 6 ? scores : null;
}

export function weakestStageIsConsistent(scores: StageScore[], weakestStage: unknown): weakestStage is number {
  if (typeof weakestStage !== "number" || !Number.isInteger(weakestStage)) return false;
  const chosen = scores.find((stage) => stage.stageId === weakestStage);
  if (!chosen) return false;
  const minimum = Math.min(...scores.map((stage) => stage.score));
  return chosen.score === minimum;
}
