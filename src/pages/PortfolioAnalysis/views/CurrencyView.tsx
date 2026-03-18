import { useRef } from 'react';
import type { Asset } from '../../../types';
import { calcCurrencyData } from '../portfolioUtils';
import { SharedDonutChart } from '../SharedDonutChart';
import { CommentCard } from '../CommentCard';

const CURRENCY_LABELS: Record<string, string> = {
  JPY: '日本円',
  USD: '米ドル',
  EUR: 'ユーロ',
  GBP: '英ポンド',
  AUD: '豪ドル',
  CAD: 'カナダドル',
  CHF: 'スイスフラン',
  BTC: 'ビットコイン',
  ETH: 'イーサリアム',
};

const CURRENCY_FLAGS: Record<string, string> = {
  JPY: '🇯🇵', USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧',
  AUD: '🇦🇺', CAD: '🇨🇦', CHF: '🇨🇭', BTC: '₿', ETH: 'Ξ',
};

interface Props { assets: Asset[] }

export function CurrencyView({ assets }: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const entries = calcCurrencyData(assets);

  const chartData = entries.map((e) => ({
    name: `${CURRENCY_FLAGS[e.currency] ?? '💱'} ${CURRENCY_LABELS[e.currency] ?? e.currency}`,
    value: e.value,
    color: e.color,
  }));

  const jpyEntry    = entries.find((e) => e.currency === 'JPY');
  const usdEntry    = entries.find((e) => e.currency === 'USD');
  const jpyRatio    = jpyEntry?.ratio ?? 0;
  const usdRatio    = usdEntry?.ratio ?? 0;
  const foreignRatio = 1 - jpyRatio;

  return (
    <div className="space-y-5">
      <SharedDonutChart
        data={chartData}
        onSliceClick={() => listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        centerLabel={`${entries.length}通貨`}
        centerSub="保有通貨"
      />

      {/* 為替リスク概要バー */}
      <div className="bg-surface-2 border border-border rounded-xl p-4">
        <div className="text-muted text-xs mb-3">為替リスク概要</div>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-20 text-text text-xs">円建て</div>
            <div className="flex-1 h-3 bg-border rounded-full overflow-hidden">
              <div className="h-full bg-gold rounded-full progress-bar" style={{ width: `${jpyRatio * 100}%` }} />
            </div>
            <div className="w-12 text-right text-text text-xs font-mono">{(jpyRatio * 100).toFixed(0)}%</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-20 text-text text-xs">外貨建て</div>
            <div className="flex-1 h-3 bg-border rounded-full overflow-hidden">
              <div className="h-full bg-orange-500 rounded-full" style={{ width: `${foreignRatio * 100}%` }} />
            </div>
            <div className="w-12 text-right text-text text-xs font-mono">{(foreignRatio * 100).toFixed(0)}%</div>
          </div>
        </div>
        <div className="mt-3 text-muted text-xs">
          ※ 外貨建て資産の円換算額は為替レートにより変動します
        </div>
      </div>

      {/* コメント */}
      <div className="space-y-2">
        {foreignRatio > 0.80 && (
          <CommentCard type="warn"
            title="外貨建て比率が非常に高い状態です"
            body={`外貨建て資産が ${(foreignRatio * 100).toFixed(1)}%。円高局面で資産評価額が大幅に目減りするリスクがあります。円建て資産との バランスを検討してください。`}
          />
        )}
        {usdRatio > 0.60 && (
          <CommentCard type="info"
            title="米ドル依存度が高めです"
            body={`USD比率が ${(usdRatio * 100).toFixed(1)}%。ドル円の為替変動が資産全体に大きく影響します。ユーロや円への分散も検討してください。`}
          />
        )}
        {jpyRatio > 0.80 && (
          <CommentCard type="info"
            title="円建て資産が大半を占めています"
            body={`円建て比率 ${(jpyRatio * 100).toFixed(1)}%。日本の物価上昇（インフレ）リスクに対して脆弱な状態です。海外資産での分散を検討しましょう。`}
          />
        )}
        {foreignRatio >= 0.20 && foreignRatio <= 0.60 && (
          <CommentCard type="good"
            title="通貨分散のバランスが取れています"
            body="円建て・外貨建てのバランスが適切な範囲です。為替リスクをコントロールしながら海外成長に参加できています。"
          />
        )}
      </div>

      {/* 通貨別リスト */}
      <div ref={listRef} className="space-y-2">
        <h3 className="text-muted text-xs font-medium uppercase tracking-wide">通貨別内訳</h3>
        {entries.map((e) => (
          <div key={e.currency} className="flex items-center gap-3 bg-surface-2 border border-border rounded-xl px-4 py-3">
            <span className="text-2xl">{CURRENCY_FLAGS[e.currency] ?? '💱'}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-text text-sm font-medium">
                  {CURRENCY_LABELS[e.currency] ?? e.currency}
                </span>
                <span className="text-muted text-xs font-mono">{e.currency}</span>
              </div>
              <div className="h-1.5 bg-border rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${e.ratio * 100}%`, backgroundColor: e.color }} />
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-text font-mono text-sm">¥{e.value.toLocaleString()}</div>
              <div className="text-muted text-xs">{(e.ratio * 100).toFixed(1)}%</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
