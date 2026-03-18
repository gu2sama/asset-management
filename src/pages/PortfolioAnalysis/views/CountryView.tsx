import { useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import type { Asset } from '../../../types';
import { calcCountryData, flagEmoji } from '../portfolioUtils';
import { SharedDonutChart } from '../SharedDonutChart';
import { CommentCard } from '../CommentCard';

interface Props { assets: Asset[] }

export function CountryView({ assets }: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const { entries, hasEstimated } = calcCountryData(assets);

  const chartData = entries.map((e) => ({
    name: `${flagEmoji(e.code)} ${e.name}`,
    value: e.value,
    color: e.color,
  }));

  const usEntry  = entries.find((e) => e.code === 'US');
  const jpEntry  = entries.find((e) => e.code === 'JP');
  const usRatio  = usEntry?.ratio ?? 0;
  const jpRatio  = jpEntry?.ratio ?? 0;
  const topRatio = entries[0]?.ratio ?? 0;

  return (
    <div className="space-y-5">
      {/* AI推定バッジ */}
      {hasEstimated && (
        <div className="flex items-center gap-2">
          <span className="bg-violet-900/40 border border-violet-700 text-violet-300 text-xs px-2 py-1 rounded-full">
            🤖 AI推定値を含む
          </span>
          <span className="text-muted text-xs">
            投資信託・ETFの組み入れ国をAIで推定して按分しています
          </span>
        </div>
      )}

      <SharedDonutChart
        data={chartData}
        onSliceClick={() => listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        centerLabel={`${entries.length}カ国`}
        centerSub="地域"
      />

      {/* 横棒グラフ（上位10） */}
      <div className="bg-surface-2/50 rounded-xl p-3">
        <div className="text-muted text-xs mb-3">上位10カ国・地域</div>
        <ResponsiveContainer width="100%" height={entries.slice(0, 10).length * 32 + 10}>
          <BarChart
            data={entries.slice(0, 10).map((e) => ({
              name: `${flagEmoji(e.code)} ${e.name}`,
              value: Math.round(e.ratio * 1000) / 10,
              color: e.color,
            }))}
            layout="vertical"
            margin={{ left: 0, right: 40, top: 0, bottom: 0 }}
          >
            <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`}
              tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" width={90}
              tick={{ fill: '#f1f5f9', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              content={(p: any) => {
                if (!p.active || !p.payload?.[0]) return null;
                return (
                  <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9', fontSize: 12, padding: '8px 12px' }}>
                    <div style={{ fontWeight: 600 }}>{p.payload[0].payload?.name}</div>
                    <div>{Number(p.payload[0].value).toFixed(1)}%</div>
                  </div>
                );
              }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16}>
              {entries.slice(0, 10).map((e, i) => (
                <Cell key={i} fill={e.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* コメント */}
      <div className="space-y-2">
        {usRatio > 0.70 && (
          <CommentCard type="warn"
            title="米国集中リスクがあります"
            body={`米国比率が ${(usRatio * 100).toFixed(1)}%。地政学・通貨リスクの観点から、60〜65%以下に抑えることが推奨されます。ヨーロッパや新興国への分散を検討しましょう。`}
          />
        )}
        {jpRatio > 0.50 && (
          <CommentCard type="info"
            title="国内資産の比率が高めです"
            body={`日本比率が ${(jpRatio * 100).toFixed(1)}%。日本経済の変動リスクに対する感度が高い状態です。海外資産による分散を検討してください。`}
          />
        )}
        {topRatio < 0.70 && entries.length >= 5 && (
          <CommentCard type="good"
            title="地理的分散が取れています"
            body={`${entries.length}カ国・地域に分散されており、特定地域への集中リスクが低い状態です。`}
          />
        )}
        {hasEstimated && (
          <CommentCard type="info"
            title="推定精度について"
            body="投資信託・ETFの国別配分はAI推定です。より正確な分析にはAI組み入れ分析の実行をお勧めします。"
          />
        )}
      </div>

      {/* 内訳リスト */}
      <div ref={listRef} className="space-y-2">
        <h3 className="text-muted text-xs font-medium uppercase tracking-wide">全カ国内訳</h3>
        {entries.map((e) => (
          <div key={e.code} className="flex items-center gap-3 bg-surface-2 border border-border rounded-xl px-4 py-3">
            <span className="text-2xl">{flagEmoji(e.code)}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-text text-sm font-medium">{e.name}</span>
                {e.isEstimated && (
                  <span className="text-gold text-xs">推定</span>
                )}
              </div>
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
    </div>
  );
}
