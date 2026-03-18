import type { Asset, AccountType } from '../../types';

// ─────────────────────────────────────────────────
// 定数
// ─────────────────────────────────────────────────
export const TAX_RATE    = 0.20315;
export const INCOME_TAX  = 0.15315; // 所得税（復興税込み）
export const RESIDENT_TAX = 0.05;   // 住民税

export const TAXABLE_ACCOUNTS: AccountType[] = ['tokutei', 'ippan'];
export const NISA_ACCOUNTS: AccountType[] = ['nisa_growth', 'nisa_tsumitate'];

// NISA 成長投資枠の生涯上限
export const NISA_SEICHOU_LIFETIME = 12_000_000;  // 1200万円
// NISA つみたて投資枠の生涯上限
export const NISA_TSUMITATE_LIFETIME = 6_000_000; // 600万円

// ─────────────────────────────────────────────────
// NISA 残枠計算
// ─────────────────────────────────────────────────
export interface NisaRemain {
  seichouUsed: number;
  seichouRemain: number;
  tsumitateUsed: number;
  tsumitateRemain: number;
  totalRemain: number;
}

export function calcNisaRemain(assets: Asset[]): NisaRemain {
  const seichouUsed = assets
    .filter((a) => a.account === 'nisa_growth')
    .reduce((s, a) => s + (a.acquisitionPrice ?? a.currentValue), 0);
  const tsumitateUsed = assets
    .filter((a) => a.account === 'nisa_tsumitate')
    .reduce((s, a) => s + (a.acquisitionPrice ?? a.currentValue), 0);

  return {
    seichouUsed,
    seichouRemain: Math.max(NISA_SEICHOU_LIFETIME - seichouUsed, 0),
    tsumitateUsed,
    tsumitateRemain: Math.max(NISA_TSUMITATE_LIFETIME - tsumitateUsed, 0),
    totalRemain: Math.max(NISA_SEICHOU_LIFETIME - seichouUsed, 0)
                + Math.max(NISA_TSUMITATE_LIFETIME - tsumitateUsed, 0),
  };
}

// ─────────────────────────────────────────────────
// NISA 移行シミュレーション
// ─────────────────────────────────────────────────
export interface NisaMigrationResult {
  asset: Asset;
  currentValue: number;
  capitalGain: number;
  migrationCost: number;         // 売却時の税金
  annualDivSaving: number;       // 年間配当税節約
  annualCapGainSaving: number;   // 年間値上がり分の税節約（仮定5%成長）
  totalAnnualSaving: number;
  tenYearSaving: number;         // 10年間の節税効果（複利）
  breakEvenYears: number | null; // 損益分岐点（年）
  canMigrate: boolean;           // NISA枠に収まるか
  nisaRequired: number;          // NISA枠の必要額
}

const ASSUMED_PRICE_RETURN = 0.05; // 年5%価格上昇仮定

export function calcNisaMigration(asset: Asset, nisaRemain: NisaRemain): NisaMigrationResult {
  const acq          = asset.acquisitionPrice ?? asset.currentValue;
  const capitalGain  = Math.max(asset.currentValue - acq, 0);
  const migrationCost = TAXABLE_ACCOUNTS.includes(asset.account)
    ? capitalGain * TAX_RATE
    : 0;

  const divYield = asset.dividendYield ?? 0;
  const annualDivSaving       = asset.currentValue * divYield * TAX_RATE;
  const annualCapGainSaving   = asset.currentValue * ASSUMED_PRICE_RETURN * TAX_RATE;
  const totalAnnualSaving     = annualDivSaving + annualCapGainSaving;

  // 10年間の節税（成長を考慮：毎年の節約額が増える）
  let tenYearSaving = 0;
  let v = asset.currentValue;
  for (let y = 1; y <= 10; y++) {
    v *= (1 + ASSUMED_PRICE_RETURN);
    tenYearSaving += v * (ASSUMED_PRICE_RETURN + divYield) * TAX_RATE;
  }

  const breakEvenYears = totalAnnualSaving > 0
    ? migrationCost / totalAnnualSaving
    : null;

  const canMigrate = asset.currentValue <= nisaRemain.seichouRemain;

  return {
    asset,
    currentValue: asset.currentValue,
    capitalGain,
    migrationCost,
    annualDivSaving,
    annualCapGainSaving,
    totalAnnualSaving,
    tenYearSaving,
    breakEvenYears,
    canMigrate,
    nisaRequired: asset.currentValue,
  };
}

// ─────────────────────────────────────────────────
// 損出し節税効果の計算
// ─────────────────────────────────────────────────
export function calcHarvestSaving(
  lossAmount: number,    // 含み損（正の値で渡す）
  confirmedGain: number, // 今年の確定利益
): number {
  const offsettable = Math.min(lossAmount, confirmedGain);
  return offsettable * TAX_RATE;
}

// ─────────────────────────────────────────────────
// 損益通算後の税額計算
// ─────────────────────────────────────────────────
export interface TaxOffsetResult {
  confirmedGain: number;
  confirmedLoss: number;
  netConfirmed: number;
  additionalLoss: number;  // さらに損出しした場合の追加損失
  finalTaxable: number;
  finalTax: number;
  taxSaving: number;       // 追加損出しによる節税額
  carryoverLoss: number;   // 翌年繰越損失
}

export function calcTaxOffset(
  confirmedGain: number,
  confirmedLoss: number,
  additionalLoss = 0,
): TaxOffsetResult {
  const netConfirmed    = confirmedGain - confirmedLoss;
  const totalLoss       = confirmedLoss + additionalLoss;
  const finalTaxable    = Math.max(confirmedGain - totalLoss, 0);
  const carryoverLoss   = Math.max(totalLoss - confirmedGain, 0);
  const finalTax        = finalTaxable * TAX_RATE;
  const baseTax         = Math.max(netConfirmed, 0) * TAX_RATE;
  const taxSaving       = baseTax - finalTax;

  return {
    confirmedGain,
    confirmedLoss,
    netConfirmed,
    additionalLoss,
    finalTaxable,
    finalTax,
    taxSaving,
    carryoverLoss,
  };
}

// ─────────────────────────────────────────────────
// フォーマット
// ─────────────────────────────────────────────────
export function fmtYen(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e8) return `${sign}${(abs / 1e8).toFixed(2)}億円`;
  if (abs >= 10000) return `${sign}¥${Math.round(abs / 10000).toLocaleString()}万円`;
  return `${sign}¥${Math.round(abs).toLocaleString()}`;
}

export function fmtPct(r: number): string {
  const sign = r >= 0 ? '+' : '';
  return `${sign}${(r * 100).toFixed(2)}%`;
}

export function gainColor(n: number): string {
  if (n > 0) return 'text-emerald-400';
  if (n < 0) return 'text-red-400';
  return 'text-slate-400';
}
