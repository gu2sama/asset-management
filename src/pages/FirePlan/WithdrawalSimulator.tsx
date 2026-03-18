import { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine, Legend,
} from 'recharts';
import { simulateWithdrawal, calcDepletionAge, fmtAsset } from './fireUtils';
import { projectValue } from '../FutureProjection/projectionUtils';

interface Props {
  currentAsset: number;
  currentAge: number;
  monthlyContrib: number;
  neutralNetRate: number;
  targetAge: number;
  monthlyExpense: number;
  pensionStartAge: number;
  pensionMonthly: number;
  idecoStartAge: number;
  idecoMonthly: number;
  rentalMonthly: number;
  sideIncomeMonthly: number;
}

function fmtMan(v: number): string {
  if (v <= 0) return '0';
  return `${Math.round(v / 10000).toLocaleString()}万`;
}

const PATTERN_COLORS = {
  patternA: '#f97316',
  patternB: '#6366f1',
  patternC: '#10b981',
} as const;

const PATTERN_LABELS = {
  patternA: '運用なし',
  patternB: '3%運用',
  patternC: '4%ルール',
} as const;

export function WithdrawalSimulator({
  currentAsset, currentAge, monthlyContrib, neutralNetRate,
  targetAge, monthlyExpense,
  pensionStartAge, pensionMonthly,
  idecoStartAge, idecoMonthly,
  rentalMonthly, sideIncomeMonthly,
}: Props) {
  // リタイア年齢
  const [retireAge, setRetireAge] = useState(targetAge);
  // リタイア時資産（デフォルト：中立シナリオで予測）
  const defaultRetireAsset = useMemo(() => {
    const years = Math.max(retireAge - currentAge, 0);
    return Math.round(projectValue(currentAsset, neutralNetRate, years, monthlyContrib));
  }, [currentAsset, neutralNetRate, retireAge, currentAge, monthlyContrib]);

  const [retireAsset, setRetireAsset] = useState<number | null>(null);
  const effectiveRetireAsset = retireAsset ?? defaultRetireAsset;

  const [localExpense, setLocalExpense] = useState(monthlyExpense);

  const data = useMemo(() => simulateWithdrawal(
    retireAge,
    effectiveRetireAsset,
    localExpense,
    pensionStartAge,
    pensionMonthly,
    idecoStartAge,
    idecoMonthly,
    rentalMonthly,
    sideIncomeMonthly,
  ), [
    retireAge, effectiveRetireAsset, localExpense,
    pensionStartAge, pensionMonthly,
    idecoStartAge, idecoMonthly,
    rentalMonthly, sideIncomeMonthly,
  ]);

  const depA = calcDepletionAge(data, 'patternA');
  const depB = calcDepletionAge(data, 'patternB');
  const depC = calcDepletionAge(data, 'patternC');

  const yMax = effectiveRetireAsset;
  const yDomain: [number, number] = [0, Math.ceil(yMax / 10000 / 500) * 500 * 10000 || 1];

  return (
    <div className="space-y-5">
      {/* 入力パネル */}
      <div className="bg-surface-2 border border-border rounded-2xl p-4 space-y-4">
        <h3 className="text-text text-sm font-semibold">シミュレーション条件</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted mb-1 block">リタイア年齢</label>
            <div className="relative">
              <input
                type="number"
                min={currentAge + 1}
                max={90}
                value={retireAge}
                onChange={(e) => {
                  setRetireAge(Number(e.target.value));
                  setRetireAsset(null); // リタイア年齢を変えたら資産をリセット
                }}
                className="w-full bg-surface border border-border rounded-xl px-3 pr-9 py-2.5 text-text text-sm font-mono focus:outline-none focus:border-gold/50"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-xs">歳</span>
            </div>
          </div>

          <div>
            <label className="text-xs text-muted mb-1 block">月間生活費</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">¥</span>
              <input
                type="number"
                step="10000"
                min="0"
                value={localExpense}
                onChange={(e) => setLocalExpense(Number(e.target.value))}
                className="w-full bg-bg border border-border rounded-xl pl-7 pr-3 py-2.5 text-text text-sm font-mono focus:outline-none focus:border-gold/50"
              />
            </div>
            <div className="text-xs text-muted/60 mt-0.5">¥{localExpense.toLocaleString()}/月</div>
          </div>

          <div className="col-span-2">
            <label className="text-xs text-muted mb-1 block">
              リタイア時資産
              <button
                onClick={() => setRetireAsset(null)}
                className="ml-2 text-gold hover:text-gold text-xs"
              >
                ↩ 自動計算
              </button>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">¥</span>
              <input
                type="number"
                step="1000000"
                min="0"
                value={effectiveRetireAsset}
                onChange={(e) => setRetireAsset(Number(e.target.value))}
                className="w-full bg-bg border border-border rounded-xl pl-7 pr-3 py-2.5 text-text text-sm font-mono focus:outline-none focus:border-gold/50"
              />
            </div>
            <div className="text-xs text-muted mt-0.5">
              {retireAsset === null ? `自動計算（中立シナリオ ${retireAge}歳時）：` : '手動入力：'}
              <span className="text-text font-mono ml-1">{fmtAsset(effectiveRetireAsset)}</span>
            </div>
          </div>
        </div>

        {/* 年金・iDeCo情報表示 */}
        <div className="bg-surface-2/70 rounded-xl p-3 text-xs space-y-1">
          <div className="text-muted font-medium mb-1.5">収入スケジュール（設定値）</div>
          <div className="flex justify-between">
            <span className="text-muted">年金 {fmtAsset(pensionMonthly * 12)}/年</span>
            <span className="text-text">{pensionStartAge}歳〜</span>
          </div>
          {idecoMonthly > 0 && (
            <div className="flex justify-between">
              <span className="text-muted">iDeCo {fmtAsset(idecoMonthly * 12)}/年</span>
              <span className="text-text">{idecoStartAge}歳〜</span>
            </div>
          )}
          {rentalMonthly > 0 && (
            <div className="flex justify-between">
              <span className="text-muted">家賃収入 {fmtAsset(rentalMonthly * 12)}/年</span>
              <span className="text-text">全期間</span>
            </div>
          )}
          {sideIncomeMonthly > 0 && (
            <div className="flex justify-between">
              <span className="text-muted">副業 {fmtAsset(sideIncomeMonthly * 12)}/年</span>
              <span className="text-text">全期間</span>
            </div>
          )}
        </div>
      </div>

      {/* 枯渇年齢サマリー */}
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            { key: 'patternA' as const, dep: depA, label: '運用なし' },
            { key: 'patternB' as const, dep: depB, label: '3%運用' },
            { key: 'patternC' as const, dep: depC, label: '4%ルール' },
          ] as const
        ).map(({ key, dep, label }) => (
          <div
            key={key}
            className="bg-surface-2 border border-border rounded-2xl p-3 text-center"
          >
            <div className="text-xs mb-1" style={{ color: PATTERN_COLORS[key] }}>{label}</div>
            {dep === null ? (
              <div className="text-gain font-semibold text-sm">100歳超持続</div>
            ) : (
              <div className="font-mono font-bold text-base text-text">
                {dep}歳
                <div className="text-xs text-muted font-normal">で枯渇</div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* グラフ */}
      <div className="bg-surface-2/50 rounded-2xl p-2">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ left: 10, right: 10, top: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="age"
              tickFormatter={(v: number) => `${v}歳`}
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              axisLine={false} tickLine={false}
              interval={4}
            />
            <YAxis
              tickFormatter={fmtMan}
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              axisLine={false} tickLine={false}
              width={55}
              domain={yDomain}
            />
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Tooltip content={(p: any) => {
              if (!p.active || !p.payload?.length) return null;
              return (
                <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: '10px 14px', minWidth: 160 }}>
                  <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 6 }}>{p.label}歳</div>
                  {(p.payload as Array<{ dataKey: string; value: number; stroke: string }>).map((pl) => (
                    <div key={pl.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 3 }}>
                      <span style={{ color: pl.stroke, fontSize: 11 }}>{PATTERN_LABELS[pl.dataKey as keyof typeof PATTERN_LABELS]}</span>
                      <span style={{ color: '#f1f5f9', fontFamily: 'monospace', fontSize: 11 }}>
                        {fmtAsset(pl.value as number)}
                      </span>
                    </div>
                  ))}
                </div>
              );
            }} />
            <Legend
              formatter={(value: string) => (
                <span style={{ color: PATTERN_COLORS[value as keyof typeof PATTERN_COLORS], fontSize: 12 }}>
                  {PATTERN_LABELS[value as keyof typeof PATTERN_LABELS] ?? value}
                </span>
              )}
            />
            {/* 枯渇ライン */}
            <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4"
              label={{ value: '資産ゼロ', fill: '#ef4444', fontSize: 10, position: 'insideTopLeft' }}
            />
            {/* 年金受給開始 */}
            {pensionStartAge > retireAge && (
              <ReferenceLine
                x={pensionStartAge}
                stroke="#f59e0b"
                strokeDasharray="3 3"
                label={{ value: `年金開始(${pensionStartAge}歳)`, fill: '#f59e0b', fontSize: 9, position: 'top' }}
              />
            )}
            <Line type="monotone" dataKey="patternA" stroke={PATTERN_COLORS.patternA} strokeWidth={2}
              dot={false} activeDot={{ r: 4 }} />
            <Line type="monotone" dataKey="patternB" stroke={PATTERN_COLORS.patternB} strokeWidth={2}
              dot={false} activeDot={{ r: 4 }} />
            <Line type="monotone" dataKey="patternC" stroke={PATTERN_COLORS.patternC} strokeWidth={2.5}
              dot={false} activeDot={{ r: 4 }} strokeDasharray="6 2" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 説明 */}
      <div className="bg-surface-2 border border-border rounded-2xl p-4 space-y-2 text-xs text-muted leading-relaxed">
        <div className="flex gap-2">
          <span style={{ color: PATTERN_COLORS.patternA }}>■</span>
          <span><strong className="text-text">運用なし</strong>：投資せず定額で取り崩し。年金受給後は取り崩し額が減少。</span>
        </div>
        <div className="flex gap-2">
          <span style={{ color: PATTERN_COLORS.patternB }}>■</span>
          <span><strong className="text-text">3%運用</strong>：年3%で運用しながら生活費を取り崩し。年金受給後は取り崩し額が減少。</span>
        </div>
        <div className="flex gap-2">
          <span style={{ color: PATTERN_COLORS.patternC }}>■</span>
          <span><strong className="text-text">4%ルール</strong>：毎年残高の4%を取り崩し、年5%で運用。残高がある限り持続する設計。</span>
        </div>
      </div>
    </div>
  );
}
