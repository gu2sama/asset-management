import { useState, useMemo } from 'react';
import type { Asset, AssetClass } from '../../types';
import type { RebalanceTarget } from '../../types';
import type { RebalanceSummary } from '../../hooks/useRebalance';
import { ASSET_CLASS_LABELS, ASSET_CLASS_COLORS } from '../../constants/labels';
import { buildContribSuggestions, fmtYen, fmtPct } from './rebalanceUtils';

interface Props {
  summary: RebalanceSummary;
  targets: RebalanceTarget[];
  assets: Asset[];
  totalValue: number;
  monthlyContrib: number;
  rebalanceByBuyOnly: (amount: number) => Record<AssetClass, number>;
}

export function ContribAssistant({
  summary, targets, assets, totalValue, monthlyContrib, rebalanceByBuyOnly,
}: Props) {
  const [monthlyAmount, setMonthlyAmount] = useState(monthlyContrib);

  const buyOnly = useMemo(
    () => rebalanceByBuyOnly(monthlyAmount),
    [rebalanceByBuyOnly, monthlyAmount]
  );

  const suggestions = useMemo(
    () => buildContribSuggestions(buyOnly as Record<AssetClass, number>, assets),
    [buyOnly, assets]
  );

  const allocationCheck = useMemo(() => {
    // 今月の積立後の予想ポートフォリオ比率
    const newTotal = totalValue + monthlyAmount;
    return targets.map((t) => {
      const currentVal = summary.items.find((i) => i.assetClass === t.assetClass)?.currentValue ?? 0;
      const addAmount  = buyOnly[t.assetClass as AssetClass] ?? 0;
      const newVal     = currentVal + addAmount;
      const newRatio   = newTotal > 0 ? newVal / newTotal : 0;
      const deviation  = newRatio - t.targetRatio;
      return { ...t, newVal, newRatio, deviation, addAmount, currentVal };
    });
  }, [summary, targets, totalValue, monthlyAmount, buyOnly]);

  if (targets.length === 0) {
    return (
      <div className="bg-surface-2 border border-border rounded-2xl p-6 text-center">
        <div className="text-4xl mb-3">📊</div>
        <div className="text-muted text-sm">目標配分が設定されていません。</div>
        <div className="text-muted text-xs mt-1">「目標配分」タブで配分を設定してください。</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 積立額入力 */}
      <div className="bg-surface-2 border border-border rounded-2xl p-4 space-y-3">
        <h3 className="text-text text-sm font-semibold">今月の積立額</h3>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">¥</span>
          <input
            type="number"
            step="5000"
            min="0"
            value={monthlyAmount}
            onChange={(e) => setMonthlyAmount(Number(e.target.value))}
            className="w-full bg-bg border border-border rounded-xl pl-7 pr-3 py-2.5 text-text text-sm font-mono focus:outline-none focus:border-gold/50"
          />
        </div>
        <div className="text-xs text-muted">
          ノーセル・リバランス：売却せず積立だけで目標配分に近づけます
        </div>
      </div>

      {/* 配分提案 */}
      <div className="bg-surface-2 border border-border rounded-2xl p-4 space-y-4">
        <h3 className="text-text text-sm font-semibold">最適積立配分の提案</h3>

        {suggestions.length === 0 ? (
          <div className="text-center py-4 text-muted text-sm">
            {monthlyAmount === 0
              ? '積立額を入力してください'
              : '現在すべてのクラスが目標に近い状態です。通常通りの積立を継続してください。'}
          </div>
        ) : (
          <div className="space-y-3">
            {suggestions.map((s, idx) => {
              const color = ASSET_CLASS_COLORS[s.assetClass];
              const ratio = monthlyAmount > 0 ? s.amount / monthlyAmount : 0;
              const classItem = summary.items.find((i) => i.assetClass === s.assetClass);
              const shortage  = classItem ? classItem.requiredAmount : 0;

              return (
                <div key={s.assetClass} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-text flex-shrink-0"
                        style={{ backgroundColor: color }}
                      >
                        {idx + 1}
                      </div>
                      <div>
                        <div className="text-text text-sm font-medium">
                          {ASSET_CLASS_LABELS[s.assetClass]}
                        </div>
                        {shortage > 0 && (
                          <div className="text-muted text-xs">
                            不足 {fmtYen(shortage)}（目標比率 {fmtPct(
                              targets.find((t) => t.assetClass === s.assetClass)?.targetRatio ?? 0
                            )}）
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-text font-mono font-semibold">{fmtYen(s.amount)}</div>
                      <div className="text-muted text-xs">{fmtPct(ratio)} 配分</div>
                    </div>
                  </div>

                  {/* 積立先銘柄 */}
                  {s.assets.length > 0 && (
                    <div className="ml-7 space-y-1">
                      {s.assets.slice(0, 3).map((a, ai) => {
                        // 複数銘柄の場合は時価按分
                        const classTotal = s.assets.reduce((acc, x) => acc + x.currentValue, 0);
                        const assetRatio = classTotal > 0 ? a.currentValue / classTotal : 1 / s.assets.length;
                        const assetAmount = s.amount * assetRatio;

                        return (
                          <div key={a.id} className="flex items-center justify-between bg-surface-2/70 rounded-xl px-3 py-2 text-xs">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-muted/60">{ai + 1}.</span>
                              <span className="text-text truncate">{a.name}</span>
                            </div>
                            <span className="text-info font-mono flex-shrink-0 ml-2">
                              {fmtYen(assetAmount)}
                            </span>
                          </div>
                        );
                      })}
                      {s.assets.length > 3 && (
                        <div className="text-muted/60 text-xs ml-1">
                          他 {s.assets.length - 3}銘柄…
                        </div>
                      )}
                    </div>
                  )}

                  {s.assets.length === 0 && (
                    <div className="ml-7 text-xs text-muted bg-surface-2/50 rounded-xl px-3 py-2">
                      ⚠ このクラスの保有銘柄なし。新規購入を検討してください。
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 積立後の予想ポートフォリオ */}
      <div className="bg-surface-2 border border-border rounded-2xl p-4 space-y-3">
        <h3 className="text-text text-sm font-semibold">積立後の予想配分</h3>
        <div className="space-y-2.5">
          {allocationCheck.map((item) => {
            const color    = ASSET_CLASS_COLORS[item.assetClass];
            const isClose  = Math.abs(item.deviation) < 0.02;
            const barW     = Math.min(item.newRatio * 100 * 5, 100); // 表示用スケール

            return (
              <div key={item.assetClass} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    <span className={isClose ? 'text-muted' : 'text-text'}>
                      {ASSET_CLASS_LABELS[item.assetClass]}
                    </span>
                    {item.addAmount > 0 && (
                      <span className="text-info">+{fmtYen(item.addAmount)}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-muted line-through text-xs opacity-60">
                      {fmtPct(summary.items.find((i) => i.assetClass === item.assetClass)?.currentRatio ?? 0)}
                    </span>
                    <span className={`font-semibold ${isClose ? 'text-text' : 'text-text'}`}>
                      {fmtPct(item.newRatio)}
                    </span>
                    <span className="text-muted text-xs">
                      (目標 {fmtPct(item.targetRatio)})
                    </span>
                  </div>
                </div>
                <div className="h-1.5 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${barW}%`, backgroundColor: isClose ? '#475569' : color, opacity: 0.8 }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div className="text-xs text-muted pt-2 border-t border-border">
          積立後の総資産（予想）: {fmtYen(totalValue + monthlyAmount)}
        </div>
      </div>

      <div className="bg-surface-2 border border-border rounded-xl p-3 text-xs text-muted leading-relaxed">
        ※ 積立配分は「目標配分に最も近づく組み合わせ」で計算しています。
        実際には最低購入単位・NISAの残枠なども考慮してください。
      </div>
    </div>
  );
}
