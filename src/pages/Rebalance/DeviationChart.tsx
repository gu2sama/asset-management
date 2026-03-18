import type { RebalanceItem } from '../../hooks/useRebalance';
import { ASSET_CLASS_LABELS, ASSET_CLASS_COLORS } from '../../constants/labels';
import { fmtYen, fmtPct } from './rebalanceUtils';

interface Props {
  items: RebalanceItem[];
  totalValue: number;
  needsRebalance: boolean;
}

export function DeviationChart({ items, totalValue, needsRebalance }: Props) {
  if (items.length === 0) {
    return (
      <div className="bg-surface-2 border border-border rounded-2xl p-6 text-center">
        <div className="text-4xl mb-3">⚖️</div>
        <div className="text-muted text-sm">目標配分が設定されていません。</div>
        <div className="text-muted text-xs mt-1">「目標配分」タブで配分を設定してください。</div>
      </div>
    );
  }

  const outOfRangeCount = items.filter((i) => i.isOutOfRange).length;

  return (
    <div className="space-y-4">
      {/* ステータスバナー */}
      {needsRebalance ? (
        <div className="bg-warn/10 border border-warn/30 rounded-xl px-4 py-3 text-xs text-warn flex items-center gap-2">
          <span className="text-base">⚠️</span>
          <span>{outOfRangeCount}クラスが許容範囲を超えています。リバランスを検討してください。</span>
        </div>
      ) : (
        <div className="bg-gain/10 border border-gain/30 rounded-xl px-4 py-3 text-xs text-gain flex items-center gap-2">
          <span className="text-base">✅</span>
          <span>全クラスが許容範囲内です。現在のポートフォリオは目標配分に沿っています。</span>
        </div>
      )}

      {/* 横棒グラフ */}
      <div className="bg-surface-2 border border-border rounded-2xl p-4 space-y-4">
        <div className="flex items-center justify-between text-xs text-muted mb-1">
          <span>アセットクラス</span>
          <div className="flex gap-4">
            <span>現在</span>
            <span>目標</span>
            <span className="w-16 text-right">乖離</span>
          </div>
        </div>

        {items.map((item) => {
          const color     = ASSET_CLASS_COLORS[item.assetClass];
          const isOver    = item.deviation > 0;
          const label     = ASSET_CLASS_LABELS[item.assetClass];
          const outRange  = item.isOutOfRange;

          // バー幅は最大100%スケール（目標+10%くらいで正規化）
          const maxRatio = Math.max(item.targetRatio * 1.5, 0.1);
          const currentBarW = Math.min((item.currentRatio / maxRatio) * 100, 100);
          const targetBarW  = Math.min((item.targetRatio  / maxRatio) * 100, 100);
          const minBarW     = Math.min((item.minRatio     / maxRatio) * 100, 100);
          const maxBarW     = Math.min((item.maxRatio     / maxRatio) * 100, 100);

          return (
            <div key={item.assetClass} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${!outRange ? 'opacity-40' : ''}`}
                    style={{ backgroundColor: outRange ? color : '#64748b' }}
                  />
                  <span className={`text-sm ${outRange ? 'text-text' : 'text-muted'}`}>{label}</span>
                </div>
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className={outRange ? 'text-text font-semibold' : 'text-muted'}>
                    {fmtPct(item.currentRatio)}
                  </span>
                  <span className="text-muted/60">→</span>
                  <span className="text-muted">{fmtPct(item.targetRatio)}</span>
                  <span className={`w-14 text-right font-semibold ${
                    !outRange    ? 'text-muted' :
                    isOver       ? 'text-warn' : 'text-info'
                  }`}>
                    {item.deviation >= 0 ? '+' : ''}{fmtPct(item.deviation)}
                  </span>
                </div>
              </div>

              {/* 現在バー */}
              <div className="relative h-4 bg-border rounded-full overflow-visible">
                {/* 許容範囲ゾーン */}
                <div
                  className="absolute top-0 h-full rounded-full bg-border/60"
                  style={{ left: `${minBarW}%`, width: `${maxBarW - minBarW}%` }}
                />
                {/* 目標ライン */}
                <div
                  className="absolute top-0 h-full w-0.5 bg-muted"
                  style={{ left: `${targetBarW}%` }}
                />
                {/* 現在バー */}
                <div
                  className="absolute top-0 left-0 h-full rounded-full transition-all"
                  style={{
                    width: `${currentBarW}%`,
                    backgroundColor: outRange ? color : '#475569',
                    opacity: 0.85,
                  }}
                />
              </div>

              {/* 詳細 */}
              <div className="flex justify-between text-xs text-muted/60">
                <span>
                  {fmtYen(item.currentValue)}
                  {item.requiredAmount !== 0 && (
                    <span className={`ml-1.5 ${item.requiredAmount > 0 ? 'text-info' : 'text-warn'}`}>
                      {item.requiredAmount > 0 ? '↑ 買い' : '↓ 売り'} {fmtYen(Math.abs(item.requiredAmount))}
                    </span>
                  )}
                </span>
                <span className="text-muted/60">
                  許容: {fmtPct(item.minRatio)}〜{fmtPct(item.maxRatio)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 凡例 */}
      <div className="flex flex-wrap gap-4 text-xs text-muted px-1">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-1 bg-muted rounded" />
          <span>目標ライン</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-border/60 rounded" />
          <span>許容範囲</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-gold rounded" />
          <span>現在値（範囲外で着色）</span>
        </div>
      </div>

      {/* 総資産情報 */}
      <div className="text-xs text-muted text-right">
        総資産ベース：{fmtYen(totalValue)}
      </div>
    </div>
  );
}
