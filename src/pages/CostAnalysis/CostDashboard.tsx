import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell,
} from 'recharts';
import type { CostSummary, NisaRemain } from './costUtils';
import { LOW_COST_THRESHOLD, HIGH_COST_THRESHOLD, ALERT_COST_RATE } from './costUtils';

function fmt(n: number) { return n.toLocaleString('ja-JP', { maximumFractionDigits: 0 }); }

interface Props {
  summary: CostSummary;
  nisaRemains: NisaRemain[];
}

// コストメーター用バーチャートデータ
function buildMeterData(effectiveCostRate: number) {
  return [
    { label: 'ポートフォリオ', value: effectiveCostRate * 100, color: effectiveCostRate > HIGH_COST_THRESHOLD ? '#ef4444' : effectiveCostRate > ALERT_COST_RATE ? '#f59e0b' : '#10b981' },
    { label: '低コスト目安',   value: LOW_COST_THRESHOLD  * 100, color: '#6366f1' },
    { label: '高コスト目安',   value: HIGH_COST_THRESHOLD * 100, color: '#94a3b8' },
  ];
}

export function CostDashboard({ summary, nisaRemains }: Props) {
  const { annualCostYen, effectiveCostRate, tenYearLoss, highCostAssets, alertRate } = summary;
  const meterData = buildMeterData(effectiveCostRate);

  const rateColor = effectiveCostRate > HIGH_COST_THRESHOLD ? 'text-loss'
    : effectiveCostRate > ALERT_COST_RATE ? 'text-warn' : 'text-gain';

  return (
    <div className="space-y-4">
      {/* ─── アラートバナー ─── */}
      <div className="space-y-2">
        {highCostAssets.map((r) => (
          <div key={r.asset.id} className="flex items-start gap-2 bg-loss/10 border border-red-800 rounded-xl px-4 py-3">
            <span className="text-base">🔴</span>
            <div className="text-xs text-loss leading-relaxed">
              <span className="font-semibold">{r.asset.name}</span> の信託報酬が
              <span className="font-mono mx-1">{(r.costRate * 100).toFixed(3)}%</span>
              と割高です。低コスト代替商品への乗り換えを検討してください。
            </div>
          </div>
        ))}
        {alertRate && highCostAssets.length === 0 && (
          <div className="flex items-start gap-2 bg-warn/10 border border-warn/30 rounded-xl px-4 py-3">
            <span>⚠️</span>
            <div className="text-xs text-warn">
              実効コスト率が <span className="font-mono">{(effectiveCostRate * 100).toFixed(3)}%</span> と高めです。
              低コスト商品への見直しで運用効率が改善します。
            </div>
          </div>
        )}
        {nisaRemains.filter((n) => n.remaining > 0).map((n) => (
          <div key={n.key} className="flex items-start gap-2 bg-gold/10 border border-indigo-800 rounded-xl px-4 py-3">
            <span>🌱</span>
            <div className="text-xs text-gold">
              {n.label} の年間非課税枠があと
              <span className="font-mono font-semibold mx-1">¥{fmt(n.remaining)}</span>
              残っています。投資効率向上のため積極的に活用しましょう。
            </div>
          </div>
        ))}
      </div>

      {/* ─── メトリクスカード ─── */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          label="年間保有コスト"
          value={`¥${fmt(annualCostYen)}`}
          sub="信託報酬の合計"
          color="text-text"
        />
        <MetricCard
          label="実効コスト率"
          value={`${(effectiveCostRate * 100).toFixed(3)}%`}
          sub="加重平均信託報酬"
          color={rateColor}
        />
        <MetricCard
          label="10年累積コスト損失"
          value={`¥${fmt(tenYearLoss)}`}
          sub="想定リターン5%・複利考慮"
          color="text-warn"
        />
        <MetricCard
          label="高コスト銘柄数"
          value={`${highCostAssets.length}銘柄`}
          sub="0.5%超の銘柄"
          color={highCostAssets.length > 0 ? 'text-loss' : 'text-gain'}
        />
      </div>

      {/* ─── 業界平均比較バー ─── */}
      <div className="bg-surface-2 border border-border rounded-2xl p-4">
        <h3 className="text-text text-sm font-semibold mb-3">信託報酬率の比較</h3>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart
            data={meterData}
            layout="vertical"
            margin={{ left: 0, right: 60, top: 0, bottom: 0 }}
          >
            <XAxis
              type="number"
              domain={[0, 0.7]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              axisLine={false} tickLine={false}
            />
            <YAxis
              type="category" dataKey="label" width={90}
              tick={{ fill: '#e2e8f0', fontSize: 11 }}
              axisLine={false} tickLine={false}
            />
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Tooltip content={(p: any) => {
              if (!p.active || !p.payload?.[0]) return null;
              return (
                <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#f1f5f9' }}>
                  {p.payload[0].payload?.label}: {Number(p.payload[0].value).toFixed(3)}%
                </div>
              );
            }} />
            <ReferenceLine x={LOW_COST_THRESHOLD * 100} stroke="#6366f1" strokeDasharray="3 3" />
            <ReferenceLine x={HIGH_COST_THRESHOLD * 100} stroke="#94a3b8" strokeDasharray="3 3" />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={22}>
              {meterData.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-2 text-xs text-muted">
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-0.5 bg-gold" />低コスト目安 0.1%</span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-0.5 bg-muted" />高コスト目安 0.5%</span>
        </div>
      </div>

      {/* ─── NISA枠サマリー ─── */}
      {nisaRemains.length > 0 && (
        <div className="bg-surface-2 border border-border rounded-2xl p-4 space-y-3">
          <h3 className="text-text text-sm font-semibold">NISA年間枠の利用状況</h3>
          {nisaRemains.map((n) => {
            const usedRatio = Math.min(n.currentBalance / n.annual, 1);
            return (
              <div key={n.key}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-text">{n.label}</span>
                  <span className="text-muted font-mono">
                    ¥{fmt(n.currentBalance)} / ¥{fmt(n.annual)}
                  </span>
                </div>
                <div className="h-2 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-400"
                    style={{ width: `${usedRatio * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs mt-0.5">
                  <span className="text-muted/60">{(usedRatio * 100).toFixed(0)}% 利用済み</span>
                  {n.remaining > 0 && (
                    <span className="text-gain">残 ¥{fmt(n.remaining)}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, sub, color }: {
  label: string; value: string; sub: string; color: string;
}) {
  return (
    <div className="bg-surface-2 border border-border rounded-xl p-4">
      <div className="text-muted text-xs mb-1">{label}</div>
      <div className={`font-bold text-lg leading-tight ${color}`}>{value}</div>
      <div className="text-muted text-xs mt-0.5">{sub}</div>
    </div>
  );
}
