import { useRef } from 'react';
import type { Asset } from '../../../types';
import { calcSectorData } from '../portfolioUtils';
import { SharedDonutChart } from '../SharedDonutChart';
import { CommentCard } from '../CommentCard';

const SECTOR_ICONS: Record<string, string> = {
  'IT': '💻', 'テクノロジー': '💻', 'Technology': '💻',
  '金融': '🏦', 'Financial': '🏦',
  'ヘルスケア': '🏥', 'Healthcare': '🏥', 'Health Care': '🏥',
  '生活必需品': '🛒', 'Consumer Staples': '🛒',
  '一般消費財': '🛍️', 'Consumer Discretionary': '🛍️',
  'エネルギー': '⛽', 'Energy': '⛽',
  '通信': '📡', 'Communication': '📡', 'Communication Services': '📡',
  '素材': '🧱', 'Materials': '🧱',
  '資本財': '🏗️', 'Industrials': '🏗️',
  '公益事業': '💡', 'Utilities': '💡',
  '不動産': '🏠', 'Real Estate': '🏠',
};

function getSectorIcon(sector: string): string {
  for (const [key, icon] of Object.entries(SECTOR_ICONS)) {
    if (sector.toLowerCase().includes(key.toLowerCase())) return icon;
  }
  return '📊';
}

interface Props { assets: Asset[] }

export function SectorView({ assets }: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const entries = calcSectorData(assets);

  const hasData = entries.length > 0;
  const analyzedAssets = assets.filter((a) => a.aiAnalysis?.estimatedSectors?.length);

  const topSector = entries[0];
  const itEntry   = entries.find((e) =>
    ['IT', 'テクノロジー', 'Technology'].some((k) => e.sector.toLowerCase().includes(k.toLowerCase()))
  );

  const chartData = entries.map((e) => ({
    name: e.sector,
    value: e.value,
    color: e.color,
  }));

  return (
    <div className="space-y-5">
      {/* AI分析バッジ */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="bg-violet-900/40 border border-violet-700 text-violet-300 text-xs px-2 py-1 rounded-full">
          🤖 AI推定値
        </span>
        <span className="text-muted text-xs">
          分析済み: {analyzedAssets.length} / {assets.length} 銘柄
        </span>
      </div>

      {hasData ? (
        <>
          <SharedDonutChart
            data={chartData}
            onSliceClick={() => listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            centerLabel={`${entries.length}セクター`}
            centerSub="AI推定"
          />

          {/* コメント */}
          <div className="space-y-2">
            {topSector && topSector.ratio > 0.40 && (
              <CommentCard type="warn"
                title={`${topSector.sector}セクターへの集中`}
                body={`${topSector.sector}が ${(topSector.ratio * 100).toFixed(1)}%。単一セクターが40%超は集中リスクが高い状態です。他セクターへの分散を検討してください。`}
              />
            )}
            {itEntry && itEntry.ratio > 0.35 && (
              <CommentCard type="info"
                title="テクノロジー比率が高めです"
                body={`IT/テクノロジーが ${(itEntry.ratio * 100).toFixed(1)}%。景気敏感セクターであり、金利上昇局面で下落しやすい特性があります。`}
              />
            )}
            {entries.length >= 5 && topSector && topSector.ratio < 0.35 && (
              <CommentCard type="good"
                title="セクター分散が取れています"
                body={`${entries.length}セクターに分散されており、特定業種への集中リスクが低い状態です。`}
              />
            )}
            {analyzedAssets.length < assets.length && (
              <CommentCard type="info"
                title="未分析の銘柄があります"
                body={`${assets.length - analyzedAssets.length} 銘柄がAI分析未実施です。レポート画面からAI分析を実行すると、より精度の高いセクター分析が可能になります。`}
              />
            )}
          </div>

          {/* 内訳リスト */}
          <div ref={listRef} className="space-y-2">
            <h3 className="text-muted text-xs font-medium uppercase tracking-wide">セクター内訳</h3>
            {entries.map((e) => (
              <div key={e.sector} className="flex items-center gap-3 bg-surface-2 border border-border rounded-xl px-4 py-3">
                <span className="text-xl">{getSectorIcon(e.sector)}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-text text-sm font-medium">{e.sector}</div>
                  <div className="mt-1 h-1.5 bg-border rounded-full overflow-hidden">
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
        </>
      ) : (
        <div className="text-center py-12 space-y-3">
          <div className="text-4xl">🤖</div>
          <div className="text-text font-medium">AI分析データがありません</div>
          <div className="text-muted text-sm max-w-xs mx-auto">
            投資信託・ETFのセクター構成はAI分析が必要です。
            レポート画面からAI組み入れ分析を実行してください。
          </div>
        </div>
      )}
    </div>
  );
}
