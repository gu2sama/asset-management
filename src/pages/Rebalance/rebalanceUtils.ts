import type { AssetClass, RebalanceTarget, Asset } from '../../types';

// ─────────────────────────────────────────────────
// プリセット配分
// ─────────────────────────────────────────────────
export interface AllocationPreset {
  id: string;
  label: string;
  description: string;
  targets: Array<{ assetClass: AssetClass; ratio: number; tolerance: number }>;
}

export const ALLOCATION_PRESETS: AllocationPreset[] = [
  {
    id: 'aggressive',
    label: '長期積立型',
    description: '成長重視。先進国株中心の攻めた配分',
    targets: [
      { assetClass: 'foreign_etf',      ratio: 0.50, tolerance: 0.05 },
      { assetClass: 'investment_trust',  ratio: 0.30, tolerance: 0.05 },
      { assetClass: 'domestic_etf',      ratio: 0.10, tolerance: 0.05 },
      { assetClass: 'cash',              ratio: 0.10, tolerance: 0.03 },
    ],
  },
  {
    id: 'balanced',
    label: 'バランス型',
    description: '成長と安定のバランス。不動産も組み入れ',
    targets: [
      { assetClass: 'foreign_etf',      ratio: 0.35, tolerance: 0.05 },
      { assetClass: 'investment_trust',  ratio: 0.20, tolerance: 0.05 },
      { assetClass: 'domestic_etf',      ratio: 0.15, tolerance: 0.05 },
      { assetClass: 'real_estate',       ratio: 0.15, tolerance: 0.05 },
      { assetClass: 'cash',              ratio: 0.15, tolerance: 0.03 },
    ],
  },
  {
    id: 'conservative',
    label: '安定型',
    description: '安定重視。現金・不動産を厚めに配分',
    targets: [
      { assetClass: 'investment_trust',  ratio: 0.20, tolerance: 0.05 },
      { assetClass: 'domestic_etf',      ratio: 0.15, tolerance: 0.05 },
      { assetClass: 'foreign_etf',       ratio: 0.15, tolerance: 0.05 },
      { assetClass: 'real_estate',       ratio: 0.20, tolerance: 0.05 },
      { assetClass: 'cash',              ratio: 0.30, tolerance: 0.05 },
    ],
  },
];

export function presetToTargets(preset: AllocationPreset): RebalanceTarget[] {
  return preset.targets.map((t) => ({
    assetClass: t.assetClass,
    targetRatio: t.ratio,
    minRatio: Math.max(0, t.ratio - t.tolerance),
    maxRatio: t.ratio + t.tolerance,
  }));
}

// ─────────────────────────────────────────────────
// 売買指示（銘柄レベル）
// ─────────────────────────────────────────────────
export const TAX_RATE = 0.20315;

export interface AssetAction {
  asset: Asset;
  amount: number;      // 正 = 買い / 負 = 売り
  capitalGain: number; // 含み益（売り時のみ）
  taxAmount: number;   // 課税額（課税口座の含み益のある売り）
  netAmount: number;   // 実質手取り（売り）または購入額（買い）
}

const TAXABLE_ACCOUNTS = ['tokutei', 'ippan'];

/** アセットクラスに属する銘柄リスト（評価額順） */
export function getAssetsInClass(assets: Asset[], assetClass: AssetClass): Asset[] {
  return assets
    .filter((a) => a.assetClass === assetClass)
    .sort((a, b) => b.currentValue - a.currentValue);
}

/** 売却指示：アセット全体を評価額按分で売却 */
export function buildSellActions(
  assets: Asset[],
  assetClass: AssetClass,
  totalSellAmount: number,
  afterTaxMode: boolean,
): AssetAction[] {
  const classAssets = getAssetsInClass(assets, assetClass);
  if (classAssets.length === 0 || totalSellAmount <= 0) return [];

  const classTotal = classAssets.reduce((s, a) => s + a.currentValue, 0);

  return classAssets
    .filter((a) => a.currentValue > 0)
    .map((a) => {
      const ratio       = classTotal > 0 ? a.currentValue / classTotal : 0;
      let sellAmount    = totalSellAmount * ratio;

      const acqPrice    = a.acquisitionPrice ?? a.currentValue;
      const gainPerUnit = Math.max((a.currentValue - acqPrice) / a.currentValue, 0);
      const isTaxable   = TAXABLE_ACCOUNTS.includes(a.account);
      const capitalGain = isTaxable ? sellAmount * gainPerUnit : 0;
      const taxAmount   = capitalGain * TAX_RATE;

      // 実質手取りモード: 税引後に目標手取り額を確保するよう売却額を逆算
      if (afterTaxMode && isTaxable && gainPerUnit > 0) {
        const effectiveSellRate = 1 - gainPerUnit * TAX_RATE;
        sellAmount = effectiveSellRate > 0 ? sellAmount / effectiveSellRate : sellAmount;
      }

      const netAmount = sellAmount - taxAmount;

      return {
        asset: a,
        amount: -sellAmount,
        capitalGain,
        taxAmount,
        netAmount,
      };
    })
    .filter((a) => Math.abs(a.amount) >= 1000); // 1000円未満は除外
}

/** 買付指示：不足額を評価額按分 or 均等配分 */
export function buildBuyActions(
  assets: Asset[],
  assetClass: AssetClass,
  totalBuyAmount: number,
): AssetAction[] {
  const classAssets = getAssetsInClass(assets, assetClass);
  if (totalBuyAmount <= 0) return [];

  // 該当クラスの銘柄があれば按分、なければ「このクラスの銘柄が未登録」を通知
  if (classAssets.length === 0) return [];

  const classTotal = classAssets.reduce((s, a) => s + a.currentValue, 0);

  return classAssets.map((a) => {
    const ratio     = classTotal > 0 ? a.currentValue / classTotal : 1 / classAssets.length;
    const buyAmount = totalBuyAmount * ratio;
    return {
      asset: a,
      amount: buyAmount,
      capitalGain: 0,
      taxAmount: 0,
      netAmount: buyAmount,
    };
  }).filter((a) => a.amount >= 1000);
}

// ─────────────────────────────────────────────────
// 積立アシスタント（ノーセルリバランス）
// ─────────────────────────────────────────────────
export interface ContribSuggestion {
  assetClass: AssetClass;
  amount: number;
  reason: string; // 'shortage' | 'maintain'
  assets: Asset[]; // このクラスの保有銘柄
}

export function buildContribSuggestions(
  buyOnly: Record<AssetClass, number>,
  assets: Asset[],
): ContribSuggestion[] {
  return Object.entries(buyOnly)
    .filter(([, amount]) => amount >= 100)
    .sort(([, a], [, b]) => b - a)
    .map(([cls, amount]) => {
      const assetClass = cls as AssetClass;
      return {
        assetClass,
        amount,
        reason: 'shortage',
        assets: getAssetsInClass(assets, assetClass),
      };
    });
}

// ─────────────────────────────────────────────────
// フォーマット
// ─────────────────────────────────────────────────
export function fmtYen(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e8) return `${(n / 1e8).toFixed(2)}億円`;
  if (abs >= 10000) return `¥${Math.round(n / 10000).toLocaleString()}万円`;
  return `¥${Math.round(n).toLocaleString()}`;
}

export function fmtPct(r: number): string {
  return `${(r * 100).toFixed(1)}%`;
}
