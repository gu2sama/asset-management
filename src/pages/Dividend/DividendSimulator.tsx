import { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine, Legend,
} from 'recharts';
import {
  simulateReinvestment, calcYearsToDividendLife,
  fmtYen, fmtMan,
} from './dividendUtils';
import type { DividendBreakdown } from './dividendUtils';

interface Props {
  currentAsset: number;
  monthlyContrib: number;
  breakdown: DividendBreakdown;
  initialMonthlyExpense: number;
}

export function DividendSimulator({
  currentAsset, monthlyContrib, breakdown, initialMonthlyExpense,
}: Props) {
  const [monthlyExpense, setMonthlyExpense] = useState(initialMonthlyExpense);
  const [priceReturn, setPriceReturn]       = useState(3.0); // %

  const { portfolioYield, effectiveAfterTaxRate, totalAfterTax } = breakdown;

  // 配当生活に必要な年間配当（税引後）
  const requiredAnnualDiv = monthlyExpense * 12;
  // 必要な元本
  const requiredPrincipal = portfolioYield > 0
    ? requiredAnnualDiv / (portfolioYield * effectiveAfterTaxRate)
    : Infinity;

  const currentAnnualDivAfterTax = totalAfterTax;
  const coverageRatio = requiredAnnualDiv > 0
    ? Math.min(currentAnnualDivAfterTax / requiredAnnualDiv, 1)
    : 0;

  const yearsToGoal = useMemo(() => calcYearsToDividendLife(
    currentAsset,
    monthlyContrib,
    portfolioYield,
    requiredAnnualDiv,
    effectiveAfterTaxRate,
    priceReturn / 100,
  ), [currentAsset, monthlyContrib, portfolioYield, requiredAnnualDiv, effectiveAfterTaxRate, priceReturn]);

  // 再投資シミュレーション
  const reinvestData = useMemo(() => simulateReinvestment(
    currentAsset,
    monthlyContrib,
    portfolioYield,
    priceReturn / 100,
    30,
  ), [currentAsset, monthlyContrib, portfolioYield, priceReturn]);

  // グラフは5年刻みで表示
  const chartData = reinvestData.filter((p) => p.year % 5 === 0);
  const yMax = Math.max(...reinvestData.map((p) => p.withReinvest));
  const yDomain: [number, number] = [0, Math.ceil(yMax / 10000 / 500) * 500 * 10000 || 1];

  const isGoalAchieved = yearsToGoal === 0;

  return (
    <div className="space-y-5">
      {/* 目標入力 */}
      <div className="bg-surface-2 border border-border rounded-2xl p-4 space-y-4">
        <h3 className="text-text text-sm font-semibold">配当生活シミュレーター</h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-xs text-muted mb-1 block">月間必要生活費</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">¥</span>
              <input
                type="number"
                step="10000"
                min="0"
                value={monthlyExpense}
                onChange={(e) => setMonthlyExpense(Number(e.target.value))}
                className="w-full bg-bg border border-border rounded-xl pl-7 pr-3 py-2.5 text-text text-sm font-mono focus:outline-none focus:border-gold/50"
              />
            </div>
            <div className="text-xs text-muted mt-0.5">
              年間 <span className="font-mono text-text">{fmtYen(monthlyExpense * 12)}</span> が配当で賄える状態を目指す
            </div>
          </div>

          <div className="col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-muted">価格上昇リターン（配当除く）</label>
              <span className="text-gold font-mono text-sm font-semibold">{priceReturn.toFixed(1)}%</span>
            </div>
            <input
              type="range" min="0" max="10" step="0.5"
              value={priceReturn}
              onChange={(e) => setPriceReturn(Number(e.target.value))}
              className="w-full accent-gold"
            />
            <div className="flex justify-between text-xs text-muted/60 mt-0.5">
              <span>0%</span><span>5%</span><span>10%</span>
            </div>
          </div>
        </div>
      </div>

      {/* 達成状況 */}
      <div className={`border rounded-2xl p-5 space-y-4 ${
        isGoalAchieved
          ? 'border-gain/30 bg-gain/10'
          : 'border-border bg-surface-2'
      }`}>
        {/* カバー率 */}
        <div>
          <div className="flex items-end justify-between mb-2">
            <div>
              <div className="text-muted text-xs">現在の配当でのカバー率</div>
              <div className={`font-mono font-bold text-2xl mt-0.5 ${
                coverageRatio >= 1 ? 'text-gain' :
                coverageRatio >= 0.5 ? 'text-warn' : 'text-slate-200'
              }`}>
                {(coverageRatio * 100).toFixed(1)}%
              </div>
            </div>
            <div className="text-right text-xs text-muted">
              <div>現在: <span className="text-text font-mono">{fmtYen(currentAnnualDivAfterTax)}/年</span></div>
              <div>目標: <span className="text-text font-mono">{fmtYen(requiredAnnualDiv)}/年</span></div>
            </div>
          </div>
          <div className="h-3 bg-border rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${coverageRatio * 100}%`,
                backgroundColor: coverageRatio >= 1 ? '#10b981' : coverageRatio >= 0.5 ? '#f59e0b' : '#6366f1',
              }}
            />
          </div>
        </div>

        {/* 必要元本 */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="bg-surface-2/70 rounded-xl p-3">
            <div className="text-muted text-xs mb-1">必要な投資元本</div>
            <div className="text-text font-mono font-bold">
              {isFinite(requiredPrincipal) ? fmtYen(requiredPrincipal) : '利回り設定が必要'}
            </div>
            <div className="text-muted text-xs mt-0.5">
              利回り {(portfolioYield * 100).toFixed(2)}% 前提
            </div>
          </div>
          <div className="bg-surface-2/70 rounded-xl p-3">
            <div className="text-muted text-xs mb-1">配当生活まで</div>
            {isGoalAchieved ? (
              <div className="text-gain font-semibold">✅ 達成済み！</div>
            ) : yearsToGoal !== null ? (
              <>
                <div className="text-text font-mono font-bold text-lg">約{yearsToGoal}年後</div>
                <div className="text-muted text-xs mt-0.5">積立＋配当再投資で試算</div>
              </>
            ) : (
              <div className="text-loss text-sm">60年以内に未達</div>
            )}
          </div>
        </div>

        {isGoalAchieved && (
          <div className="text-gain text-xs bg-gain/10 rounded-xl px-3 py-2">
            🎉 現在の配当収入で生活費をカバーできます！「配当生活」を実現中です。
          </div>
        )}
      </div>

      {/* 配当再投資シミュレーション */}
      <div className="bg-surface-2 border border-border rounded-2xl p-4 space-y-4">
        <div>
          <h3 className="text-text text-sm font-semibold">配当再投資の複利効果</h3>
          <p className="text-muted text-xs mt-0.5">
            毎年の配当を全額再投資した場合 vs 配当を現金で受け取った場合の資産比較
          </p>
        </div>

        {/* 20年・30年の比較 */}
        <div className="grid grid-cols-3 gap-2">
          {[10, 20, 30].map((y) => {
            const pt = reinvestData[y];
            if (!pt) return null;
            const diff = pt.withReinvest - pt.totalWithout;
            const gain = pt.totalWithout > 0 ? diff / pt.totalWithout : 0;
            return (
              <div key={y} className="bg-surface-2/70 rounded-xl p-3 text-center">
                <div className="text-muted text-xs mb-1">{y}年後</div>
                <div className="text-text font-mono font-bold text-sm">{fmtYen(pt.withReinvest)}</div>
                <div className="text-gain text-xs mt-0.5">
                  +{(gain * 100).toFixed(0)}%
                </div>
                <div className="text-muted text-xs">再投資効果</div>
              </div>
            );
          })}
        </div>

        {/* 折れ線グラフ */}
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ left: 10, right: 10, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="year"
              tickFormatter={(v: number) => `${v}年`}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={false} tickLine={false}
            />
            <YAxis
              tickFormatter={(v: number) => `${fmtMan(v)}万`}
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              axisLine={false} tickLine={false}
              width={55}
              domain={yDomain}
            />
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Tooltip content={(p: any) => {
              if (!p.active || !p.payload?.length) return null;
              const yr = p.label as number;
              const pt = reinvestData[yr];
              if (!pt) return null;
              return (
                <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: '10px 14px', minWidth: 200 }}>
                  <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 6 }}>{yr}年後</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 3 }}>
                    <span style={{ color: '#10b981', fontSize: 12 }}>再投資あり</span>
                    <span style={{ color: '#f1f5f9', fontFamily: 'monospace', fontSize: 12 }}>{fmtYen(pt.withReinvest)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 3 }}>
                    <span style={{ color: '#6366f1', fontSize: 12 }}>再投資なし（資産）</span>
                    <span style={{ color: '#f1f5f9', fontFamily: 'monospace', fontSize: 12 }}>{fmtYen(pt.withoutReinvest)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 3 }}>
                    <span style={{ color: '#94a3b8', fontSize: 12 }}>現金配当累計</span>
                    <span style={{ color: '#f1f5f9', fontFamily: 'monospace', fontSize: 12 }}>{fmtYen(pt.cashDividends)}</span>
                  </div>
                  <div style={{ borderTop: '1px solid #334155', marginTop: 6, paddingTop: 6, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <span style={{ color: '#f59e0b', fontSize: 12 }}>再投資効果（差額）</span>
                    <span style={{ color: '#f59e0b', fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}>
                      +{fmtYen(pt.withReinvest - pt.totalWithout)}
                    </span>
                  </div>
                </div>
              );
            }} />
            <Legend
              formatter={(value: string) => {
                const map: Record<string, string> = {
                  withReinvest:    '再投資あり',
                  totalWithout:    '再投資なし（資産＋現金配当）',
                  withoutReinvest: '再投資なし（資産のみ）',
                };
                const colors: Record<string, string> = {
                  withReinvest: '#10b981', totalWithout: '#6366f1', withoutReinvest: '#94a3b8',
                };
                return <span style={{ color: colors[value], fontSize: 12 }}>{map[value] ?? value}</span>;
              }}
            />
            <Line type="monotone" dataKey="withReinvest"    stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="totalWithout"    stroke="#6366f1" strokeWidth={2}   dot={{ r: 3, fill: '#6366f1' }} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="withoutReinvest" stroke="#475569" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
            {isFinite(requiredPrincipal) && requiredPrincipal > 0 && (
              <ReferenceLine
                y={requiredPrincipal}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                label={{ value: `配当生活目標 ${fmtYen(requiredPrincipal)}`, fill: '#f59e0b', fontSize: 10, position: 'right' }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>

        <div className="bg-surface-2/70 rounded-xl p-3 text-xs text-muted space-y-1">
          <div>・価格リターン {priceReturn.toFixed(1)}%、配当利回り {(portfolioYield * 100).toFixed(2)}% で計算</div>
          <div>・課税は考慮せず（総利回りでのシミュレーション）</div>
          <div>・毎月の積立 ¥{monthlyContrib.toLocaleString()} を継続する前提</div>
        </div>
      </div>
    </div>
  );
}
