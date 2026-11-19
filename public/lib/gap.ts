export type GapCategory = 'CRITICAL' | 'MODERATE' | 'MINOR';
export function adjustedScore(score: number, negativelyWorded: boolean) { return negativelyWorded ? 6 - score : score; }
export function calculateResult(requiredLevel: number, selfAverage: number, supervisorScore: number) {
  const actualLevel = selfAverage * 0.3 + supervisorScore * 0.7;
  const gap = Math.max(0, requiredLevel - actualLevel);
  const category: GapCategory = gap >= 2 ? 'CRITICAL' : gap >= 1 ? 'MODERATE' : 'MINOR';
  return { actualLevel, gap, category };
}
