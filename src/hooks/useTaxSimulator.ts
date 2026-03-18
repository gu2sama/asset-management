import { useMemo } from 'react';
import type { Asset, AccountType, TaxableGain, TaxHarvestingSuggestion } from '../types';

// 課税口座（特定・一般）のみ損益通算対象
const TAXABLE_ACCOUNTS: AccountType[] = ['tokutei', 'ippan'];
// 株式等の申告分離課税率（所得税15% + 住民税5% + 復興特別所得税0.315%）
const TAX_RATE = 0.20315;

export interface TaxSimulatorResult {
  gains: TaxableGain[];           // 全資産の損益一覧
  taxableGains: TaxableGain[];    // 課税口座のみ
  totalGain: number;              // 課税口座の合計含み益
  totalLoss: number;              // 課税口座の合計含み損（正の値）
  netGainLoss: number;            // 相殺後の損益
  estimatedTax: number;           // 概算税額（ネット益がある場合）
  harvesting: TaxHarvestingSuggestion;
  nisaUnrealizedGain: number;     // NISA口座の含み益（非課税参考値）
}

export function useTaxSimulator(assets: Asset[]): TaxSimulatorResult {
  return useMemo(() => {
    // ── 全資産の損益計算 ───────────────────────────
    const gains: TaxableGain[] = assets
      .filter((a) => a.acquisitionPrice !== undefined)
      .map((a) => {
        const isTaxable = TAXABLE_ACCOUNTS.includes(a.account);
        const gainLoss = a.currentValue - (a.acquisitionPrice ?? a.currentValue);
        const estimatedTax = isTaxable && gainLoss > 0 ? gainLoss * TAX_RATE : 0;

        return {
          assetId: a.id,
          assetName: a.name,
          account: a.account,
          acquisitionPrice: a.acquisitionPrice ?? a.currentValue,
          currentValue: a.currentValue,
          gainLoss,
          estimatedTax,
          isTaxable,
        };
      });

    const taxableGains = gains.filter((g) => g.isTaxable);

    const totalGain = taxableGains
      .filter((g) => g.gainLoss > 0)
      .reduce((s, g) => s + g.gainLoss, 0);

    const totalLoss = Math.abs(
      taxableGains
        .filter((g) => g.gainLoss < 0)
        .reduce((s, g) => s + g.gainLoss, 0)
    );

    const netGainLoss = totalGain - totalLoss;
    const estimatedTax = netGainLoss > 0 ? netGainLoss * TAX_RATE : 0;

    // ── 損出し提案（Tax-Loss Harvesting） ──────────
    const lossAssets = taxableGains
      .filter((g) => g.gainLoss < 0)
      .sort((a, b) => a.gainLoss - b.gainLoss); // 損失が大きい順

    const gainAssets = taxableGains
      .filter((g) => g.gainLoss > 0)
      .sort((a, b) => b.gainLoss - a.gainLoss); // 利益が大きい順

    // 損出しにより相殺できる利益額
    const offsettableGain = Math.min(totalGain, totalLoss);
    const estimatedTaxSaving = offsettableGain * TAX_RATE;

    const harvesting: TaxHarvestingSuggestion = {
      lossAssets,
      gainAssets,
      netGainLoss,
      estimatedTaxSaving,
    };

    // NISA口座の含み益（参考値：実際は非課税）
    const nisaUnrealizedGain = gains
      .filter(
        (g) =>
          g.account === 'nisa_growth' || g.account === 'nisa_tsumitate'
      )
      .reduce((s, g) => s + g.gainLoss, 0);

    return {
      gains,
      taxableGains,
      totalGain,
      totalLoss,
      netGainLoss,
      estimatedTax,
      harvesting,
      nisaUnrealizedGain,
    };
  }, [assets]);
}
