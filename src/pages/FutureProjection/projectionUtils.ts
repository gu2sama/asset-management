// ─────────────────────────────────────────────────
// 定数
// ─────────────────────────────────────────────────
export const PROJECTION_YEARS = [0, 1, 3, 5, 10, 20, 30] as const;

export interface Scenario {
  key:   'pessimistic' | 'neutral' | 'optimistic';
  label: string;
  color: string;
  defaultRate: number; // 小数 (0.05 = 5%)
}

export const SCENARIOS: Scenario[] = [
  { key: 'pessimistic', label: '悲観',  color: '#f97316', defaultRate: 0.02 },
  { key: 'neutral',     label: '中立',  color: '#6366f1', defaultRate: 0.05 },
  { key: 'optimistic',  label: '楽観',  color: '#10b981', defaultRate: 0.08 },
];

// ─────────────────────────────────────────────────
// 基本計算
// ─────────────────────────────────────────────────
/**
 * N年後の資産額（積立込み複利計算）
 * result = asset × (1+r)^N + monthly × 12 × ((1+r)^N - 1) / r
 */
export function projectValue(
  asset: number,
  yearlyRate: number,  // 実質リターン (コスト控除後)
  years: number,
  monthlyContrib: number = 0,
): number {
  if (years === 0) return asset;
  if (Math.abs(yearlyRate) < 1e-10) {
    // r≈0のとき
    return asset + monthlyContrib * 12 * years;
  }
  const r  = yearlyRate;
  const fn = Math.pow(1 + r, years);
  const principal = asset * fn;
  const contrib   = monthlyContrib * 12 * (fn - 1) / r;
  return principal + contrib;
}

// ─────────────────────────────────────────────────
// シナリオデータ
// ─────────────────────────────────────────────────
export interface ProjectionPoint {
  year: number;
  label: string;
  pessimistic: number;
  neutral: number;
  optimistic: number;
}

export function buildProjectionData(
  currentAsset: number,
  effectiveCostRate: number,
  rates: Record<string, number>,  // scenario.key → gross return rate
  monthlyContrib: number,
): ProjectionPoint[] {
  return PROJECTION_YEARS.map((y) => {
    const point: ProjectionPoint = {
      year: y,
      label: y === 0 ? '現在' : `${y}年後`,
      pessimistic: 0,
      neutral: 0,
      optimistic: 0,
    };
    for (const s of SCENARIOS) {
      const netRate = rates[s.key] - effectiveCostRate;
      point[s.key] = projectValue(currentAsset, netRate, y, monthlyContrib);
    }
    return point;
  });
}

// ─────────────────────────────────────────────────
// 積立シミュレーター内訳
// ─────────────────────────────────────────────────
export interface SavingsBreakdown {
  initialGrowth: number;     // 元本（現在資産）の運用益
  initialFinal: number;      // N年後の現在資産分
  contribTotal: number;      // 積立総額
  contribGrowth: number;     // 積立分の運用益
  total: number;
}

export function calcSavingsBreakdown(
  currentAsset: number,
  yearlyRate: number,
  years: number,
  monthlyContrib: number,
): SavingsBreakdown {
  const initialFinal = projectValue(currentAsset, yearlyRate, years, 0);
  const initialGrowth = initialFinal - currentAsset;
  const contribTotal = monthlyContrib * 12 * years;
  const totalValue   = projectValue(currentAsset, yearlyRate, years, monthlyContrib);
  const contribGrowth = totalValue - initialFinal - contribTotal;

  return {
    initialGrowth,
    initialFinal,
    contribTotal,
    contribGrowth,
    total: totalValue,
  };
}

// ─────────────────────────────────────────────────
// 目標逆算
// ─────────────────────────────────────────────────
export type FeasibilityResult =
  | { status: 'neutral_ok';   label: '中立シナリオで達成可能' }
  | { status: 'optimistic_only'; label: '楽観シナリオのみで達成可能' }
  | { status: 'impossible';   label: '現在のペースでは達成困難' };

/**
 * 目標達成に必要な年利率（二分法）
 * 収束しなければ null を返す
 */
export function calcRequiredReturn(
  currentAsset: number,
  monthlyContrib: number,
  years: number,
  targetAmount: number,
): number | null {
  if (years <= 0) return null;
  const simple = currentAsset + monthlyContrib * 12 * years;
  if (simple >= targetAmount) return 0; // リターン不要

  let lo = 0, hi = 1.0; // 0%〜100%で探索
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const val = projectValue(currentAsset, mid, years, monthlyContrib);
    if (val < targetAmount) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * 目標達成に必要な毎月積立額
 */
export function calcRequiredMonthly(
  currentAsset: number,
  yearlyRate: number,
  years: number,
  targetAmount: number,
): number {
  if (years <= 0) return Infinity;
  const initialFinal = projectValue(currentAsset, yearlyRate, years, 0);
  const remaining = targetAmount - initialFinal;
  if (remaining <= 0) return 0;
  if (Math.abs(yearlyRate) < 1e-10) return remaining / (12 * years);
  const fn = Math.pow(1 + yearlyRate, years);
  return remaining * yearlyRate / (12 * (fn - 1));
}

/**
 * 各シナリオで目標金額に到達する年齢
 */
export function calcArrivalAge(
  currentAsset: number,
  currentAge: number,
  monthlyContrib: number,
  rates: Record<string, number>,
  effectiveCostRate: number,
  targetAmount: number,
  maxYears = 50,
): Record<string, number | null> {
  const result: Record<string, number | null> = {};
  for (const s of SCENARIOS) {
    const netRate = rates[s.key] - effectiveCostRate;
    let found: number | null = null;
    for (let y = 1; y <= maxYears; y++) {
      if (projectValue(currentAsset, netRate, y, monthlyContrib) >= targetAmount) {
        found = currentAge + y;
        break;
      }
    }
    result[s.key] = found;
  }
  return result;
}

/**
 * 達成判定
 */
export function judgeFeability(
  currentAsset: number,
  monthlyContrib: number,
  effectiveCostRate: number,
  rates: Record<string, number>,
  years: number,
  targetAmount: number,
): FeasibilityResult {
  const neutralNet   = (rates['neutral']     ?? 0.05) - effectiveCostRate;
  const optimisticNet = (rates['optimistic'] ?? 0.08) - effectiveCostRate;

  if (projectValue(currentAsset, neutralNet, years, monthlyContrib) >= targetAmount) {
    return { status: 'neutral_ok', label: '中立シナリオで達成可能' };
  }
  if (projectValue(currentAsset, optimisticNet, years, monthlyContrib) >= targetAmount) {
    return { status: 'optimistic_only', label: '楽観シナリオのみで達成可能' };
  }
  return { status: 'impossible', label: '現在のペースでは達成困難' };
}
