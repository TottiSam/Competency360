export type GapCategory = 'CRITICAL' | 'MODERATE' | 'MINOR';
// Round away floating-point noise (e.g. 3*0.3 + 4*0.7 = 3.6999999999999997) so category boundaries are exact.
const clean = (n: number) => Math.round(n * 1e9) / 1e9;
export function adjustedScore(score: number, negativelyWorded: boolean) { return negativelyWorded ? 6 - score : score; }
export function calculateResult(requiredLevel: number, selfAverage: number, supervisorScore: number) {
  const actualLevel = clean((selfAverage * 3 + supervisorScore * 7) / 10); // 30% self + 70% supervisor
  const gap = Math.max(0, clean(requiredLevel - actualLevel));
  const category: GapCategory = gap >= 2 ? 'CRITICAL' : gap >= 1 ? 'MODERATE' : 'MINOR';
  return { actualLevel, gap, category };
}
