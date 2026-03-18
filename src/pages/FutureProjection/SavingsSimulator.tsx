import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell,
} from 'recharts';
import { calcSavingsBreakdown, buildProjectionData, SCENARIOS } from './projectionUtils';

interface Props {
  currentAsset: number;
  effectiveCostRate: number;
  initialMonthly: number;
  initialYears: number;
}

function fmt(n: number): string {
  if (n >= 1e8) return `${(n / 1e8).toFixed(2)}億円`;
  return `¥${Math.round(n / 10000)}万円`;
}

export function SavingsSimulator({ currentAsset, effectiveCostRate, initialMonthly, initialYears }: Props) {
  const [monthlyContrib, setMonthlyContrib] = useState(initialMonthly);
  const [years, setYears]                   = useState(initialYears);
  const [grossRate, setGrossRate]           = useState(0.05); // 5%

  const netRate = Math.max(grossRate - effectiveCostRate, 0);

  const breakdown = useMemo(
    () => calcSavingsBreakdown(currentAsset, netRate, years, monthlyContrib),
    [currentAsset, netRate, years, monthlyContrib]
  );

  // 積み上げグラフ用データ（内訳別・5年刻み）
  const chartYears = [5, 10, 15, 20, 25, 30].filter((y) => y <= years + 5);
  const chartData = chartYears.map((y) => {
    const bd = calcSavingsBreakdown(currentAsset, netRate, y, monthlyContrib);
    return {
      label: `${y}年後`,
      元本: currentAsset,
      現資産運用益: Math.round(bd.initialGrowth),
      積立元本: Math.round(bd.contribTotal),
      積立運用益: Math.max(0, Math.round(bd.contribGrowth)),
    };
  });

  const STACK_COLORS = ['#334155', '#6366f1', '#0ea5e9', '#10b981'];
  const STACK_KEYS   = ['元本', '現資産運用益', '積立元本', '積立運用益'];

  // 3シナリオとの比較データ
  const scenarioData = useMemo(
    () => buildProjectionData(currentAsset, effectiveCostRate, {
      pessimistic: 0.02, neutral: grossRate, optimistic: 0.08,
    }, monthlyContrib),
    [currentAsset, effectiveCostRate, grossRate, monthlyContrib]
  );
  const target10y = scenarioData.find((d) => d.year === 10);

  return (
    <div className="space-y-5">
      {/* ─── 入力パネル ─── */}
      <div className="bg-surface-2 border border-border rounded-2xl p-4 space-y-4">
        <h3 className="text-text text-sm font-semibold">シミュレーション条件</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted mb-1 block">毎月の積立額</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">¥</span>
              <input
                type="number"
                step="5000"
                min="0"
                value={monthlyContrib}
                onChange={(e) => setMonthlyContrib(Number(e.target.value))}
                className="w-full bg-bg border border-border rounded-xl pl-7 pr-3 py-2.5 text-text text-sm font-mono focus:outline-none focus:border-gold/50"
              />
            </div>
            <div className="text-xs text-muted/60 mt-1">¥{monthlyContrib.toLocaleString()}/月</div>
          </div>

          <div>
            <label className="text-xs text-muted mb-1 block">運用年数</label>
            <div className="relative">
              <input
                type="number"
                step="1"
                min="1"
                max="50"
                value={years}
                onChange={(e) => setYears(Number(e.target.value))}
                className="w-full bg-surface border border-border rounded-xl px-3 pr-10 py-2.5 text-text text-sm font-mono focus:outline-none focus:border-gold/50"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-xs">年</span>
            </div>
          </div>

          <div className="col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-muted">想定リターン率</label>
              <span className="text-gold font-mono text-sm font-semibold">{(grossRate * 100).toFixed(1)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="15"
              step="0.5"
              value={grossRate * 100}
              onChange={(e) => setGrossRate(Number(e.target.value) / 100)}
              className="w-full accent-gold"
            />
            <div className="flex justify-between text-xs text-muted/60 mt-0.5">
              <span>0%</span><span>5%</span><span>10%</span><span>15%</span>
            </div>
            <div className="text-xs text-muted mt-1">
              実質リターン（コスト控除後）: <span className="text-text font-mono">{(netRate * 100).toFixed(2)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 結果サマリー ─── */}
      <div className="bg-gradient-to-br from-gold/10/40 to-surface border border-gold/30 rounded-2xl p-5">
        <div className="text-muted text-xs mb-3">{years}年後の資産内訳</div>
        <div className="text-text font-bold text-2xl mb-4">{fmt(breakdown.total)}</div>

        <div className="space-y-2">
          <BreakdownRow
            label="元本（現在の資産）"
            value={currentAsset}
            total={breakdown.total}
            color="bg-border"
          />
          <BreakdownRow
            label="現資産の運用益"
            value={breakdown.initialGrowth}
            total={breakdown.total}
            color="bg-gold"
          />
          <BreakdownRow
            label="積立元本"
            value={breakdown.contribTotal}
            total={breakdown.total}
            color="bg-info"
          />
          <BreakdownRow
            label="積立分の運用益（複利効果）"
            value={Math.max(breakdown.contribGrowth, 0)}
            total={breakdown.total}
            color="bg-gain"
          />
        </div>

        <div className="mt-4 pt-4 border-t border-gold/30 grid grid-cols-2 gap-3 text-xs">
          <div>
            <div className="text-muted">積立総額</div>
            <div className="text-text font-mono font-semibold">{fmt(breakdown.contribTotal)}</div>
          </div>
          <div>
            <div className="text-muted">複利効果（運用益計）</div>
            <div className="text-gain font-mono font-semibold">
              +{fmt(breakdown.initialGrowth + Math.max(breakdown.contribGrowth, 0))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── 積み上げグラフ ─── */}
      {chartData.length > 0 && (
        <div className="bg-surface-2 border border-border rounded-2xl p-4">
          <h3 className="text-text text-sm font-semibold mb-3">資産成長の内訳推移</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} margin={{ left: 0, right: 10, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`}
                tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} width={55}
              />
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <Tooltip content={(p: any) => {
                if (!p.active || !p.payload?.length) return null;
                const total = (p.payload as Array<{ value: number }>).reduce((s, pl) => s + pl.value, 0);
                return (
                  <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: '12px 16px' }}>
                    <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 6 }}>{p.label}</div>
                    {(p.payload as Array<{ dataKey: string; value: number; fill: string }>).map((pl) => (
                      <div key={pl.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 2 }}>
                        <span style={{ color: pl.fill, fontSize: 11 }}>{pl.dataKey}</span>
                        <span style={{ color: '#f1f5f9', fontFamily: 'monospace', fontSize: 11 }}>
                          ¥{pl.value.toLocaleString()}
                        </span>
                      </div>
                    ))}
                    <div style={{ borderTop: '1px solid #334155', marginTop: 6, paddingTop: 6, color: '#f1f5f9', fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}>
                      合計: {fmt(total)}
                    </div>
                  </div>
                );
              }} />
              {STACK_KEYS.map((key, i) => (
                <Bar key={key} dataKey={key} stackId="a" fill={STACK_COLORS[i]} radius={i === STACK_KEYS.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}>
                  {chartData.map((_, ci) => <Cell key={ci} fill={STACK_COLORS[i]} />)}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
          {/* 凡例 */}
          <div className="flex flex-wrap gap-3 mt-3">
            {STACK_KEYS.map((key, i) => (
              <span key={key} className="flex items-center gap-1.5 text-xs text-muted">
                <span className="w-3 h-2 rounded-sm inline-block" style={{ backgroundColor: STACK_COLORS[i] }} />
                {key}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ─── 10年後・3シナリオ比較 ─── */}
      {target10y && (
        <div className="bg-surface-2 border border-border rounded-2xl p-4">
          <h3 className="text-text text-sm font-semibold mb-3">10年後の3シナリオ比較（リターン感度）</h3>
          <div className="grid grid-cols-3 gap-2">
            {SCENARIOS.map((s) => (
              <div key={s.key} className="bg-surface-2/70 rounded-xl p-3">
                <div className="text-xs mb-1" style={{ color: s.color }}>{s.label}</div>
                <div className="text-text font-mono font-bold text-sm">{fmt(target10y[s.key])}</div>
                <div className="text-muted text-xs">{(s.defaultRate * 100).toFixed(0)}%</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BreakdownRow({
  label, value, total, color,
}: { label: string; value: number; total: number; color: string }) {
  const ratio = total > 0 ? value / total : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted">{label}</span>
        <span className="text-text font-mono">{fmt(value)}</span>
      </div>
      <div className="h-1.5 bg-border rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  );
}
