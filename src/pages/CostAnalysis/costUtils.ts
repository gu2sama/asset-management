import type { Asset, AccountType } from '../../types';

// ─────────────────────────────────────────────────
// 定数
// ─────────────────────────────────────────────────
export const TAX_RATE = 0.20315;
export const LOW_COST_THRESHOLD  = 0.001;  // 0.1%
export const HIGH_COST_THRESHOLD = 0.005;  // 0.5%
export const ALERT_COST_RATE     = 0.003;  // 0.3%
export const ASSUMED_RETURN      = 0.05;   // 将来計算の想定リターン 5%

// NISA年間上限
export const NISA_ANNUAL: Record<string, number> = {
  nisa_growth:    2_400_000,
  nisa_tsumitate: 1_200_000,
};
const TAXABLE: AccountType[] = ['tokutei', 'ippan'];

// ─────────────────────────────────────────────────
// 銘柄コスト行
// ─────────────────────────────────────────────────
export interface CostRow {
  asset: Asset;
  annualCostYen: number;    // 年間コスト（円）
  costRate: number;         // 信託報酬率（小数）
  label: 'low' | 'mid' | 'high';
}

export function buildCostRows(assets: Asset[]): CostRow[] {
  return assets
    .filter((a) => a.annualCostRate !== undefined)
    .map((a) => {
      const costRate = a.annualCostRate!;
      const annualCostYen = a.currentValue * costRate;
      const label: CostRow['label'] =
        costRate <= LOW_COST_THRESHOLD ? 'low'
        : costRate <= HIGH_COST_THRESHOLD ? 'mid'
        : 'high';
      return { asset: a, annualCostYen, costRate, label };
    })
    .sort((a, b) => b.costRate - a.costRate);
}

// ─────────────────────────────────────────────────
// ダッシュボード集計
// ─────────────────────────────────────────────────
export interface CostSummary {
  totalValue: number;
  annualCostYen: number;
  effectiveCostRate: number;    // 加重平均信託報酬
  tenYearLoss: number;          // 10年累積コスト損失
  highCostAssets: CostRow[];    // 0.5%超
  alertRate: boolean;           // 実効0.3%超
}

/** 10年間のコスト機会損失（複利考慮）
 *  without_cost = V * (1+r)^10
 *  with_cost    = V * (1+r-c)^10
 *  loss = without - with
 */
export function calcTenYearLoss(value: number, costRate: number, returnRate = ASSUMED_RETURN): number {
  if (costRate <= 0 || value <= 0) return 0;
  const without = value * Math.pow(1 + returnRate, 10);
  const withCost = value * Math.pow(1 + returnRate - costRate, 10);
  return Math.max(without - withCost, 0);
}

export function buildCostSummary(assets: Asset[]): CostSummary {
  const totalValue = assets.reduce((s, a) => s + a.currentValue, 0);
  const rows = buildCostRows(assets);

  let weightedCost = 0;
  let annualCostYen = 0;

  for (const r of rows) {
    weightedCost  += r.costRate * r.asset.currentValue;
    annualCostYen += r.annualCostYen;
  }

  const effectiveCostRate = totalValue > 0 ? weightedCost / totalValue : 0;
  const tenYearLoss = calcTenYearLoss(totalValue, effectiveCostRate);

  return {
    totalValue,
    annualCostYen,
    effectiveCostRate,
    tenYearLoss,
    highCostAssets: rows.filter((r) => r.label === 'high'),
    alertRate: effectiveCostRate > ALERT_COST_RATE,
  };
}

// ─────────────────────────────────────────────────
// NISA残枠アラート
// ─────────────────────────────────────────────────
export interface NisaRemain {
  key: string;
  label: string;
  annual: number;
  currentBalance: number;
  remaining: number;
}

export function calcNisaRemain(assets: Asset[]): NisaRemain[] {
  const result: NisaRemain[] = [];
  for (const [key, annual] of Object.entries(NISA_ANNUAL)) {
    const currentBalance = assets
      .filter((a) => a.account === key)
      .reduce((s, a) => s + a.currentValue, 0);
    const remaining = Math.max(annual - currentBalance, 0);
    result.push({
      key,
      label: key === 'nisa_growth' ? 'NISA（成長投資枠）' : 'NISA（つみたて投資枠）',
      annual,
      currentBalance,
      remaining,
    });
  }
  return result;
}

// ─────────────────────────────────────────────────
// 乗り換えシミュレーション
// ─────────────────────────────────────────────────
export interface SwitchResult {
  annualSaving: number;           // 年間削減額
  tenYearSavingRaw: number;       // 10年削減（単純計算）
  tenYearSavingCompound: number;  // 10年削減（複利）
  switchCost: number;             // 乗り換えコスト合計
  taxCost: number;                // 譲渡税
  redemptionFee: number;          // 信託財産留保額
  breakevenYears: number | null;  // 損益分岐点（年）
  keepValue10: number;            // 10年後評価額（現状維持）
  switchValue10: number;          // 10年後評価額（乗り換え後）
  netGain10: number;              // 10年後の差額
}

export function calcSwitch(
  fromAsset: Asset,
  fromRate: number,   // 現在の信託報酬（小数）
  toRate: number,     // 新しい信託報酬（小数）
  redemptionFeeRate: number,  // 信託財産留保額率（通常0〜0.001）
): SwitchResult {
  const value = fromAsset.currentValue;
  const acq   = fromAsset.acquisitionPrice ?? value;
  const isTaxable = TAXABLE.includes(fromAsset.account);

  // 売却益にかかる税
  const gain    = Math.max(value - acq, 0);
  const taxCost = isTaxable ? gain * TAX_RATE : 0;

  // 信託財産留保額
  const redemptionFee = value * redemptionFeeRate;

  const switchCost = taxCost + redemptionFee;
  const netValue   = value - switchCost;  // 乗り換え後の投資元本

  const annualSaving = value * (fromRate - toRate);

  // 単純10年削減
  const tenYearSavingRaw = annualSaving * 10;

  // 複利考慮: 現在 vs 乗り換え後で10年後を比較
  const keepValue10   = value   * Math.pow(1 + ASSUMED_RETURN - fromRate, 10);
  const switchValue10 = netValue * Math.pow(1 + ASSUMED_RETURN - toRate,   10);
  const tenYearSavingCompound = switchValue10 - keepValue10;

  // 損益分岐点
  const breakevenYears = annualSaving > 0 ? switchCost / annualSaving : null;

  return {
    annualSaving,
    tenYearSavingRaw,
    tenYearSavingCompound,
    switchCost,
    taxCost,
    redemptionFee,
    breakevenYears,
    keepValue10,
    switchValue10,
    netGain10: switchValue10 - keepValue10,
  };
}
