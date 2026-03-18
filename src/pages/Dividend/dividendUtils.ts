import type { Asset, AccountType, DividendFrequency } from '../../types';

// ─────────────────────────────────────────────────
// 定数
// ─────────────────────────────────────────────────
export const TAX_RATE  = 0.20315;
export const AFTER_TAX = 1 - TAX_RATE; // 0.79685

export const NISA_ACCOUNTS: AccountType[] = ['nisa_growth', 'nisa_tsumitate', 'ideco'];

export const FREQ_LABELS: Record<DividendFrequency, string> = {
  monthly:    '毎月',
  quarterly:  '四半期',
  semiannual: '半年',
  annual:     '年1回',
};

// 頻度別・各月への配分（0〜11の配列を返す）
const QUARTERLY_MONTHS  = [2, 5, 8, 11];  // 3/6/9/12月
const SEMIANNUAL_MONTHS = [5, 11];         // 6/12月
const ANNUAL_MONTH      = 11;              // 12月

export function monthlyDistribution(annualAmount: number, frequency: DividendFrequency): number[] {
  const r = new Array<number>(12).fill(0);
  switch (frequency) {
    case 'monthly':
      return r.map(() => annualAmount / 12);
    case 'quarterly':
      QUARTERLY_MONTHS.forEach((m) => { r[m] = annualAmount / 4; });
      return r;
    case 'semiannual':
      SEMIANNUAL_MONTHS.forEach((m) => { r[m] = annualAmount / 2; });
      return r;
    case 'annual':
      r[ANNUAL_MONTH] = annualAmount;
      return r;
  }
}

// ─────────────────────────────────────────────────
// 月別配当カレンダー（資産リストから予測）
// ─────────────────────────────────────────────────
export function calcMonthlyCalendar(assets: Asset[]): number[] {
  const calendar = new Array<number>(12).fill(0);
  for (const a of assets) {
    if (!a.dividendYield || a.dividendYield <= 0) continue;
    const annual = a.dividendYield * a.currentValue;
    const freq   = a.dividendFrequency ?? 'quarterly';
    monthlyDistribution(annual, freq).forEach((v, i) => { calendar[i] += v; });
  }
  return calendar;
}

// ─────────────────────────────────────────────────
// NISA / 課税 別の内訳
// ─────────────────────────────────────────────────
export interface DividendBreakdown {
  nisaAnnual: number;
  taxableAnnual: number;
  taxableAfterTax: number;
  totalAnnual: number;
  totalAfterTax: number;
  portfolioYield: number;
  /** NISA保有額の年間配当割合 */
  nisaRatio: number;
  /** 実効税引後レート（NISA比を加味） */
  effectiveAfterTaxRate: number;
}

export function calcDividendBreakdown(assets: Asset[], totalValue: number): DividendBreakdown {
  let nisaAnnual    = 0;
  let taxableAnnual = 0;

  for (const a of assets) {
    if (!a.dividendYield || a.dividendYield <= 0) continue;
    const annual = a.dividendYield * a.currentValue;
    if (NISA_ACCOUNTS.includes(a.account)) {
      nisaAnnual += annual;
    } else {
      taxableAnnual += annual;
    }
  }

  const totalAnnual   = nisaAnnual + taxableAnnual;
  const taxableAfterTax  = taxableAnnual * AFTER_TAX;
  const totalAfterTax    = nisaAnnual + taxableAfterTax;
  const portfolioYield   = totalValue > 0 ? totalAnnual / totalValue : 0;
  const nisaRatio        = totalAnnual > 0 ? nisaAnnual / totalAnnual : 0;
  const effectiveAfterTaxRate = nisaRatio * 1.0 + (1 - nisaRatio) * AFTER_TAX;

  return {
    nisaAnnual, taxableAnnual, taxableAfterTax,
    totalAnnual, totalAfterTax, portfolioYield,
    nisaRatio, effectiveAfterTaxRate,
  };
}

// ─────────────────────────────────────────────────
// 配当再投資シミュレーション
// ─────────────────────────────────────────────────
export interface ReinvestPoint {
  year: number;
  withReinvest: number;   // 再投資あり：資産総額
  withoutReinvest: number; // 再投資なし：資産額
  cashDividends: number;   // 再投資なし：累積配当
  totalWithout: number;    // withoutReinvest + cashDividends
  annualDiv: number;        // 再投資あり時の年間配当
}

export function simulateReinvestment(
  currentAsset: number,
  monthlyContrib: number,
  portfolioYield: number,
  priceReturnRate = 0.03,
  years = 30,
): ReinvestPoint[] {
  const points: ReinvestPoint[] = [];
  let withReinvest    = currentAsset;
  let withoutReinvest = currentAsset;
  let cashDividends   = 0;

  for (let y = 0; y <= years; y++) {
    points.push({
      year: y,
      withReinvest,
      withoutReinvest,
      cashDividends,
      totalWithout: withoutReinvest + cashDividends,
      annualDiv: withReinvest * portfolioYield,
    });

    const annualContrib = monthlyContrib * 12;
    cashDividends   += withoutReinvest * portfolioYield;
    withoutReinvest  = withoutReinvest * (1 + priceReturnRate) + annualContrib;
    withReinvest     = withReinvest * (1 + priceReturnRate + portfolioYield) + annualContrib;
  }

  return points;
}

// ─────────────────────────────────────────────────
// 配当生活到達年数
// ─────────────────────────────────────────────────
export function calcYearsToDividendLife(
  currentAsset: number,
  monthlyContrib: number,
  avgYield: number,
  requiredAnnualDivAfterTax: number,
  effectiveAfterTaxRate: number,
  priceReturnRate = 0.03,
  maxYears = 60,
): number | null {
  if (avgYield <= 0 || requiredAnnualDivAfterTax <= 0) return null;
  if (currentAsset * avgYield * effectiveAfterTaxRate >= requiredAnnualDivAfterTax) return 0;

  let portfolio = currentAsset;
  for (let y = 1; y <= maxYears; y++) {
    portfolio = portfolio * (1 + priceReturnRate + avgYield) + monthlyContrib * 12;
    if (portfolio * avgYield * effectiveAfterTaxRate >= requiredAnnualDivAfterTax) return y;
  }
  return null;
}

// ─────────────────────────────────────────────────
// フォーマット
// ─────────────────────────────────────────────────
export function fmtYen(n: number): string {
  if (n >= 1e8) return `${(n / 1e8).toFixed(2)}億円`;
  if (n >= 1e4) return `¥${Math.round(n / 10000).toLocaleString()}万円`;
  return `¥${Math.round(n).toLocaleString()}`;
}

export function fmtMan(n: number): string {
  return `${Math.round(n / 10000).toLocaleString()}万`;
}
