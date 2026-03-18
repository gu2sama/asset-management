import { useRef } from 'react';
import type { Asset } from '../../../types';
import { ASSET_CLASS_LABELS, ASSET_CLASS_COLORS } from '../../../constants/labels';
import { calcAssetClassData } from '../portfolioUtils';
import { SharedDonutChart } from '../SharedDonutChart';
import { CommentCard } from '../CommentCard';

// 推奨比率の目安（モデレートリスク想定）
const RECOMMENDED: Record<string, { min: number; max: number; label: string }> = {
  investment_trust: { min: 0.40, max: 0.80, label: '40〜80%' },
  domestic_etf:     { min: 0.05, max: 0.30, label: '5〜30%' },
  foreign_etf:      { min: 0.10, max: 0.50, label: '10〜50%' },
  domestic_stock:   { min: 0.00, max: 0.30, label: '0〜30%' },
  foreign_stock:    { min: 0.00, max: 0.30, label: '0〜30%' },
  crypto:           { min: 0.00, max: 0.05, label: '0〜5%' },
  commodity:        { min: 0.00, max: 0.10, label: '0〜10%' },
  real_estate:      { min: 0.00, max: 0.15, label: '0〜15%' },
  social_lending:   { min: 0.00, max: 0.05, label: '0〜5%' },
  cash:             { min: 0.05, max: 0.20, label: '5〜20%' },
};

interface Props { assets: Asset[] }

export function AssetClassView({ assets }: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const total = assets.reduce((s, a) => s + a.currentValue, 0);
  const entries = calcAssetClassData(assets);

  const chartData = entries.map((e) => ({
    name: ASSET_CLASS_LABELS[e.key],
    value: e.value,
    color: ASSET_CLASS_COLORS[e.key],
  }));

  const handleSliceClick = () => {
    listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // コメント生成
  const cryptoEntry = entries.find((e) => e.key === 'crypto');
  const cashEntry   = entries.find((e) => e.key === 'cash');
  const stockRatio  = entries
    .filter((e) => ['investment_trust','domestic_etf','foreign_etf','domestic_stock','foreign_stock'].includes(e.key))
    .reduce((s, e) => s + e.ratio, 0);

  return (
    <div className="space-y-5">
      <SharedDonutChart
        data={chartData}
        onSliceClick={handleSliceClick}
        centerLabel={`¥${(total / 1e4).toFixed(0)}万`}
        centerSub="総資産"
      />

      {/* コメント */}
      <div className="space-y-2">
        {cryptoEntry && cryptoEntry.ratio > 0.10 && (
          <CommentCard type="danger"
            title="暗号資産の比率が高すぎます"
            body={`現在 ${(cryptoEntry.ratio * 100).toFixed(1)}%。推奨は0〜5%。価格変動リスクが非常に高く、分散投資の観点から5%以下が望ましいです。`}
          />
        )}
        {cryptoEntry && cryptoEntry.ratio > 0.05 && cryptoEntry.ratio <= 0.10 && (
          <CommentCard type="warn"
            title="暗号資産の比率をご確認ください"
            body={`現在 ${(cryptoEntry.ratio * 100).toFixed(1)}%。推奨は0〜5%。許容リスクに応じて調整を検討してください。`}
          />
        )}
        {cashEntry && cashEntry.ratio > 0.30 && (
          <CommentCard type="warn"
            title="現預金の比率が高めです"
            body={`現在 ${(cashEntry.ratio * 100).toFixed(1)}%。生活防衛費を超える余剰現金は、インフレによる実質価値の目減りリスクがあります。`}
          />
        )}
        {stockRatio < 0.40 && (
          <CommentCard type="info"
            title="株式性資産の比率が低めです"
            body={`現在 ${(stockRatio * 100).toFixed(1)}%。長期資産形成においては、株式系資産を50%以上とすることで期待リターンが高まります。`}
          />
        )}
        {stockRatio >= 0.60 && cryptoEntry?.ratio! <= 0.05 && (
          <CommentCard type="good"
            title="バランスの取れた構成です"
            body="株式性資産が60%以上を占めており、長期の資産形成に適した構成です。引き続きコスト意識を持って維持しましょう。"
          />
        )}
      </div>

      {/* 内訳リスト */}
      <div ref={listRef} className="space-y-2">
        <h3 className="text-muted text-xs font-medium uppercase tracking-wide">内訳</h3>
        {entries.map((e) => {
          const rec = RECOMMENDED[e.key];
          const inRange = !rec || (e.ratio >= rec.min && e.ratio <= rec.max);
          const color = ASSET_CLASS_COLORS[e.key];
          return (
            <div key={e.key} className="bg-surface-2 border border-border rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-text text-sm font-medium">{ASSET_CLASS_LABELS[e.key]}</span>
                  {!inRange && (
                    <span className="text-warn text-xs">⚠ 推奨範囲外</span>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-text font-mono text-sm">¥{e.value.toLocaleString()}</div>
                  <div className="text-muted text-xs">{(e.ratio * 100).toFixed(1)}%</div>
                </div>
              </div>
              {/* プログレスバー */}
              <div className="h-1.5 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${e.ratio * 100}%`, backgroundColor: color }}
                />
              </div>
              {rec && (
                <div className="text-muted text-xs mt-1">推奨: {rec.label}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
