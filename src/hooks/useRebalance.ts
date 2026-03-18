import { useMemo, useCallback } from 'react';
import type { Asset, AssetClass, RebalanceTarget } from '../types';

export interface RebalanceItem {
  assetClass: AssetClass;
  currentValue: number;
  currentRatio: number;
  targetRatio: number;
  minRatio: number;
  maxRatio: number;
  deviation: number;         // 現在比率 - 目標比率
  requiredAmount: number;    // 正 = 買い増し / 負 = 売却
  isOutOfRange: boolean;     // 許容範囲外かどうか
}

export interface RebalanceSummary {
  items: RebalanceItem[];
  totalBuyAmount: number;
  totalSellAmount: number;
  needsRebalance: boolean;
}

export function useRebalance(assets: Asset[], targets: RebalanceTarget[]) {
  const totalValue = useMemo(
    () => assets.reduce((s, a) => s + a.currentValue, 0),
    [assets]
  );

  // アセットクラス別の現在評価額
  const currentByClass = useMemo(() => {
    const map = new Map<AssetClass, number>();
    for (const a of assets) {
      map.set(a.assetClass, (map.get(a.assetClass) ?? 0) + a.currentValue);
    }
    return map;
  }, [assets]);

  const summary = useMemo((): RebalanceSummary => {
    const items: RebalanceItem[] = targets.map((t) => {
      const currentValue = currentByClass.get(t.assetClass) ?? 0;
      const currentRatio = totalValue > 0 ? currentValue / totalValue : 0;
      const deviation = currentRatio - t.targetRatio;
      const targetValue = totalValue * t.targetRatio;
      const requiredAmount = targetValue - currentValue;
      const isOutOfRange = currentRatio < t.minRatio || currentRatio > t.maxRatio;

      return {
        assetClass: t.assetClass,
        currentValue,
        currentRatio,
        targetRatio: t.targetRatio,
        minRatio: t.minRatio,
        maxRatio: t.maxRatio,
        deviation,
        requiredAmount,
        isOutOfRange,
      };
    });

    const totalBuyAmount = items
      .filter((i) => i.requiredAmount > 0)
      .reduce((s, i) => s + i.requiredAmount, 0);

    const totalSellAmount = items
      .filter((i) => i.requiredAmount < 0)
      .reduce((s, i) => s + Math.abs(i.requiredAmount), 0);

    const needsRebalance = items.some((i) => i.isOutOfRange);

    return { items, totalBuyAmount, totalSellAmount, needsRebalance };
  }, [targets, currentByClass, totalValue]);

  /**
   * 追加投資のみでリバランスする場合の配分提案
   * （売却せず、買い増しだけで目標に近づける）
   */
  const rebalanceByBuyOnly = useCallback(
    (additionalAmount: number): Record<AssetClass, number> => {
      const result: Record<string, number> = {};
      const totalWithAdditional = totalValue + additionalAmount;

      for (const t of targets) {
        const currentValue = currentByClass.get(t.assetClass) ?? 0;
        const targetValue = totalWithAdditional * t.targetRatio;
        const buy = Math.max(0, targetValue - currentValue);
        result[t.assetClass] = buy;
      }

      // 合計をadditionalAmountに正規化
      const rawTotal = Object.values(result).reduce((s, v) => s + v, 0);
      if (rawTotal > 0) {
        for (const key of Object.keys(result)) {
          result[key] = (result[key] / rawTotal) * additionalAmount;
        }
      }

      return result as Record<AssetClass, number>;
    },
    [targets, currentByClass, totalValue]
  );

  return {
    summary,
    totalValue,
    rebalanceByBuyOnly,
  };
}
