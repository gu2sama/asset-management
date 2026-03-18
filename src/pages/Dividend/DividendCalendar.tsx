import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import type { Asset } from '../../types';
import { calcMonthlyCalendar, fmtYen } from './dividendUtils';

interface Props {
  assets: Asset[];
}

const MONTH_LABELS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
const NOW_MONTH = new Date().getMonth(); // 0-indexed

export function DividendCalendar({ assets }: Props) {
  const calendar = calcMonthlyCalendar(assets);
  const maxVal = Math.max(...calendar, 1);
  const annualTotal = calendar.reduce((s, v) => s + v, 0);

  const chartData = MONTH_LABELS.map((label, i) => ({
    label,
    amount: Math.round(calendar[i]),
    isCurrent: i === NOW_MONTH,
  }));

  return (
    <div className="space-y-4">
      <div className="bg-surface-2 border border-border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-text text-sm font-semibold">月別配当受取スケジュール（予測）</h3>
          <div className="text-xs text-muted">
            年間合計：<span className="text-text font-mono">{fmtYen(annualTotal)}</span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ left: 0, right: 4, top: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="label"
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              axisLine={false} tickLine={false}
            />
            <YAxis
              tickFormatter={(v: number) => v > 0 ? `${Math.round(v / 10000)}万` : '0'}
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              axisLine={false} tickLine={false}
              width={40}
            />
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Tooltip content={(p: any) => {
              if (!p.active || !p.payload?.length) return null;
              const val = (p.payload[0]?.value as number) ?? 0;
              return (
                <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '10px 14px' }}>
                  <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 4 }}>{p.label}</div>
                  <div style={{ color: '#f1f5f9', fontFamily: 'monospace', fontSize: 13, fontWeight: 700 }}>
                    {fmtYen(val)}
                  </div>
                  {val > 0 && (
                    <div style={{ color: '#64748b', fontSize: 10, marginTop: 2 }}>
                      月配当シェア {maxVal > 0 ? ((val / annualTotal) * 100).toFixed(1) : 0}%
                    </div>
                  )}
                </div>
              );
            }} />
            <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
              {chartData.map((d, i) => (
                <Cell
                  key={i}
                  fill={d.isCurrent ? '#10b981' : d.amount > 0 ? '#6366f1' : '#1e293b'}
                  opacity={d.amount > 0 ? 1 : 0.3}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 月別テーブル */}
      <div className="bg-surface-2 border border-border rounded-2xl p-4">
        <div className="grid grid-cols-4 gap-2">
          {chartData.map((d, i) => (
            <div
              key={i}
              className={`rounded-xl p-2.5 text-center ${
                d.isCurrent ? 'bg-emerald-900/30 border border-gain/30' :
                d.amount > 0 ? 'bg-surface-2/70' : 'bg-surface/20'
              }`}
            >
              <div className={`text-xs mb-1 ${d.isCurrent ? 'text-gain' : 'text-muted'}`}>
                {d.label}
                {d.isCurrent && <span className="ml-1 text-xs">●</span>}
              </div>
              {d.amount > 0 ? (
                <div className="font-mono text-text text-xs font-semibold">
                  {d.amount >= 10000
                    ? `¥${Math.round(d.amount / 10000)}万`
                    : `¥${d.amount.toLocaleString()}`}
                </div>
              ) : (
                <div className="text-slate-700 text-xs">−</div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="text-xs text-muted">
        ※ 配当支払い月は一般的なパターンの推定値です（四半期：3/6/9/12月、半年：6/12月）
      </div>
    </div>
  );
}
