import { useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import type { Asset } from '../../../types';
import { calcCompanyData } from '../portfolioUtils';
import { CommentCard } from '../CommentCard';

function riskBadge(ratio: number): { icon: string; color: string; label: string } | null {
  if (ratio > 0.10) return { icon: '🔴', color: 'text-loss', label: '集中リスク高' };
  if (ratio > 0.05) return { icon: '⚠️', color: 'text-warn', label: '要注意' };
  return null;
}

interface Props { assets: Asset[] }

export function CompanyView({ assets }: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const total   = assets.reduce((s, a) => s + a.currentValue, 0);
  const entries = calcCompanyData(assets, total);

  const hasData = entries.length > 0;
  const top5     = entries.slice(0, 5);
  const top5Ratio = top5.reduce((s, e) => s + e.ratio, 0);
  const topEntry  = entries[0];

  const chartData = entries.slice(0, 20).map((e) => ({
    name: e.company.length > 12 ? `${e.company.slice(0, 11)}…` : e.company,
    fullName: e.company,
    value: Math.round(e.ratio * 1000) / 10,
    color: e.color,
  }));

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="bg-violet-900/40 border border-violet-700 text-violet-300 text-xs px-2 py-1 rounded-full">
          🤖 AI推定値を含む
        </span>
        <span className="text-muted text-xs">直接保有 + ファンド経由を合算</span>
      </div>

      {hasData ? (
        <>
          {/* 横棒グラフ */}
          <div className="bg-surface-2/50 rounded-xl p-3">
            <div className="text-muted text-xs mb-3">上位20社（ポートフォリオ比率 %）</div>
            <div className="overflow-x-auto">
              <ResponsiveContainer width="100%" height={chartData.length * 34 + 20}>
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ left: 0, right: 52, top: 0, bottom: 0 }}
                >
                  <XAxis type="number" domain={[0, Math.max(chartData[0]?.value ?? 10, 10)]}
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={100}
                    tick={{ fill: '#f1f5f9', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    content={(props: any) => {
                      if (!props.active || !props.payload?.[0]) return null;
                      const fullName = props.payload[0].payload?.fullName ?? '';
                      const entry = entries.find((e) => e.company === fullName);
                      return (
                        <div style={{ background: '#1e293b', border: '1px solid #475569', borderRadius: '12px', padding: '12px', fontSize: '12px' }}>
                          <div style={{ color: '#f1f5f9', fontWeight: 600, marginBottom: 4 }}>{fullName}</div>
                          <div style={{ color: '#cbd5e1' }}>合計: ¥{entry?.totalValue.toLocaleString()}</div>
                          {entry && entry.directValue > 0 && <div style={{ color: '#93c5fd' }}>直接: ¥{entry.directValue.toLocaleString()}</div>}
                          {entry && entry.indirectValue > 0 && <div style={{ color: '#c4b5fd' }}>経由: ¥{entry.indirectValue.toLocaleString()}</div>}
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={18}>
                    <LabelList
                      dataKey="value"
                      position="right"
                      formatter={(v: unknown) => `${Number(v).toFixed(1)}%`}
                      style={{ fill: '#94a3b8', fontSize: 10 }}
                    />
                    {chartData.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* コメント */}
          <div className="space-y-2">
            {topEntry && topEntry.ratio > 0.10 && (
              <CommentCard type="danger"
                title={`${topEntry.company}への集中リスク`}
                body={`単一企業比率が ${(topEntry.ratio * 100).toFixed(1)}%。10%超は集中リスクが非常に高い状態です。特定銘柄の業績悪化がポートフォリオ全体に直撃します。`}
              />
            )}
            {topEntry && topEntry.ratio > 0.05 && topEntry.ratio <= 0.10 && (
              <CommentCard type="warn"
                title={`${topEntry.company}の比率が高めです`}
                body={`${(topEntry.ratio * 100).toFixed(1)}%。5%超は集中度合いの観点から注意が必要です。`}
              />
            )}
            {top5Ratio > 0.50 && (
              <CommentCard type="warn"
                title="上位5社への集中度が高い"
                body={`上位5社合計が ${(top5Ratio * 100).toFixed(1)}%。これら企業の同時下落時のリスクが大きい状態です。`}
              />
            )}
            {entries.length >= 10 && topEntry && topEntry.ratio <= 0.05 && (
              <CommentCard type="good"
                title="企業分散が適切です"
                body={`最大比率 ${(topEntry.ratio * 100).toFixed(1)}%（${topEntry.company}）。単一企業への集中が抑えられており、分散投資の観点から良好な状態です。`}
              />
            )}
          </div>

          {/* 詳細リスト */}
          <div ref={listRef} className="space-y-2">
            <h3 className="text-muted text-xs font-medium uppercase tracking-wide">企業別内訳（上位20社）</h3>
            {entries.map((e, i) => {
              const risk = riskBadge(e.ratio);
              return (
                <div key={i} className="bg-surface-2 border border-border rounded-xl px-4 py-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: e.color }} />
                        <span className="text-text text-sm font-medium">{e.company}</span>
                        {e.ticker && <span className="text-muted text-xs font-mono">{e.ticker}</span>}
                        {risk && <span className={`text-xs ${risk.color}`}>{risk.icon} {risk.label}</span>}
                      </div>
                      {/* 直接/経由の内訳 */}
                      <div className="flex gap-3 mt-1">
                        {e.directValue > 0 && (
                          <span className="text-xs text-info">直接 ¥{e.directValue.toLocaleString()}</span>
                        )}
                        {e.indirectValue > 0 && (
                          <span className="text-xs text-gold">経由 ¥{e.indirectValue.toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-text font-mono text-sm">¥{e.totalValue.toLocaleString()}</div>
                      <div className="text-muted text-xs">{(e.ratio * 100).toFixed(2)}%</div>
                    </div>
                  </div>
                  <div className="h-1 bg-border rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(e.ratio * 100 / (entries[0]?.ratio * 100) * 100, 100)}%`, backgroundColor: e.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="text-center py-12 space-y-3">
          <div className="text-4xl">🏢</div>
          <div className="text-text font-medium">企業別データがありません</div>
          <div className="text-muted text-sm max-w-xs mx-auto">
            個別株を追加するか、投資信託・ETFにAI分析を実行すると組み入れ企業を表示できます。
          </div>
        </div>
      )}
    </div>
  );
}
