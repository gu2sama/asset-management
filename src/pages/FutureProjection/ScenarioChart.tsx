import { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine, Legend,
} from 'recharts';
import { SCENARIOS, buildProjectionData, type ProjectionPoint } from './projectionUtils';

interface Props {
  currentAsset: number;
  effectiveCostRate: number;
  monthlyContrib: number;
  targetAmount?: number;
  rates: Record<string, number>;
  onRateChange: (key: string, rate: number) => void;
}

function fmtMan(v: number) {
  return `${(v / 10000).toFixed(0)}万`;
}
function fmtYen(v: number) {
  if (v >= 1e8) return `${(v / 1e8).toFixed(1)}億円`;
  return `¥${Math.round(v / 10000)}万円`;
}

export function ScenarioChart({
  currentAsset, effectiveCostRate, monthlyContrib, targetAmount, rates, onRateChange,
}: Props) {
  const [hoveredScenario, setHoveredScenario] = useState<string | null>(null);
  const data = buildProjectionData(currentAsset, effectiveCostRate, rates, monthlyContrib);

  const yMax = Math.max(...data.map((d) => d.optimistic));
  const yDomain: [number, number] = [0, Math.ceil(yMax / 10000 / 500) * 500 * 10000];

  return (
    <div className="space-y-4">
      {/* シナリオレート調整 */}
      <div className="grid grid-cols-3 gap-2">
        {SCENARIOS.map((s) => {
          const netRate = (rates[s.key] ?? s.defaultRate) - effectiveCostRate;
          return (
            <div
              key={s.key}
              className={`bg-surface-2 border rounded-xl p-3 transition-colors ${
                hoveredScenario === s.key ? 'border-current' : 'border-border'
              }`}
              style={{ borderColor: hoveredScenario === s.key ? s.color : undefined }}
            >
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-3 h-0.5 rounded" style={{ backgroundColor: s.color }} />
                <span className="text-xs text-muted">{s.label}</span>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="30"
                  value={((rates[s.key] ?? s.defaultRate) * 100).toFixed(1)}
                  onChange={(e) => onRateChange(s.key, Number(e.target.value) / 100)}
                  className="w-full bg-surface border border-border rounded-lg px-2 py-1 text-text text-sm font-mono focus:outline-none focus:border-gold/50"
                />
                <span className="text-muted text-xs flex-shrink-0">%</span>
              </div>
              <div className="text-xs mt-1" style={{ color: s.color }}>
                実質 {(netRate * 100).toFixed(2)}%
              </div>
            </div>
          );
        })}
      </div>
      <div className="text-xs text-muted">
        実質リターン = 想定リターン − 実効コスト率（{(effectiveCostRate * 100).toFixed(3)}%）
      </div>

      {/* 折れ線グラフ */}
      <div className="bg-surface-2/50 rounded-2xl p-2">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ left: 10, right: 10, top: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="label"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={false} tickLine={false}
            />
            <YAxis
              tickFormatter={fmtMan}
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              axisLine={false} tickLine={false}
              width={55}
              domain={yDomain}
            />
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              content={(p: any) => {
                if (!p.active || !p.payload?.length) return null;
                const label = p.label as string;
                return (
                  <div style={{
                    background: '#1e293b', border: '1px solid #334155',
                    borderRadius: 12, padding: '12px 16px', minWidth: 180,
                  }}>
                    <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 8 }}>{label}</div>
                    {SCENARIOS.slice().reverse().map((s) => {
                      const d = p.payload.find((pl: { dataKey: string }) => pl.dataKey === s.key);
                      return d ? (
                        <div key={s.key} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 4 }}>
                          <span style={{ color: s.color, fontSize: 12 }}>{s.label}</span>
                          <span style={{ color: '#f1f5f9', fontFamily: 'monospace', fontSize: 12 }}>
                            {fmtYen(d.value as number)}
                          </span>
                        </div>
                      ) : null;
                    })}
                  </div>
                );
              }}
            />
            <Legend
              formatter={(value: string) => {
                const s = SCENARIOS.find((sc) => sc.key === value);
                return <span style={{ color: s?.color, fontSize: 12 }}>{s?.label ?? value}</span>;
              }}
            />
            {targetAmount && targetAmount > 0 && (
              <ReferenceLine
                y={targetAmount}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                label={{ value: `目標 ${fmtYen(targetAmount)}`, fill: '#f59e0b', fontSize: 11, position: 'right' }}
              />
            )}
            {SCENARIOS.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                stroke={s.color}
                strokeWidth={hoveredScenario === s.key ? 3 : 2}
                dot={{ r: 3, fill: s.color }}
                activeDot={{ r: 6 }}
                onMouseEnter={() => setHoveredScenario(s.key)}
                onMouseLeave={() => setHoveredScenario(null)}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 数値テーブル */}
      <div className="overflow-x-auto -mx-4 px-4">
        <table className="w-full text-xs min-w-[480px]">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-muted pb-2 pr-3 font-normal">時期</th>
              {SCENARIOS.map((s) => (
                <th key={s.key} className="text-right pb-2 px-2 font-normal" style={{ color: s.color }}>
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row: ProjectionPoint) => (
              <tr key={row.year} className="border-b border-border hover:bg-surface-2/30">
                <td className="py-2 pr-3 text-muted">{row.label}</td>
                {SCENARIOS.map((s) => {
                  const val = row[s.key];
                  const reachTarget = targetAmount && val >= targetAmount;
                  return (
                    <td key={s.key} className="py-2 px-2 text-right font-mono">
                      <span className={reachTarget ? 'text-warn font-bold' : 'text-text'}>
                        {fmtYen(val)}
                      </span>
                      {reachTarget && <span className="ml-1">🎯</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="text-xs text-muted/60 text-right">
        🎯 = 目標金額（{targetAmount ? fmtYen(targetAmount) : '未設定'}）以上に到達
      </div>
    </div>
  );
}
