import { useCallback } from 'react';
import type { Asset, Snapshot, SnapshotSummary } from '../types';
import { useLocalStorage } from './useLocalStorage';

const STORAGE_KEY = 'portfolio_snapshots';

function buildSummary(assets: Asset[]): SnapshotSummary {
  const totalValue = assets.reduce((s, a) => s + a.currentValue, 0);

  const byAssetClass: Record<string, number> = {};
  const byAccount: Record<string, number> = {};
  let weightedCostRate = 0;
  let annualDividendYen = 0;

  for (const asset of assets) {
    byAssetClass[asset.assetClass] =
      (byAssetClass[asset.assetClass] ?? 0) + asset.currentValue;
    byAccount[asset.account] =
      (byAccount[asset.account] ?? 0) + asset.currentValue;

    if (asset.annualCostRate) {
      weightedCostRate += asset.annualCostRate * asset.currentValue;
    }
    if (asset.dividendYield) {
      annualDividendYen += asset.dividendYield * asset.currentValue;
    }
  }

  // AI分析の国別情報を集計（分析済み銘柄のみ）
  const byCountry: Record<string, number> = {};
  for (const asset of assets) {
    if (asset.aiAnalysis?.estimatedCountries) {
      for (const c of asset.aiAnalysis.estimatedCountries) {
        byCountry[c.code] =
          (byCountry[c.code] ?? 0) + asset.currentValue * c.ratio;
      }
    }
  }

  const totalCostRate = totalValue > 0 ? weightedCostRate / totalValue : 0;
  const annualCostYen = weightedCostRate; // Σ(costRate × value)

  return {
    byAssetClass,
    byCountry,
    byAccount,
    totalCostRate,
    annualCostYen,
    annualDividendYen,
  };
}

export function useSnapshots() {
  const [snapshots, setSnapshots] = useLocalStorage<Snapshot[]>(
    STORAGE_KEY,
    []
  );

  /** 現在の資産一覧から今月のスナップショットを作成（上書き） */
  const takeSnapshot = useCallback(
    (assets: Asset[]): Snapshot => {
      const now = new Date();
      const snapshotId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const totalValue = assets.reduce((s, a) => s + a.currentValue, 0);

      const snapshot: Snapshot = {
        snapshotId,
        date: now.toISOString(),
        totalValue,
        assets,
        summary: buildSummary(assets),
      };

      setSnapshots((prev) => {
        const filtered = prev.filter((s) => s.snapshotId !== snapshotId);
        return [...filtered, snapshot].sort((a, b) =>
          a.snapshotId.localeCompare(b.snapshotId)
        );
      });

      return snapshot;
    },
    [setSnapshots]
  );

  const deleteSnapshot = useCallback(
    (snapshotId: string): void => {
      setSnapshots((prev) => prev.filter((s) => s.snapshotId !== snapshotId));
    },
    [setSnapshots]
  );

  const getLatestSnapshot = (): Snapshot | null =>
    snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;

  /** 前月比の変化額 */
  const monthlyDelta = (): number => {
    if (snapshots.length < 2) return 0;
    const latest = snapshots[snapshots.length - 1];
    const prev = snapshots[snapshots.length - 2];
    return latest.totalValue - prev.totalValue;
  };

  return {
    snapshots,
    takeSnapshot,
    deleteSnapshot,
    getLatestSnapshot,
    monthlyDelta,
  };
}
