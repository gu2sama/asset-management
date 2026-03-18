import { useMemo } from 'react';
import type { Asset, AssetClass, AccountType } from '../types';

export interface AssetClassSummary {
  assetClass: AssetClass;
  value: number;
  ratio: number;
}

export interface AccountSummary {
  account: AccountType;
  value: number;
  ratio: number;
}

export interface CountrySummary {
  code: string;
  country: string;
  value: number;
  ratio: number;
}

export interface SectorSummary {
  sector: string;
  value: number;
  ratio: number;
}

export interface PortfolioMetrics {
  totalValue: number;
  totalGainLoss: number;
  totalGainLossRate: number;
  weightedCostRate: number;    // 加重平均信託報酬
  annualCostYen: number;
  annualDividendYen: number;
  monthlyDividendYen: number;
  byAssetClass: AssetClassSummary[];
  byAccount: AccountSummary[];
  byCountry: CountrySummary[];
  bySector: SectorSummary[];
}

export function usePortfolioSummary(assets: Asset[]): PortfolioMetrics {
  return useMemo(() => {
    const totalValue = assets.reduce((s, a) => s + a.currentValue, 0);
    const totalAcquisition = assets.reduce(
      (s, a) => s + (a.acquisitionPrice ?? a.currentValue),
      0
    );
    const totalGainLoss = totalValue - totalAcquisition;
    const totalGainLossRate =
      totalAcquisition > 0 ? totalGainLoss / totalAcquisition : 0;

    // ── アセットクラス別 ──────────────────────────
    const classMap = new Map<AssetClass, number>();
    for (const a of assets) {
      classMap.set(a.assetClass, (classMap.get(a.assetClass) ?? 0) + a.currentValue);
    }
    const byAssetClass: AssetClassSummary[] = Array.from(classMap.entries())
      .map(([assetClass, value]) => ({
        assetClass,
        value,
        ratio: totalValue > 0 ? value / totalValue : 0,
      }))
      .sort((a, b) => b.value - a.value);

    // ── 口座区分別 ────────────────────────────────
    const accountMap = new Map<AccountType, number>();
    for (const a of assets) {
      accountMap.set(a.account, (accountMap.get(a.account) ?? 0) + a.currentValue);
    }
    const byAccount: AccountSummary[] = Array.from(accountMap.entries())
      .map(([account, value]) => ({
        account,
        value,
        ratio: totalValue > 0 ? value / totalValue : 0,
      }))
      .sort((a, b) => b.value - a.value);

    // ── 国別（AI分析ベース） ───────────────────────
    const countryMap = new Map<string, { country: string; value: number }>();
    let analyzedValue = 0;

    for (const a of assets) {
      if (a.aiAnalysis?.estimatedCountries?.length) {
        analyzedValue += a.currentValue;
        for (const c of a.aiAnalysis.estimatedCountries) {
          const existing = countryMap.get(c.code);
          countryMap.set(c.code, {
            country: c.country,
            value: (existing?.value ?? 0) + a.currentValue * c.ratio,
          });
        }
      } else {
        // 分析未済みは通貨で判定
        const code = a.currency === 'JPY' ? 'JP' : 'US';
        const country = a.currency === 'JPY' ? '日本' : '海外';
        const existing = countryMap.get(code);
        countryMap.set(code, {
          country,
          value: (existing?.value ?? 0) + a.currentValue,
        });
      }
    }

    const byCountry: CountrySummary[] = Array.from(countryMap.entries())
      .map(([code, { country, value }]) => ({
        code,
        country,
        value,
        ratio: totalValue > 0 ? value / totalValue : 0,
      }))
      .sort((a, b) => b.value - a.value);

    // ── セクター別（AI分析ベース） ─────────────────
    const sectorMap = new Map<string, number>();
    for (const a of assets) {
      if (a.aiAnalysis?.estimatedSectors?.length) {
        for (const s of a.aiAnalysis.estimatedSectors) {
          sectorMap.set(s.sector, (sectorMap.get(s.sector) ?? 0) + a.currentValue * s.ratio);
        }
      }
    }
    const bySector: SectorSummary[] = Array.from(sectorMap.entries())
      .map(([sector, value]) => ({
        sector,
        value,
        ratio: totalValue > 0 ? value / totalValue : 0,
      }))
      .sort((a, b) => b.value - a.value);

    // ── コスト・配当 ──────────────────────────────
    let weightedCost = 0;
    let annualDividendYen = 0;

    for (const a of assets) {
      if (a.annualCostRate) weightedCost += a.annualCostRate * a.currentValue;
      if (a.dividendYield) annualDividendYen += a.dividendYield * a.currentValue;
    }

    const weightedCostRate = totalValue > 0 ? weightedCost / totalValue : 0;
    const annualCostYen = weightedCost;
    const monthlyDividendYen = annualDividendYen / 12;

    return {
      totalValue,
      totalGainLoss,
      totalGainLossRate,
      weightedCostRate,
      annualCostYen,
      annualDividendYen,
      monthlyDividendYen,
      byAssetClass,
      byAccount,
      byCountry,
      bySector,
    };
  }, [assets]);
}
