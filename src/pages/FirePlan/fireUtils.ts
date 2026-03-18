import { projectValue } from '../FutureProjection/projectionUtils';

// ─────────────────────────────────────────────────
// 野村総研・資産階級
// ─────────────────────────────────────────────────
export interface WealthTier {
  key: string;
  label: string;
  min: number;
  max: number;
  color: string;
}

export const WEALTH_TIERS: WealthTier[] = [
  { key: 'mass',       label: 'マス層',         min: 0,            max: 30_000_000,  color: '#64748b' },
  { key: 'upper_mass', label: 'アッパーマス層', min: 30_000_000,   max: 50_000_000,  color: '#6366f1' },
  { key: 'semi_rich',  label: '準富裕層',        min: 50_000_000,   max: 100_000_000, color: '#0ea5e9' },
  { key: 'rich',       label: '富裕層',          min: 100_000_000,  max: 500_000_000, color: '#10b981' },
  { key: 'super_rich', label: '超富裕層',        min: 500_000_000,  max: Infinity,    color: '#f59e0b' },
];

export function getCurrentTier(asset: number): WealthTier {
  return WEALTH_TIERS.find((t) => asset >= t.min && asset < t.max) ?? WEALTH_TIERS[0];
}

export function getNextTier(current: WealthTier): WealthTier | null {
  const idx = WEALTH_TIERS.indexOf(current);
  return idx >= 0 && idx < WEALTH_TIERS.length - 1 ? WEALTH_TIERS[idx + 1] : null;
}

export function calcYearsToNextTier(
  asset: number,
  monthlyContrib: number,
  netRate: number,
  nextMin: number,
  maxYears = 60,
): number | null {
  if (asset >= nextMin) return 0;
  for (let y = 1; y <= maxYears; y++) {
    if (projectValue(asset, netRate, y, monthlyContrib) >= nextMin) return y;
  }
  return null;
}

// ─────────────────────────────────────────────────
// FIRE必要資産
// ─────────────────────────────────────────────────
export interface FireNeeds {
  fullFire: number;
  sideFire: number;
  fullFireMonthlyDrawdown: number;
  sideFireMonthlyDrawdown: number;
}

/** すべての受動的収入の合計（月額） */
export function totalPassiveIncome(
  pensionMonthly: number,
  idecoMonthly: number,
  rentalMonthly: number,
  sideIncomeMonthly: number,
): number {
  return pensionMonthly + idecoMonthly + rentalMonthly + sideIncomeMonthly;
}

export function calcFireNeeds(
  monthlyExpense: number,
  pensionMonthly: number,
  idecoMonthly: number,
  rentalMonthly: number,
  sideIncomeMonthly: number,
): FireNeeds {
  const passive = totalPassiveIncome(pensionMonthly, idecoMonthly, rentalMonthly, sideIncomeMonthly);
  const fullMonthly = Math.max(monthlyExpense - passive, 0);
  const sideMonthly = Math.max(monthlyExpense - passive - 150_000, 0);
  return {
    fullFire: fullMonthly * 12 * 25,
    sideFire: sideMonthly * 12 * 25,
    fullFireMonthlyDrawdown: fullMonthly,
    sideFireMonthlyDrawdown: sideMonthly,
  };
}

/** コーストFIRE：現資産が65歳までの自然成長でフルFIRE目標に届くか */
export function checkCoastFire(
  currentAsset: number,
  currentAge: number,
  neutralNetRate: number,
  fullFireTarget: number,
): boolean {
  if (currentAge >= 65) return currentAsset >= fullFireTarget;
  return projectValue(currentAsset, neutralNetRate, 65 - currentAge, 0) >= fullFireTarget;
}

/** FIRE達成年齢（積立継続前提） */
export function calcFireAchievementAge(
  currentAsset: number,
  currentAge: number,
  monthlyContrib: number,
  netRate: number,
  target: number,
  maxYears = 60,
): number | null {
  if (target <= 0 || currentAsset >= target) return currentAge;
  for (let y = 1; y <= maxYears; y++) {
    if (projectValue(currentAsset, netRate, y, monthlyContrib) >= target) return currentAge + y;
  }
  return null;
}

// ─────────────────────────────────────────────────
// 取り崩しシミュレーター
// ─────────────────────────────────────────────────
export interface WithdrawalPoint {
  age: number;
  patternA: number;  // 運用なし・定額
  patternB: number;  // 3%運用・定額（年金考慮）
  patternC: number;  // 4%ルール（残高×4%/年）
}

export function simulateWithdrawal(
  retireAge: number,
  retireAsset: number,
  monthlyExpense: number,
  pensionStartAge: number,
  pensionMonthly: number,
  idecoStartAge: number,
  idecoMonthly: number,
  rentalMonthly: number,
  sideIncomeMonthly: number,
  investReturnB = 0.03,
  investReturnC = 0.05,
): WithdrawalPoint[] {
  const points: WithdrawalPoint[] = [];
  let balA = retireAsset;
  let balB = retireAsset;
  let balC = retireAsset;

  for (let age = retireAge; age <= 100; age++) {
    points.push({
      age,
      patternA: Math.max(balA, 0),
      patternB: Math.max(balB, 0),
      patternC: Math.max(balC, 0),
    });

    // この年齢での年間収入
    const annualIncome = (
      (age >= pensionStartAge  ? pensionMonthly  : 0) +
      (age >= idecoStartAge    ? idecoMonthly    : 0) +
      rentalMonthly +
      sideIncomeMonthly
    ) * 12;

    const annualExpense = monthlyExpense * 12;
    const annualNeed = Math.max(annualExpense - annualIncome, 0);

    // Pattern A: 運用なし
    balA = Math.max(balA - annualNeed, 0);

    // Pattern B: 3%運用後に定額取り崩し（年金で取り崩し額を軽減）
    if (balB > 0) {
      balB = balB * (1 + investReturnB) - annualNeed;
      balB = Math.max(balB, 0);
    }

    // Pattern C: 4%ルール（残高×4%を毎年取り崩し、5%運用）
    if (balC > 0) {
      const withdraw4pct = balC * 0.04;
      balC = balC * (1 + investReturnC) - withdraw4pct;
      balC = Math.max(balC, 0);
    }
  }

  return points;
}

/** 資産枯渇年齢を求める（balが0になる最初の年齢） */
export function calcDepletionAge(points: WithdrawalPoint[], key: keyof Omit<WithdrawalPoint, 'age'>): number | null {
  for (const p of points) {
    if (p[key] <= 0) return p.age;
  }
  return null; // 100歳以降も持続
}

export function fmtAsset(n: number): string {
  if (n >= 1e8) return `${(n / 1e8).toFixed(2)}億円`;
  if (n >= 1e4) return `¥${Math.round(n / 10000).toLocaleString()}万円`;
  return `¥${Math.round(n).toLocaleString()}`;
}
